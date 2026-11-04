#!/usr/bin/env node
/**
 * 一个 npm test：两个长期复用的 Jest 进程，每个进程顺序运行自己的文件。
 * 每个活动文件 30 秒墙钟看门狗；卡住时仅重启所在进程，跳过已结束的文件。
 * 进度使用 Jest reporter 的结构化事件，绝不解析中文输出判断通过。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const selfTest = process.env.THINK_TEST_INTERNAL_SELFTEST === '1';
const root = selfTest && process.env.THINK_TEST_INTERNAL_ROOT
  ? path.resolve(process.env.THINK_TEST_INTERNAL_ROOT) : projectRoot;
const jest = selfTest && process.env.THINK_TEST_INTERNAL_JEST
  ? path.resolve(process.env.THINK_TEST_INTERNAL_JEST)
  : path.join(root, 'node_modules/jest/bin/jest.js');
const config = selfTest && process.env.THINK_TEST_INTERNAL_CONFIG
  ? path.resolve(process.env.THINK_TEST_INTERNAL_CONFIG)
  : path.join(root, 'test/configs/jest.core.config.js');
const reportDir = selfTest && process.env.THINK_TEST_INTERNAL_REPORT_DIR
  ? path.resolve(process.env.THINK_TEST_INTERNAL_REPORT_DIR)
  : path.join(root, 'reports/testing');
const summaryPath = path.join(reportDir, '日常测试-汇总.json');
const failurePath = path.join(reportDir, '日常测试-失败技术日志.txt');
const rawPath = path.join(reportDir, '日常测试-完整技术日志.txt');
const fileTimeout = selfTest && Number(process.env.THINK_TEST_FILE_TIMEOUT_MS) >= 100
  ? Number(process.env.THINK_TEST_FILE_TIMEOUT_MS) : 30_000;
const discoveryTimeout = selfTest ? 10_000 : 90_000;
const stopGrace = selfTest ? 2_000 : 7_000;
const requestedLanes = Number(process.env.THINK_TEST_CONCURRENCY ?? 2);
const laneLimit = requestedLanes === 1 ? 1 : 2;
const runArgs = process.argv.slice(2);
const childProcesses = new Set();
const results = new Set();
const active = new Map();
const startedAt = Date.now();
let interrupted = false;
let fatal = false;
let rawFd = null;
let report = null;

const relative = (filename) => path.relative(root, filename).replace(/\\/g, '/');
const explain = (error) => String(error?.stack || error?.message || error);
const excerpt = (text, maximum = 2000) => String(text || '').slice(-maximum);
const oneLine = (value, maximum = 180) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum);

function saveSummary() {
  if (!report) return;
  report.durationMs = Date.now() - startedAt;
  report.activeFiles = [...active.values()];
  report.activeFile = report.activeFiles[0] || null;
  report.counts = {
    passed: report.files.filter((entry) => entry.status === '通过').length,
    failed: report.files.filter((entry) => entry.status === '失败').length,
    timedOut: report.files.filter((entry) => entry.status === '超时').length,
    notRun: report.total - report.files.length,
  };
  report.success = Boolean(report.completed && !report.interrupted && report.total > 0 &&
    report.counts.passed === report.total);
  fs.writeFileSync(summaryPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
function setActive(lane, file) {
  if (file) active.set(lane, file);
  else active.delete(lane);
  saveSummary();
}
function addResult(file, status, durationMs, detail = {}) {
  if (results.has(file)) throw new Error(`测试文件重复上报结果：${file}`);
  results.add(file);
  report.files.push({ file, status, durationMs, ...detail });
  saveSummary();
  const marker = status === '通过' ? 'OOO' : status === '失败' ? 'XXX' : '!!!';
  console.log(`${marker}  ${file}  (${durationMs}ms)`);
  if (status === '失败') {
    if (detail.reason) console.log(`     原因：${oneLine(detail.reason)}`);
    if (detail.expected) console.log(`     期望：${oneLine(detail.expected)}`);
    if (detail.actual) console.log(`     实际：${oneLine(detail.actual)}`);
  }
  if (status === '超时') console.log(`     超过 ${fileTimeout / 1000} 秒，已终止该 Jest 进程，继续剩余文件。`);
}
function failure(file, reason, detail = '') {
  fs.appendFileSync(failurePath, `\n===== ${file} =====\n${reason}\n${detail}\n`, 'utf8');
}
function appendRaw(text) {
  if (rawFd !== null) fs.writeSync(rawFd, String(text));
}
function mergeSpool(file, label) {
  appendRaw(`\n===== ${label} =====\n`);
  if (!fs.existsSync(file)) return;
  const src = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let count;
    while ((count = fs.readSync(src, buffer, 0, buffer.length, null)) > 0) {
      if (rawFd !== null) fs.writeSync(rawFd, buffer, 0, count);
    }
  } finally {
    fs.closeSync(src);
    fs.rmSync(file, { force: true });
  }
}

// taskkill /T /F is essential on Windows: Jest may have descendant processes.
function killTree(child) {
  if (!Number.isInteger(child?.pid)) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore', windowsHide: true, shell: false,
    });
    killer.once('error', () => { try { child.kill('SIGKILL'); } catch { /* exited */ } });
    killer.once('close', (code) => {
      if (code !== 0) { try { child.kill('SIGKILL'); } catch { /* exited */ } }
    });
    killer.unref();
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { try { child.kill('SIGKILL'); } catch { /* exited */ } }
  }
}
function killAll() {
  for (const child of childProcesses) killTree(child);
}

