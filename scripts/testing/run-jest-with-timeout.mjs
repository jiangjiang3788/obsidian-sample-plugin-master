#!/usr/bin/env node
// Jest 负责测试发现与执行；本层只监督卡住的进程、恢复未完成文件并汇总真实结果。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const selftest = process.env.THINK_TEST_INTERNAL_SELFTEST === '1';
const root = selftest ? path.resolve(process.env.THINK_TEST_INTERNAL_ROOT) : projectRoot;
const jest = selftest ? process.env.THINK_TEST_INTERNAL_JEST : path.join(root, 'node_modules/jest/bin/jest.js');
const config = selftest ? process.env.THINK_TEST_INTERNAL_CONFIG : path.join(root, 'test/configs/jest.core.config.js');
const reporter = path.join(root, 'test/configs/jest-reporter.zh-CN.cjs');
const reportDir = selftest ? path.resolve(process.env.THINK_TEST_INTERNAL_REPORT_DIR) : path.join(root, 'reports/testing');
const summaryPath = path.join(reportDir, '日常测试-汇总.json');
const failurePath = path.join(reportDir, '日常测试-失败技术日志.txt');
const rawPath = path.join(reportDir, '日常测试-完整技术日志.txt');
const timeoutMs = selftest ? Number(process.env.THINK_TEST_FILE_TIMEOUT_MS || 650) : 30_000;
const startupMs = selftest ? 2_000 : 90_000;
const teardownMs = selftest ? 1_000 : 10_000;
const args = process.argv.slice(2);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkos-jest-'));
const results = new Map();
let child = null;
let interrupted = false;
let fatal = '';
let attempt = 0;
let summary = null;
let rawFd = null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (file) => process.platform === 'win32' ? path.normalize(file).toLowerCase() : path.normalize(file);
const relative = (file) => path.relative(root, file).replace(/\\/g, '/');
const line = (value, max = 220) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

function updateSummary() {
  if (!summary) return;
  summary.durationMs = Date.now() - new Date(summary.startedAt).getTime();
  summary.counts = {
    passed: summary.files.filter(f => f.status === '通过').length,
    failed: summary.files.filter(f => f.status === '失败').length,
    timedOut: summary.files.filter(f => f.status === '超时').length,
    skipped: summary.files.filter(f => f.status === '跳过').length,
    notRun: summary.total - summary.files.length,
  };
  summary.success = summary.completed && !summary.interrupted && !fatal &&
    summary.total > 0 && summary.counts.passed === summary.total;
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}
function record(file, status, extra = {}) {
  const key = normalize(file);
  if (results.has(key)) throw new Error(`重复的测试文件结果：${relative(file)}`);
  results.set(key, status);
  const { rawFailure, ...details } = extra;
  summary.files.push({ file: relative(file), status, ...details });
  summary.activeFile = null;
  updateSummary();
  const marker = status === '通过' ? 'OOO' : status === '超时' ? '!!!' : 'XXX';
  console.log(`${marker}  ${relative(file)}${extra.durationMs != null ? `  (${extra.durationMs}ms)` : ''}`);
  if (status === '失败' && extra.reason) console.log(`     原因：${line(extra.reason, 300)}`);
  if (status === '失败' && extra.expected) console.log(`     期望：${line(extra.expected)}`);
  if (status === '失败' && extra.actual) console.log(`     实际：${line(extra.actual)}`);
  if (status === '失败' || status === '超时') {
    fs.appendFileSync(failurePath, `\n===== ${relative(file)} / ${status} =====\n${rawFailure || extra.reason || ''}\n`, 'utf8');
  }
}

