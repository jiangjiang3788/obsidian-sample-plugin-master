#!/usr/bin/env node
/**
 * Think OS Jest supervisor (Node only, including Windows 10).
 * Jest decides whether a suite passed; this process only enforces a wall-clock
 * limit for each file and records the child's real exit code and output.
 * Strict mode trusts each Jest exit code. Fast mode uses structured per-file
 * events, cross-checked with the batch exit code; neither parses stdout.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SELFTEST = process.env.THINK_TEST_INTERNAL_SELFTEST === '1';
const ROOT = SELFTEST && process.env.THINK_TEST_INTERNAL_ROOT
  ? path.resolve(process.env.THINK_TEST_INTERNAL_ROOT) : PROJECT_ROOT;
const JEST = SELFTEST && process.env.THINK_TEST_INTERNAL_JEST
  ? path.resolve(process.env.THINK_TEST_INTERNAL_JEST)
  : path.join(ROOT, 'node_modules/jest/bin/jest.js');
const CONFIG = SELFTEST && process.env.THINK_TEST_INTERNAL_CONFIG
  ? path.resolve(process.env.THINK_TEST_INTERNAL_CONFIG)
  : path.join(ROOT, 'test/configs/jest.core.config.js');
const REPORT_DIR = SELFTEST && process.env.THINK_TEST_INTERNAL_REPORT_DIR
  ? path.resolve(process.env.THINK_TEST_INTERNAL_REPORT_DIR)
  : path.join(ROOT, 'reports/testing');
const RAW_LOG = path.join(REPORT_DIR, '日常测试-完整技术日志.txt');
const FAILURE_LOG = path.join(REPORT_DIR, '日常测试-失败技术日志.txt');
const SUMMARY_FILE = path.join(REPORT_DIR, '日常测试-汇总.json');
// FAST batches reuse one Jest process across many files, with supervisor timeouts.
const FAST = process.argv[2] === '--fast';
const RUN_ARGS = process.argv.slice(FAST ? 3 : 2);
const FAST_BATCH_SIZE = 24;
const specifiedTimeout = Number(process.env.THINK_TEST_FILE_TIMEOUT_MS);
const TIMEOUT_MS = SELFTEST && Number.isFinite(specifiedTimeout) && specifiedTimeout >= 100
  ? specifiedTimeout : 30_000;
const DISCOVERY_TIMEOUT_MS = SELFTEST ? 10_000 : 90_000;
const STOP_GRACE_MS = 7_000;
// Default to two isolated Jest processes. Reduce to one on low-memory machines.
const requestedWorkers = Number(process.env.THINK_TEST_CONCURRENCY ?? 2);
const WORKERS = Number.isInteger(requestedWorkers) && requestedWorkers >= 1
  ? Math.min(requestedWorkers, 4) : 2;

let interrupted = false;
const activeChildren = new Set();
let completedNormally = false;
let started = false;
let rawFd = null;
let report = null;
let testStartedAt = Date.now();

const relative = (file) => path.relative(ROOT, file).replace(/\\/g, '/');
const explain = (value) => String(value?.stack || value?.message || value);
const cleanTail = (text, max = 16000) => text.length > max ? text.slice(-max) : text;

function recordRaw(text) {
  if (rawFd !== null) fs.writeSync(rawFd, String(text));
}
// Each child writes its own spool file so concurrent Jest output cannot interleave.
function mergeRawFile(file, index, total, name) {
  recordRaw(`\n===== ${index}/${total} ${name} =====\n`);
  const input = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let size;
    while ((size = fs.readSync(input, buffer, 0, buffer.length, null)) > 0) {
      if (rawFd !== null) fs.writeSync(rawFd, buffer, 0, size);
    }
  } finally {
    fs.closeSync(input);
    fs.rmSync(file, { force: true });
  }
}
function setActiveFile(name, isActive) {
  report.activeFiles = isActive
    ? [...report.activeFiles, name]
    : report.activeFiles.filter((file) => file !== name);
  report.activeFile = report.activeFiles[0] || null; // compatibility with existing diagnostics
  saveSummary();
}
function terminateActive() {
  for (const child of activeChildren) terminateTree(child);
}
function saveSummary() {
  if (!report) return;
  report.durationMs = Date.now() - testStartedAt;
  report.counts = {
    passed: report.files.filter((item) => item.status === '通过').length,
    failed: report.files.filter((item) => item.status === '失败').length,
    timedOut: report.files.filter((item) => item.status === '超时').length,
    notRun: report.total - report.files.length,
  };
  report.success = Boolean(report.completed && !report.interrupted && report.total > 0 &&
    report.counts.passed === report.total);
  fs.writeFileSync(SUMMARY_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
function recordFailure(file, reason, detail = '') {
  fs.appendFileSync(FAILURE_LOG,
    `\n===== ${file} =====\n${reason}\n${detail || '没有收到 Jest 的错误输出'}\n`, 'utf8');
}

// Kill the whole subprocess tree on Windows; child.kill() alone does not kill
// grandchildren. POSIX children are placed in their own process group.
function terminateTree(child) {
  if (!child || !Number.isInteger(child.pid)) return;
  if (process.platform === 'win32') {
    try {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, stdio: 'ignore', shell: false,
      });
      killer.once('error', () => { try { child.kill('SIGKILL'); } catch { /* process has exited */ } });
      killer.once('close', (code) => {
        if (code !== 0) { try { child.kill('SIGKILL'); } catch { /* process has exited */ } }
      });
      killer.unref();
    } catch { try { child.kill('SIGKILL'); } catch { /* process has exited */ } }
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { try { child.kill('SIGKILL'); } catch { /* process has exited */ } }
  }
}