/** The parent owns the timeout; a blocked Jest event loop cannot block it. */
function execute(args, { timeoutMs, env = process.env, eventsPath = null, onEvent = () => {}, onOutput = () => {} }) {
  return new Promise((resolve) => {
    let child;
    let finished = false;
    let timedOut = false;
    let unconfirmedTermination = false;
    let startError = null;
    let progressError = null;
    let outputTail = '';
    let stdout = '';
    let nextEventOffset = 0;
    let partialLine = '';
    let timeoutTimer;
    let pollTimer;
    let stopTimer;
    const beginning = Date.now();

    const finish = (code, signal) => {
      if (finished) return;
      if (eventsPath && !progressError) {
        try { readEvents(); } catch (error) { progressError = explain(error); }
      }
      finished = true;
      clearTimeout(timeoutTimer);
      clearTimeout(stopTimer);
      clearInterval(pollTimer);
      if (child) childProcesses.delete(child);
      resolve({ code, signal, timedOut, unconfirmedTermination, startError, progressError,
        durationMs: Date.now() - beginning, outputTail, stdout });
    };
    const terminate = () => {
      if (finished || timedOut) return;
      timedOut = true;
      killTree(child);
      stopTimer = setTimeout(() => {
        if (finished) return;
        unconfirmedTermination = true;
        try { child.kill('SIGKILL'); } catch { /* exited */ }
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
        finish(null, 'UNCONFIRMED_TERMINATION');
      }, stopGrace);
    };
    const resetTimer = () => {
      if (finished || timedOut) return;
      clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(terminate, timeoutMs);
    };
    const readEvents = () => {
      if (!eventsPath || !fs.existsSync(eventsPath)) return;
      const content = fs.readFileSync(eventsPath, 'utf8');
      if (content.length < nextEventOffset) throw new Error('Jest 进度事件文件被截断。');
      partialLine += content.slice(nextEventOffset);
      nextEventOffset = content.length;
      let newline;
      while ((newline = partialLine.indexOf('\n')) >= 0) {
        const line = partialLine.slice(0, newline);
        partialLine = partialLine.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (!timedOut && (event.event === 'start' || event.event === 'result')) resetTimer();
        // An event written after the deadline must not turn a timed-out file into a pass.
        if (!timedOut) onEvent(event);
      }
    };
    const append = (chunk, isStdout) => {
      const text = String(chunk);
      onOutput(text);
      outputTail = excerpt(outputTail + text, 8192);
      if (isStdout) stdout += text;
    };
    try {
      child = spawn(process.execPath, [jest, ...args], {
        cwd: root, env, windowsHide: true, shell: false,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      startError = explain(error);
      finish(null, null);
      return;
    }
    childProcesses.add(child);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => append(chunk, true));
    child.stderr?.on('data', (chunk) => append(chunk, false));
    child.once('error', (error) => { startError = explain(error); });
    child.once('close', (code, signal) => finish(code, signal));
    resetTimer();
    if (eventsPath) {
      pollTimer = setInterval(() => {
        if (finished || timedOut) return;
        try { readEvents(); } catch (error) {
          progressError = explain(error);
          terminate();
        }
      }, 75);
    }
  });
}

function forwardedOptions() {
  const options = [];
  for (let i = 0; i < runArgs.length; i++) {
    const arg = runArgs[i];
    if (['-t', '--testNamePattern'].includes(arg) && runArgs[i + 1]) {
      options.push(arg, runArgs[++i]);
    } else if (/^--testNamePattern=/.test(arg) || ['-u', '--updateSnapshot', '--no-cache'].includes(arg)) {
      options.push(arg);
    }
  }
  return options;
}
async function discover() {
  const result = await execute(['--config', config, '--listTests', '--json', '--runInBand', ...runArgs], {
    timeoutMs: discoveryTimeout, onOutput: () => {},
  });
  if (result.unconfirmedTermination) throw new Error('Jest 文件发现进程未确认退出。');
  if (result.timedOut) throw new Error('Jest 文件发现超时，尚未执行测试。');
  if (result.startError || result.code !== 0) {
    throw new Error(`Jest 文件发现失败：${result.startError || result.outputTail}`);
  }
  let paths;
  try { paths = JSON.parse(result.stdout.trim()); }
  catch { throw new Error(`Jest 文件列表不是有效 JSON：${excerpt(result.stdout, 500)}`); }
  if (!Array.isArray(paths) || !paths.length || paths.some((name) => typeof name !== 'string' || !name)) {
    throw new Error('没有有效测试文件，不能把 0 个文件当成通过。');
  }
  const files = [...new Set(paths.map((name) => path.resolve(root, name)))];
  if (files.some((name) => !relative(name).startsWith('test/'))) {
    throw new Error('Jest 返回了测试目录之外的路径，停止执行。');
  }
  return files;
}

/** Each lane keeps one warm Jest process until a failure of the process itself. */
async function runLane(lane, assigned) {
  let pending = assigned;
  let attempt = 0;
  let noProgressAttempts = 0;
  const repeatedCrash = new Map();
  while (pending.length && !interrupted && !fatal) {
    attempt++;
    const names = new Set(pending.map(relative));
    const prefix = `.jest-lane-${lane}-attempt-${attempt}`;
    const eventsPath = path.join(reportDir, `${prefix}-events.jsonl`);
    const failuresPath = path.join(reportDir, `${prefix}-failures.txt`);
    const spoolPath = path.join(reportDir, `${prefix}-output.txt`);
    for (const file of [eventsPath, failuresPath, spoolPath]) fs.rmSync(file, { force: true });
    const spoolFd = fs.openSync(spoolPath, 'w');
    let activeFile = null;
    let activeStarted = 0;
    let complete = null;
    let eventError = null;
    let resultEvents = 0;
    const onEvent = (event) => {
      if (eventError) return;
      if (event.event === 'start') {
        if (!names.has(event.file) || activeFile || results.has(event.file)) {
          eventError = `Jest 启动事件无效：${event.file}`;
          return;
        }
        activeFile = event.file;
        activeStarted = Date.now();
        setActive(lane, activeFile);
        console.log(`     正在测试：${activeFile}`);
      } else if (event.event === 'result') {
        if (!names.has(event.file) || activeFile !== event.file ||
          !['通过', '失败'].includes(event.status) || results.has(event.file)) {
          eventError = `Jest 结果事件无效：${event.file}`;
          return;
        }
        resultEvents++;
        addResult(event.file, event.status, Math.max(0, Number(event.durationMs) || 0), {
          casesPassed: Math.max(0, Number(event.passed) || 0),
          casesFailed: Math.max(0, Number(event.failed) || 0),
          casesSkipped: Math.max(0, Number(event.pending) || 0),
          ...(event.reason ? { reason: oneLine(event.reason, 500) } : {}),
          ...(event.expected ? { expected: oneLine(event.expected, 300) } : {}),
          ...(event.actual ? { actual: oneLine(event.actual, 300) } : {}),
        });
        activeFile = null;
        activeStarted = 0;
        setActive(lane, null);
      } else if (event.event === 'complete') {
        if (complete || activeFile || typeof event.success !== 'boolean') {
          eventError = 'Jest 完成事件不可信。';
          return;
        }
        complete = event;
      } else {
        eventError = 'Jest 返回未知进度事件。';
      }
    };
    let execution;
    try {
      execution = await execute([
        '--config', config, '--runInBand', '--forceExit', '--runTestsByPath',
        ...pending.map((file) => path.relative(root, file)), ...forwardedOptions(),
      ], {
        timeoutMs: fileTimeout,
        eventsPath,
        onEvent,
        onOutput: (text) => fs.writeSync(spoolFd, text),
        env: {
          ...process.env,
          THINK_JEST_EVENTS_FILE: eventsPath,
          THINK_JEST_REPORT_FILE: '',
          THINK_JEST_FAILURE_FILE: failuresPath,
          THINK_JEST_STRUCTURED_FILE: '',
          THINK_TEST_LABEL: '日常测试',
        },
      });
    } finally {
      fs.closeSync(spoolFd);
      mergeSpool(spoolPath, `Jest 进程 ${lane} / 第 ${attempt} 次`);
      if (fs.existsSync(failuresPath)) {
        const details = fs.readFileSync(failuresPath, 'utf8');
        if (details.trim()) fs.appendFileSync(failurePath, details, 'utf8');
      }
      for (const file of [eventsPath, failuresPath]) fs.rmSync(file, { force: true });
      setActive(lane, null);
    }
    if (execution.unconfirmedTermination) throw new Error('Jest 进程树未确认终止；停止调度以避免残留进程。');
    if (interrupted || fatal) return;
    if (execution.progressError || eventError) {
      throw new Error(`Jest 进度协议出错：${execution.progressError || eventError}`);
    }
    pending = pending.filter((file) => !results.has(relative(file)));
    if (execution.timedOut) {
      if (activeFile) {
        const elapsed = Date.now() - activeStarted;
        addResult(activeFile, '超时', elapsed);
        failure(activeFile, `超过 ${fileTimeout / 1000} 秒，已终止该 Jest 进程树。`, execution.outputTail);
        pending = pending.filter((file) => relative(file) !== activeFile);
        noProgressAttempts = 0;
      } else if (!pending.length) {
        throw new Error('所有文件已上报结果，但 Jest 收尾卡住并被终止；不能报告整轮成功。');
      } else if (++noProgressAttempts >= 2) {
        throw new Error('Jest 连续两次在启动或切换文件时卡住，无法确定超时文件；为避免错判已停止。');
      }
    } else if (complete) {
      if (pending.length) {
        throw new Error(`Jest 声称已执行完毕，但还有 ${pending.length} 个文件没有结果。`);
      }
      const hasFailures = [...names].some((file) => report.files.some((r) => r.file === file && r.status === '失败'));
      if ((execution.code === 0) !== complete.success || complete.success === hasFailures ||
        (execution.code !== 0 && execution.code !== 1)) {
        throw new Error(`Jest 退出码 ${execution.code} 与测试文件结果不一致。`);
      }
      return;
    } else {
      // Abnormal Jest crash: retry only uncompleted files, never report success.
      if (!pending.length) throw new Error('Jest 已有全部文件结果但缺少结束确认；不能报成功。');
      if (activeFile) {
        const count = (repeatedCrash.get(activeFile) || 0) + 1;
        repeatedCrash.set(activeFile, count);
        if (count >= 2) {
          addResult(activeFile, '失败', execution.durationMs, { reason: 'Jest 进程连续异常退出，未产生文件级结果' });
          failure(activeFile, 'Jest 连续两次异常退出，未产生文件级结果。', execution.outputTail);
          pending = pending.filter((file) => relative(file) !== activeFile);
        }
        noProgressAttempts = 0;
      } else if (resultEvents) {
        noProgressAttempts = 0;
      } else if (++noProgressAttempts >= 2) {
        throw new Error(`Jest 在未执行文件前连续异常退出：${oneLine(execution.outputTail)}`);
      }
    }
    if (pending.length && !interrupted && !fatal) {
      console.log(`【恢复执行】进程 ${lane} 只补跑剩余 ${pending.length} 个文件。`);
    }
  }
}

function onInterrupt(signal) {
  if (interrupted) return;
  interrupted = true;
  console.error(`\n【中断】收到 ${signal}，正在结束 Jest 子进程并保存进度。`);
  killAll();
}
process.on('SIGINT', () => onInterrupt('Ctrl+C'));
process.on('SIGTERM', () => onInterrupt('SIGTERM'));

async function main() {
  if (!fs.existsSync(jest)) throw new Error('找不到 Jest，请先安装项目依赖：npm ci');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(failurePath, '', 'utf8');
  rawFd = fs.openSync(rawPath, 'w');
  report = {
    schemaVersion: 3, runner: 'jest-reuse-watchdog', total: 0,
    completed: false, interrupted: false, success: false,
    testFileTimeoutMs: fileTimeout, startedAt: new Date().toISOString(),
    activeFile: null, activeFiles: [], files: [],
  };
  saveSummary();
  try {
    const files = await discover();
    report.total = files.length;
    saveSummary();
    const lanes = Math.min(laneLimit, files.length);
    console.log(`【测试】${files.length} 个文件，${lanes} 个复用 Jest 进程；文件最长 ${fileTimeout / 1000} 秒。`);
    console.log('【测试】OOO 通过 / XXX 失败 / !!! 超时；失败继续，最后汇总。\n');
    const groups = Array.from({ length: lanes }, () => []);
    files.forEach((file, index) => groups[index % lanes].push(file));
    const settled = await Promise.allSettled(groups.map(async (group, index) => {
      try { await runLane(index + 1, group); }
      catch (error) { fatal = true; killAll(); throw error; }
    }));
    const rejected = settled.find((entry) => entry.status === 'rejected');
    if (rejected) throw rejected.reason;
    report.interrupted = interrupted;
    report.completed = !interrupted && report.files.length === report.total;
    saveSummary();
  } catch (error) {
    fatal = true;
    const reason = explain(error);
    report.error = reason;
    report.interrupted = true;
    report.completed = false;
    saveSummary();
    failure('测试调度器', reason);
    console.error(`【调度错误】${oneLine(reason, 500)}`);
    killAll();
  } finally {
    if (rawFd !== null) { fs.closeSync(rawFd); rawFd = null; }
  }
  const { passed, failed, timedOut, notRun } = report.counts;
  console.log(`\n===== 测试汇总 ${report.files.length}/${report.total} =====`);
  console.log(`OOO  通过 ${passed}`);
  console.log(`XXX  失败 ${failed}`);
  console.log(`!!!  超时 ${timedOut}`);
  console.log(`---  未执行 ${notRun}`);
  console.log(`结果：${report.success ? '全部通过' : '存在失败、超时或未完成'}`);
  console.log(`详情：${relative(summaryPath)}`);
  if (!report.success) console.log(`错误：${relative(failurePath)}`);
  process.exitCode = report.success ? 0 : interrupted ? 130 : fatal ? 2 : 1;
}

try { await main(); }
catch (error) {
  console.error(`【测试调度错误】${explain(error)}`);
  process.exitCode = 2;
}