// 返回明确的执行状态；Windows 先等待 taskkill 结束，绝不在未确认清理时补跑。
const killers = new Map();
function terminate(p) {
  if (!p?.pid) return Promise.resolve({ ok: true });
  if (killers.has(p.pid)) return killers.get(p.pid);
  const request = new Promise((resolve) => {
    if (process.platform !== 'win32') {
      try { process.kill(-p.pid, 'SIGKILL'); resolve({ ok: true }); }
      catch (error) {
        if (error.code === 'ESRCH') { resolve({ ok: true }); return; }
        try { p.kill('SIGKILL'); resolve({ ok: true }); }
        catch (nested) { resolve({ ok: false, error: String(nested) }); }
      }
      return;
    }
    let settled = false;
    let timer;
    const done = (ok, error = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, error });
    };
    try {
      const killer = spawn('taskkill.exe', ['/PID', String(p.pid), '/T', '/F'], {
        windowsHide: true, shell: false, stdio: 'ignore',
      });
      killer.once('error', (error) => done(false, String(error)));
      killer.once('close', (code) => done(code === 0, code === 0 ? '' : `taskkill 退出码 ${code}`));
      timer = setTimeout(() => { try { killer.kill(); } catch {} done(false, 'taskkill 未确认完成'); }, 5000);
    } catch (error) { done(false, String(error)); }
  });
  killers.set(p.pid, request);
  return request;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    if (child) void terminate(child);
  });
}
function startJest(jestArgs, env = process.env) {
  const p = spawn(process.execPath, [jest, ...jestArgs], {
    cwd: root, env, windowsHide: true, shell: false,
    detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
  });
  child = p;
  p.stdout.setEncoding('utf8');
  p.stderr.setEncoding('utf8');
  return p;
}
async function waitClose(p, ms) {
  let timer;
  const closed = new Promise((resolve) => {
    p.once('error', (error) => resolve({ code: null, error: String(error) }));
    p.once('close', (code, signal) => resolve({ code, signal }));
  });
  const result = await Promise.race([
    closed,
    new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms); }),
  ]);
  clearTimeout(timer);
  return { result, closed };
}
async function discover() {
  const p = startJest(['--config', config, '--listTests', '--json', '--runInBand', ...args]);
  let stdout = '', stderr = '';
  p.stdout.on('data', (data) => { stdout += data; });
  p.stderr.on('data', (data) => { stderr += data; });
  const { result, closed } = await waitClose(p, startupMs);
  if (!result || interrupted) {
    const ended = await terminate(p);
    await Promise.race([closed, delay(1500)]);
    if (!ended.ok) throw new Error(`发现测试文件时终止进程失败：${ended.error}`);
    if (interrupted) throw new Error('用户中断测试文件发现');
    throw new Error('Jest 文件发现超过安全时限');
  }
  child = null;
  if (result.code !== 0) throw new Error(`Jest 文件发现失败：${line(stderr, 900)}`);
  let files;
  try { files = JSON.parse(stdout.trim()); }
  catch { throw new Error(`Jest 文件列表不是有效 JSON：${line(stdout, 400)}`); }
  if (!Array.isArray(files) || files.length === 0 || files.some(f => typeof f !== 'string')) {
    throw new Error('没有发现有效测试文件，不能把 0 个文件认作通过');
  }
  const unique = [...new Set(files.map(f => path.resolve(root, f)))];
  if (unique.some(f => !/^test\/(unit|integration)\//.test(relative(f)))) {
    throw new Error('发现非日常单元/集成测试文件，停止执行');
  }
  return unique;
}
function forwardExecutionOptions() {
  const supported = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-t' || args[i] === '--testNamePattern') && args[i + 1]) {
      supported.push(args[i], args[++i]);
    } else if (args[i].startsWith('--testNamePattern=') ||
      ['-u', '--updateSnapshot', '--no-cache'].includes(args[i])) supported.push(args[i]);
  }
  return supported;
}
async function execute(files) {
  const events = path.join(tmpDir, `events-${++attempt}.jsonl`);
  fs.writeFileSync(events, '', 'utf8');
  const selected = files.map(f => relative(f));
  const p = startJest(['--config', config, '--runInBand', '--runTestsByPath', ...selected,
    ...forwardExecutionOptions(), '--reporters=default', `--reporters=${reporter}`],
  { ...process.env, THINK_TEST_GUARD_EVENTS_FILE: events });
  fs.writeSync(rawFd, `\n===== Jest 执行第 ${attempt} 轮 / ${files.length} 个文件 =====\n`);
  let outputTail = '';
  const capture = (chunk) => {
    fs.writeSync(rawFd, chunk);
    outputTail = (outputTail + chunk).slice(-12000);
  };
  p.stdout.on('data', capture);
  p.stderr.on('data', capture);
  let finished = false, exit = null;
  const closed = new Promise((resolve) => {
    p.once('error', (error) => { finished = true; exit = { code: null, error: String(error) }; resolve(exit); });
    p.once('close', (code, signal) => { finished = true; exit = { code, signal }; resolve(exit); });
  });
  let active = null, activeAt = 0, lastUpdate = Date.now();
  let complete = null, readPos = 0, buffer = '', problem = '', timeout = '';
  const expected = new Map(files.map(f => [normalize(f), f]));
  let newResults = 0;
  function drain() {
    const content = fs.readFileSync(events, 'utf8');
    if (content.length < readPos) throw new Error('Jest 事件文件被截断');
    buffer += content.slice(readPos); readPos = content.length;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const text = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
      if (!text.trim()) continue;
      const e = JSON.parse(text);
      if (complete) throw new Error('Jest 完成事件之后仍收到新的进度事件');
      if (e.event === 'start') {
        const f = expected.get(normalize(e.file));
        if (!f || results.has(normalize(f)) || active) throw new Error('Jest 启动事件不合法');
        active = f; activeAt = Number(e.at) || Date.now(); lastUpdate = Date.now();
        summary.activeFile = relative(f); updateSummary();
        console.log(`     正在测试：${relative(f)}`);
      } else if (e.event === 'result') {
        const f = expected.get(normalize(e.file));
        if (!f || f !== active || !['pass', 'fail', 'skip'].includes(e.status)) throw new Error('Jest 结果事件不合法');
        // 即使轮询略晚，也不能把超过文件时限的结果当成正常通过。
        if ((Number(e.at) || Date.now()) - activeAt > timeoutMs) {
          timeout = f;
          return;
        }
        const status = e.status === 'pass' ? '通过' : e.status === 'fail' ? '失败' : '跳过';
        record(f, status, { durationMs: Math.max(0, Number(e.durationMs) || 0),
          ...(e.reason ? { reason: line(e.reason, 500) } : {}),
          ...(e.expected ? { expected: line(e.expected, 300) } : {}),
          ...(e.actual ? { actual: line(e.actual, 300) } : {}),
          ...(e.rawFailure ? { rawFailure: e.rawFailure } : {}) });
        active = null; activeAt = 0; lastUpdate = Date.now(); newResults++;
      } else if (e.event === 'complete') {
        if (active || typeof e.success !== 'boolean') throw new Error('Jest 完成事件不合法');
        complete = e; lastUpdate = Date.now();
      } else throw new Error('未知的 Jest 进度事件');
    }
  }
  while (!finished && !interrupted) {
    try { drain(); } catch (error) { problem = String(error); break; }
    if (timeout) break;
    const limit = active ? timeoutMs : complete ? teardownMs : startupMs;
    const elapsed = active ? Date.now() - activeAt : Date.now() - lastUpdate;
    if (elapsed > limit) {
      timeout = active || (complete ? '__teardown__' : '__startup__');
      break;
    }
    await delay(40);
  }
  let killStatus = { ok: true };
  if (!finished && (timeout || interrupted || problem)) killStatus = await terminate(p);
  if (interrupted && killers.has(p.pid)) killStatus = await killers.get(p.pid);
  let exitTimer;
  const ended = await Promise.race([closed, new Promise(resolve => { exitTimer = setTimeout(() => resolve(null), 1800); })]);
  clearTimeout(exitTimer);
  try { if (!problem && !timeout) drain(); } catch (error) { problem = String(error); }
  if (!killStatus.ok) return { fatal: `无法确认 Jest 进程终止：${killStatus.error}` };
  if (!ended) return { fatal: 'Jest 子进程没有确认退出' };
  child = null;
  if (interrupted) return { interrupted: true };
  if (problem || ended.error) return { fatal: problem || ended.error };
  if (timeout === '__startup__' || timeout === '__teardown__') {
    return { fatal: timeout === '__startup__' ? '启动或测试文件切换超过安全时限' : '文件完成后 Jest 收尾卡住' };
  }
  if (timeout) {
    if (!results.has(normalize(timeout))) record(timeout, '超时', { durationMs: timeoutMs, reason: '测试文件超过 30 秒' });
    return { retry: true };
  }
  const remaining = files.filter(f => !results.has(normalize(f)));
  if (complete) {
    if (remaining.length) return { fatal: `Jest 报告结束，但 ${remaining.length} 个文件没有结果` };
    const anyFailure = files.some(f => ['失败', '超时'].includes(results.get(normalize(f))));
    if ((ended.code !== 0 && ended.code !== 1) || (ended.code === 0) !== complete.success ||
      complete.success === anyFailure) return { fatal: `Jest 退出码、完成事件与失败结果不一致（${ended.code}）` };
    return { done: true };
  }
  // Jest 非正常退出：明确活动文件时如实记为失败，其他文件继续；无活动文件不能猜测。
  if (active && !results.has(normalize(active))) {
    record(active, '失败', { reason: `Jest 进程异常结束（退出码 ${ended.code}）` });
    return { retry: true };
  }
  if (newResults && remaining.length) return { retry: true };
  return { fatal: `Jest 未发出完成事件（退出码 ${ended.code}），不能报告成功` };
}
function finish() {
  summary.interrupted = interrupted;
  updateSummary();
  console.log(`\n===== 测试汇总 ${summary.files.length}/${summary.total} =====`);
  console.log(`OOO  通过 ${summary.counts.passed}`);
  console.log(`XXX  失败 ${summary.counts.failed}`);
  console.log(`!!!  超时 ${summary.counts.timedOut}`);
  console.log(`---  跳过 ${summary.counts.skipped}，未执行 ${summary.counts.notRun}`);
  console.log(`详情：${relative(summaryPath)}`);
  if (!summary.success) console.log(`失败详情：${relative(failurePath)}`);
  process.exitCode = interrupted ? 130 : fatal ? 2 : summary.success ? 0 : 1;
}
try {
  if (!fs.existsSync(jest)) throw new Error('找不到 Jest，请先安装项目依赖');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(failurePath, '', 'utf8');
  rawFd = fs.openSync(rawPath, 'w');
  summary = { schemaVersion: 3, runner: 'jest-native-guard', total: 0, completed: false,
    interrupted: false, success: false, testFileTimeoutMs: timeoutMs,
    startedAt: new Date().toISOString(), activeFile: null, files: [] };
  updateSummary();
  const files = await discover();
  summary.total = files.length;
  updateSummary();
  console.log(`【测试】${files.length} 个文件；Jest 原生执行，每文件最多 ${timeoutMs / 1000} 秒。`);
  console.log('【测试】OOO 通过 / XXX 失败 / !!! 超时；异常会记录，后续文件继续执行。');
  let pending = files, triesWithoutProgress = 0;
  while (pending.length && !interrupted && !fatal) {
    const before = results.size;
    const result = await execute(pending);
    if (result.fatal) { fatal = result.fatal; break; }
    if (interrupted || result.interrupted) break;
    pending = pending.filter(f => !results.has(normalize(f)));
    if (!pending.length) {
      if (!result.done && !result.retry) fatal = 'Jest 未完成整轮执行';
      break;
    }
    if (!result.retry) { fatal = '仍有文件未执行，但没有可恢复进度'; break; }
    if (results.size === before && ++triesWithoutProgress >= 2) {
      fatal = 'Jest 连续两次退出但没有执行进度'; break;
    }
    if (results.size > before) triesWithoutProgress = 0;
    console.log(`【恢复执行】只补跑剩余 ${pending.length} 个文件。`);
  }
  summary.completed = !interrupted && !fatal && results.size === files.length;
} catch (error) {
  if (!interrupted) fatal = String(error?.stack || error);
} finally {
  if (fatal) {
    console.error(`XXX  测试基础设施异常：${line(fatal, 500)}`);
    fs.mkdirSync(reportDir, { recursive: true });
    fs.appendFileSync(failurePath, `\n===== 测试基础设施异常 =====\n${fatal}\n`, 'utf8');
  }
  if (child) {
    const ended = await terminate(child);
    if (!ended.ok) console.error(`XXX  结束残留进程失败：${ended.error}`);
  }
  if (rawFd !== null) fs.closeSync(rawFd);
  if (summary) finish();
  else process.exitCode = 2;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