/** Await the real 'close' event; retain a timer so an unresolved Promise cannot
 * silently let the parent exit. A process that cannot be stopped is a fatal
 * supervisor error; do NOT start another Jest process while it may still run.
 */
function execute(args, {
  timeoutMs, env = process.env, onOutput = () => {}, progressFile = null, onProgress = () => {},
} = {}) {
  return new Promise((resolve) => {
    let child;
    let closed = false;
    let timedOut = false;
    let startError = null;
    let unableToStop = false;
    let stdout = '';
    let stderr = '';
    let deadline = null;
    let stopDeadline = null;
    let progressTimer = null;
    let progressOffset = 0;
    let progressRemainder = '';
    let progressError = null;
    const start = Date.now();

    const killAfterDeadline = () => {
      if (closed || timedOut) return;
      timedOut = true;
      terminateTree(child);
      stopDeadline = setTimeout(() => {
        if (closed) return;
        unableToStop = true;
        try { child.kill('SIGKILL'); } catch { /* no-op */ }
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
        finish(null, 'UNCONFIRMED_TERMINATION');
      }, STOP_GRACE_MS);
    };
    const resetDeadline = () => {
      if (closed || timedOut) return;
      clearTimeout(deadline);
      deadline = setTimeout(killAfterDeadline, timeoutMs);
    };
    const readProgress = () => {
      if (!progressFile || !fs.existsSync(progressFile)) return;
      const content = fs.readFileSync(progressFile, 'utf8');
      if (content.length < progressOffset) throw new Error('Jest 进度事件文件被截断。');
      progressRemainder += content.slice(progressOffset);
      progressOffset = content.length;
      let nextLine;
      while ((nextLine = progressRemainder.indexOf('\n')) !== -1) {
        const line = progressRemainder.slice(0, nextLine);
        progressRemainder = progressRemainder.slice(nextLine + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.event === 'start' || event.event === 'result') resetDeadline();
        onProgress(event);
      }
    };

    const finish = (code, signal) => {
      if (closed) return;
      // Flush progress events produced immediately before the Jest process exited.
      if (progressFile) {
        try { readProgress(); } catch (error) { progressError = explain(error); }
      }
      closed = true;
      clearTimeout(progressTimer);
      clearTimeout(deadline);
      clearTimeout(stopDeadline);
      activeChildren.delete(child);
      resolve({ code, signal, timedOut, unableToStop, startError, progressError,
        durationMs: Date.now() - start, stdout, stderr });
    };
    const append = (kind, data) => {
      const chunk = String(data);
      onOutput(chunk, kind);
      if (kind === 'stdout') stdout = cleanTail(stdout + chunk, 128 * 1024);
      else stderr = cleanTail(stderr + chunk, 128 * 1024);
    };

    try {
      child = spawn(process.execPath, [JEST, ...args], {
        cwd: ROOT, env, windowsHide: true, shell: false,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      startError = explain(error);
      finish(null, null);
      return;
    }
    activeChildren.add(child);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => append('stdout', chunk));
    child.stderr?.on('data', (chunk) => append('stderr', chunk));
    child.once('error', (error) => { startError = explain(error); });
    child.once('close', (code, signal) => finish(code, signal));

    resetDeadline();
    if (progressFile) {
      progressTimer = setInterval(() => {
        if (closed || timedOut) return;
        try { readProgress(); } catch (error) {
          progressError = explain(error);
          killAfterDeadline();
        }
      }, 100);
    }
  });
}

function selectRunOptions() {
  // File selection belongs only to --listTests. Forward only options that
  // actually affect each chosen Jest suite; never reapply --findRelatedTests.
  const forwarded = [];
  for (let i = 0; i < RUN_ARGS.length; i++) {
    const arg = RUN_ARGS[i];
    if ((arg === '-t' || arg === '--testNamePattern') && RUN_ARGS[i + 1]) {
      forwarded.push(arg, RUN_ARGS[++i]);
    } else if (/^--testNamePattern=/.test(arg) || ['-u', '--updateSnapshot', '--no-cache'].includes(arg)) {
      forwarded.push(arg);
    }
  }
  return forwarded;
}

async function discover() {
  const args = ['--config', CONFIG, '--listTests', '--json', '--runInBand', ...RUN_ARGS];
  const result = await execute(args, { timeoutMs: DISCOVERY_TIMEOUT_MS });
  if (result.unableToStop) throw new Error('Jest 列表查询无法终止，已停止整轮运行。');
  if (result.timedOut) throw new Error('Jest 列表查询超时，尚未执行测试。');
  if (result.startError || result.code !== 0) {
    throw new Error(`Jest 列表查询失败（退出码 ${result.code ?? '缺失'}）：${result.startError || result.stderr || result.stdout}`);
  }
  let files;
  try { files = JSON.parse(result.stdout.trim()); }
  catch { throw new Error(`Jest 列表不是有效 JSON：${cleanTail(result.stdout, 1200)}`); }
  if (!Array.isArray(files) || files.length === 0 || files.some((file) => typeof file !== 'string' || !file)) {
    throw new Error('Jest 未提供有效的测试文件列表；不能把 0 个文件视为通过。');
  }
  return [...new Set(files.map((file) => path.resolve(ROOT, file)))];
}

async function runFile(file, index, total) {
  const name = relative(file);
  const childFailure = path.join(REPORT_DIR, `.jest-current-failure-${index}.txt`);
  const childReport = path.join(REPORT_DIR, `.jest-current-report-${index}.json`);
  const childRaw = path.join(REPORT_DIR, `.jest-current-output-${index}.txt`);
  fs.rmSync(childFailure, { force: true });
  fs.rmSync(childReport, { force: true });
  console.log(`【正在测试 ${index}/${total}】${name}`);
  setActiveFile(name, true);
  const childRawFd = fs.openSync(childRaw, 'w');
  let result;
  try {
    result = await execute([
      '--config', CONFIG, '--runInBand', '--runTestsByPath', file, ...selectRunOptions(),
    ], {
      timeoutMs: TIMEOUT_MS,
      env: {
        ...process.env,
        THINK_JEST_REPORT_FILE: '',
        THINK_JEST_FAILURE_FILE: childFailure,
        THINK_JEST_STRUCTURED_FILE: childReport,
        THINK_TEST_LABEL: '日常测试',
      },
      onOutput: (chunk) => fs.writeSync(childRawFd, chunk),
    });
  } finally {
    fs.closeSync(childRawFd);
    mergeRawFile(childRaw, index, total, name);
  }

  // One source of truth: the Jest process's actual exit code.
  // JSON generated by the Chinese reporter is diagnostic information only.
  const status = result.timedOut ? '超时' :
    result.code === 0 && !result.startError && !result.unableToStop ? '通过' : '失败';
  const reason = result.timedOut
    ? `超过 ${TIMEOUT_MS / 1000} 秒，已终止 Jest 进程树。`
    : result.unableToStop
      ? '无法确认 Jest 进程已经停止，为安全起见中止整轮运行。'
      : `Jest 退出码=${result.code ?? '缺失'}；信号=${result.signal || '无'}；启动错误=${result.startError || '无'}`;
  if (status !== '通过') {
    const failureText = fs.existsSync(childFailure) ? fs.readFileSync(childFailure, 'utf8') : '';
    recordFailure(name, reason, cleanTail(failureText || result.stderr || result.stdout));
    console.log(`【测试诊断】${reason}`);
  }
  fs.rmSync(childFailure, { force: true });
  fs.rmSync(childReport, { force: true });
  const entry = { file: name, status, durationMs: result.durationMs,
    exitCode: result.code, signal: result.signal || null, ...(result.startError ? { error: result.startError } : {}) };
  report.files.push(entry);
  setActiveFile(name, false);
  const symbol = status === '通过' ? '[OK]' : status === '失败' ? '[FAIL]' : '[TIMEOUT]';
  console.log(`【测试文件】${symbol} ${status}：${name}（耗时 ${result.durationMs}ms）`);
  return !result.unableToStop;
}

/** Fast mode: one in-band Jest process per small batch. A reporter event means
 * that a particular file actually started or completed. If it stalls, the
 * supervisor kills that Jest process tree and retries ONLY untouched files.
 * Unlike strict mode, mixed-batch Jest results are attributed by the trusted
 * structured reporter events, never by parsing human-readable text.
 */
async function runFast(files) {
  const registered = new Set();
  const globalNames = new Set(files.map(relative));
  const attempts = new Map();
  let round = 0;

  const add = (name, status, durationMs, details = {}) => {
    if (registered.has(name) || !globalNames.has(name)) return;
    registered.add(name);
    report.files.push({ file: name, status, durationMs, ...details });
    saveSummary();
    const mark = status === '通过' ? '[OK]' : status === '失败' ? '[FAIL]' : '[TIMEOUT]';
    console.log(`【测试文件】${mark} ${status}：${name}（耗时 ${durationMs}ms）`);
  };

  console.log(`【测试】快速安全模式：每批最多 ${FAST_BATCH_SIZE} 个文件，顺序复用 Jest，单文件最多 ${TIMEOUT_MS / 1000} 秒。`);
  console.log('【测试】如有卡住，终止该批进程，仅补跑尚未得到结果的文件。');
  for (let offset = 0; offset < files.length && !interrupted; offset += FAST_BATCH_SIZE) {
    const group = files.slice(offset, offset + FAST_BATCH_SIZE);
    let remaining = group;
    while (remaining.length && !interrupted) {
      round += 1;
      const names = new Set(remaining.map(relative));
      const eventsFile = path.join(REPORT_DIR, `.jest-fast-events-${round}.jsonl`);
      const childFailure = path.join(REPORT_DIR, `.jest-fast-failures-${round}.txt`);
      const childReport = path.join(REPORT_DIR, `.jest-fast-report-${round}.json`);
      for (const file of [eventsFile, childFailure, childReport]) fs.rmSync(file, { force: true });
      let activeName = null;
      let completedEvent = null;
      let rejectedEvent = null;
      const startedAt = new Map();
      const startedThisRound = new Set();
      const onProgress = (event) => {
        if (event.event === 'start') {
          if (!names.has(event.file) || registered.has(event.file)) {
            rejectedEvent = 'Jest 返回不属于当前批次的测试开始事件。';
            return;
          }
          activeName = event.file;
          startedAt.set(event.file, Date.now());
          startedThisRound.add(event.file);
          report.activeFile = activeName;
          report.activeFiles = [activeName];
          saveSummary();
          console.log(`【正在测试】${activeName}`);
        } else if (event.event === 'result') {
          if (!names.has(event.file) || (event.status !== '通过' && event.status !== '失败')) {
            rejectedEvent = 'Jest 返回无效的测试结果事件。';
            return;
          }
          add(event.file, event.status, Number(event.durationMs) || 0,
            { casesPassed: Number(event.passed) || 0, casesFailed: Number(event.failed) || 0 });
          if (activeName === event.file) activeName = null;
          report.activeFile = activeName;
          report.activeFiles = activeName ? [activeName] : [];
          saveSummary();
        } else if (event.event === 'complete') {
          completedEvent = event;
        }
      };
      console.log(`【测试批次】第 ${round} 批，待测 ${remaining.length} 个文件。`);
      recordRaw(`\n===== 快速测试批次 ${round}（${remaining.map(relative).join(', ')}）=====\n`);
      const result = await execute([
        '--config', CONFIG, '--runInBand', '--runTestsByPath', ...remaining, ...selectRunOptions(),
      ], {
        timeoutMs: TIMEOUT_MS,
        progressFile: eventsFile,
        onProgress,
        env: {
          ...process.env, THINK_JEST_EVENTS_FILE: eventsFile,
          THINK_JEST_REPORT_FILE: '', THINK_JEST_FAILURE_FILE: childFailure,
          THINK_JEST_STRUCTURED_FILE: childReport, THINK_TEST_LABEL: '日常快速测试',
        },
        onOutput: recordRaw,
      });
      // Preserve all failure stacks even when a child is killed before onRunComplete.
      if (fs.existsSync(childFailure)) {
        const detail = fs.readFileSync(childFailure, 'utf8');
        if (detail.trim()) fs.appendFileSync(FAILURE_LOG, `\n===== 批次 ${round} =====\n${detail}`, 'utf8');
      }
      for (const file of [eventsFile, childFailure, childReport]) fs.rmSync(file, { force: true });
      report.activeFile = null;
      report.activeFiles = [];
      saveSummary();

      if (result.unableToStop) throw new Error('Jest 进程树无法确认终止，停止调度以避免残留进程。');
      if (interrupted) break;
      if (result.progressError || rejectedEvent) {
        throw new Error(`Jest 进度事件不可信：${result.progressError || rejectedEvent}`);
      }
      if (result.timedOut) {
        if (activeName && !registered.has(activeName)) {
          const spent = Math.max(0, Date.now() - (startedAt.get(activeName) || Date.now()));
          add(activeName, '超时', spent, { exitCode: result.code, signal: result.signal || null });
          recordFailure(activeName, `超过 ${TIMEOUT_MS / 1000} 秒，已终止本批 Jest 进程树。`);
          console.log(`【测试诊断】[TIMEOUT] 已终止 ${activeName}；其它未完成文件继续。`);
        } else if (remaining.every((file) => registered.has(relative(file)))) {
          throw new Error('全部文件已返回结果，但 Jest 在收尾阶段卡住；不得误报整批成功。');
        } else {
          console.log('【测试诊断】Jest 启动或文件切换阶段超时；尝试补跑未完成文件。');
        }
      } else if (!completedEvent || (result.code !== 0 && result.code !== 1)) {
        console.log(`【测试诊断】批次非正常结束（Jest 退出码=${result.code ?? '缺失'}）；重试未完成文件。`);
      } else if ((completedEvent.success === true && result.code !== 0) ||
                 (completedEvent.success === false && result.code === 0)) {
        throw new Error('Jest 退出码与原生完成结果相互矛盾；停止，避免误报。');
      } else if (result.code === 1 && ![...names].some((name) =>
        registered.has(name) && report.files.some((item) => item.file === name && item.status === '失败'))) {
        throw new Error('Jest 返回失败退出码，但没有对应失败文件；停止，避免误报。');
      }
      remaining = remaining.filter((file) => !registered.has(relative(file)));
      if (remaining.length === 0 && !completedEvent && !result.timedOut) {
        throw new Error('Jest 已返回全部文件结果但缺少完整运行结束事件；停止以避免误报成功。');
      }
      if (remaining.length && !interrupted) {
        // A known timed-out file is already accounted for; do not punish untouched files.
        if (result.timedOut && activeName && registered.has(activeName)) continue;
        const startedButUnfinished = remaining.find((file) => startedThisRound.has(relative(file)));
        const suspect = startedButUnfinished || remaining[0];
        const name = relative(suspect);
        const count = (attempts.get(name) || 0) + 1;
        attempts.set(name, count);
        if (count >= 2) {
          if (!startedButUnfinished) {
            throw new Error(`Jest 连续两次无法返回 ${name} 的启动/结果事件；无法确认剩余文件，停止调度。`);
          }
          add(name, '失败', result.durationMs, { error: 'Jest 进程重复异常退出，未返回文件结果' });
          recordFailure(name, `执行 ${count} 次仍未得到 Jest 文件级结果；需检查批次技术日志。`,
            cleanTail(result.stderr || result.stdout));
        }
        remaining = remaining.filter((file) => !registered.has(relative(file)));
      }
    }
  }
  return !interrupted;
}

function onInterrupt(signal) {
  interrupted = true;
  console.error(`\n【测试调度】收到 ${signal}，正在终止当前测试并保存进度。`);
  terminateActive();
}
process.on('SIGINT', () => onInterrupt('Ctrl+C'));
process.on('SIGTERM', () => onInterrupt('SIGTERM'));
process.on('beforeExit', () => {
  if (started && !completedNormally) {
    try {
      if (report) { report.completed = false; report.interrupted = true; saveSummary(); }
      recordFailure('测试调度器', '运行器未正常完成；请检查原始技术日志。');
    } catch { /* cannot recover filesystem failures */ }
    console.error('【测试调度错误】进程未正常结束，结果未通过。');
    process.exitCode = 2;
  }
});

async function main() {
  if (!fs.existsSync(JEST)) throw new Error('未找到 Jest，可先运行 npm ci。');
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(FAILURE_LOG, '', 'utf8');
  rawFd = fs.openSync(RAW_LOG, 'w');
  testStartedAt = Date.now();
  report = {
    schemaVersion: 2, runner: FAST ? 'node-jest-fast-watchdog' : 'node-jest-supervisor', total: 0, completed: false,
    interrupted: false, success: false, testFileTimeoutMs: TIMEOUT_MS,
    startedAt: new Date().toISOString(), activeFile: null, activeFiles: [], files: [],
  };
  started = true;
  saveSummary();
  let fatal = false;
  try {
    const files = await discover();
    report.total = files.length;
    saveSummary();
    const workerCount = Math.min(WORKERS, files.length);
    console.log(`【测试】共 ${files.length} 个文件；每个文件最长 ${TIMEOUT_MS / 1000} 秒。`);
    console.log('【测试】失败继续执行；最终统一汇总。');
    if (FAST) {
      await runFast(files);
    } else {
    console.log(`【测试】严格模式：${workerCount} 路独立 Jest 并发。`);
    let nextIndex = 0;
    const work = Array.from({ length: workerCount }, async () => {
      try {
        while (!interrupted && !fatal) {
          const index = nextIndex++;
          if (index >= files.length) break;
          const safeToContinue = await runFile(files[index], index + 1, files.length);
          if (!safeToContinue) { fatal = true; terminateActive(); break; }
        }
      } catch (error) {
        fatal = true;
        terminateActive();
        throw error;
      }
    });
    // Wait for every active child before closing the shared log or finalizing results.
    const outcomes = await Promise.allSettled(work);
    const rejected = outcomes.find((item) => item.status === 'rejected');
    if (rejected) throw rejected.reason;
    }
    report.interrupted = interrupted || fatal;
    report.completed = !report.interrupted && report.files.length === report.total;
    saveSummary();
  } catch (error) {
    fatal = true;
    const reason = explain(error);
    console.error(`【测试调度错误】${reason}`);
    recordFailure('测试调度器', reason);
    recordRaw(`\n【测试调度错误】${reason}\n`);
    report.error = reason;
    report.interrupted = true;
    report.completed = false;
    saveSummary();
  } finally {
    if (rawFd !== null) { fs.closeSync(rawFd); rawFd = null; }
  }
  const { passed, failed, timedOut, notRun } = report.counts;
  console.log(`\n【测试汇总】共 ${report.total} 个文件，[OK] 通过 ${passed}，[FAIL] 失败 ${failed}，[TIMEOUT] 超时 ${timedOut}，未执行 ${notRun}。`);
  console.log(`【测试汇总】${report.success ? '全部通过' : '存在失败或未完成'}；${relative(SUMMARY_FILE)}`);
  if (!report.success) console.log(`【失败详情】${relative(FAILURE_LOG)}`);
  completedNormally = true;
  process.exitCode = report.success ? 0 : (interrupted ? 130 : (fatal ? 2 : 1));
}

try { await main(); }
catch (error) {
  console.error(`【测试调度错误】${explain(error)}`);
  process.exitCode = 2;
}
