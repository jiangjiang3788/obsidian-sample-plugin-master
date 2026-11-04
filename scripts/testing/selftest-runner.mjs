#!/usr/bin/env node
// No npm dependencies required. Proves the supervisor's behavior with fake Jest
// subprocesses BEFORE asking Windows 10 to run hundreds of real suites.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, 'run-jest-with-timeout.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkos-runner-selftest-'));
const root = path.join(temp, 'test project with spaces');
const reports = path.join(temp, 'reports');
const fakeJest = path.join(temp, 'fake-jest.cjs');
const config = path.join(root, 'test/configs/jest.core.config.js');
const names = ['pass 中文 空格.test.ts', 'fail.test.ts', 'hang.test.ts', 'hang-two.test.ts', 'pass-last.test.ts'];

function runSupervisor(scenario, timeoutMs = 8000, selection = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, ...selection], {
      cwd: root, windowsHide: true, shell: false,
      env: {
        ...process.env,
        THINK_TEST_INTERNAL_SELFTEST: '1',
        THINK_TEST_INTERNAL_ROOT: root,
        THINK_TEST_INTERNAL_JEST: fakeJest,
        THINK_TEST_INTERNAL_CONFIG: config,
        THINK_TEST_INTERNAL_REPORT_DIR: reports,
        THINK_TEST_INTERNAL_CASE: scenario,
        THINK_TEST_FILE_TIMEOUT_MS: String(timeoutMs),
        THINK_TEST_CONCURRENCY: scenario === 'parallel' ? '2' : process.env.THINK_TEST_CONCURRENCY,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => { output += String(data); });
    child.stderr.on('data', (data) => { output += String(data); });
    child.once('error', reject);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`模拟场景 ${scenario} 调度器未能正常退出：${output.slice(-2000)}`));
    }, 40_000);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      try {
        const summaryPath = path.join(reports, '日常测试-汇总.json');
        const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null;
        resolve({ code, signal, output, summary });
      } catch (error) { reject(error); }
    });
  });
}

const fakeCode = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.THINK_TEST_INTERNAL_ROOT;
const scenario = process.env.THINK_TEST_INTERNAL_CASE;
const choose = {
  pass: ['pass 中文 空格.test.ts', 'pass-last.test.ts'],
  parallel: ['pass 中文 空格.test.ts', 'pass-last.test.ts'],
  fail: ['pass 中文 空格.test.ts', 'fail.test.ts', 'pass-last.test.ts'],
  timeout: ['pass 中文 空格.test.ts', 'hang.test.ts', 'pass-last.test.ts'],
  empty: [],
  badjson: [],
  fastpass: ['pass 中文 空格.test.ts', 'pass-last.test.ts'],
  fastfail: ['pass 中文 空格.test.ts', 'fail.test.ts', 'pass-last.test.ts'],
  fasthang: ['pass 中文 空格.test.ts', 'hang.test.ts', 'pass-last.test.ts'],
  fasttwohang: ['pass 中文 空格.test.ts', 'hang.test.ts', 'hang-two.test.ts', 'pass-last.test.ts'],
  fastghost: ['pass 中文 空格.test.ts'],
  fastnostart: ['pass 中文 空格.test.ts'],
};
let all = choose[scenario] || [];
if (args.includes('--listTests')) {
  const selection = args.find(a => a.endsWith('.test.ts'));
  if (selection) all = all.filter(n => n.includes(selection));
  if (scenario === 'badjson') { process.stdout.write('invalid result\n'); process.exit(0); }
  process.stdout.write(JSON.stringify(all.map(n => path.join(root, 'test/unit', n))));
  process.exit(0);
}
const selected = args.includes('--runTestsByPath')
  ? args.slice(args.indexOf('--runTestsByPath') + 1).filter(a => a.endsWith('.test.ts'))
  : [];
const target = selected[0];
const name = path.basename(target || '');
if (!all.includes(name)) { console.error('fake Jest: unknown test file'); process.exit(2); }
if (scenario.startsWith('fast')) {
  const progressFile = process.env.THINK_JEST_EVENTS_FILE;
  const failureFile = process.env.THINK_JEST_FAILURE_FILE;
  const startedFile = path.join(root, 'started-' + scenario + '.txt');
  if (!progressFile) { console.error('event output not enabled'); process.exit(2); }
  if (scenario === 'fastnostart') { setInterval(() => {}, 1000); } else {
  let failed = 0;
  for (const file of selected) {
    const short = path.basename(file);
    fs.appendFileSync(startedFile, short + '\n');
    fs.appendFileSync(progressFile, JSON.stringify({event:'start',file:'test/unit/'+short})+'\n');
    if (short.startsWith('hang')) { setInterval(() => {}, 1000); break; }
    const bad = short === 'fail.test.ts';
    if (bad) {
      failed++;
      fs.appendFileSync(failureFile, '\n=== bad assertion: '+short+' ===\nExpected true but got false\n');
    }
    fs.appendFileSync(progressFile, JSON.stringify({event:'result',file:'test/unit/'+short,
      status: bad ? '失败' : '通过', durationMs: 12, passed: bad ? 0 : 1, failed: bad ? 1 : 0})+'\n');
  }
  if (!selected.some(f=>path.basename(f).startsWith('hang')) && scenario !== 'fastghost') {
    fs.appendFileSync(progressFile, JSON.stringify({event:'complete',success: failed === 0})+'\n');
  }
  if (!selected.some(f=>path.basename(f).startsWith('hang'))) process.exitCode = failed ? 1 : 0;
  }
} else
if (scenario === 'parallel') {
  // Both child processes must start before either can finish.
  const marker = path.join(root, 'parallel-started.txt');
  fs.appendFileSync(marker, name + '\n');
  let attempts = 0;
  const poll = setInterval(() => {
    if (fs.readFileSync(marker, 'utf8').trim().split('\n').length >= 2) {
      clearInterval(poll);
      console.log('SIMULATED PARALLEL PASS: ' + name);
      process.exitCode = 0;
    } else if (++attempts > 350) {
      clearInterval(poll);
      console.error('SIMULATED PARALLEL FAILURE: only one child started');
      process.exitCode = 1;
    }
  }, 20);
} else if (name === 'hang.test.ts') {
  setInterval(() => {}, 1000);
} else if (name === 'fail.test.ts') {
  console.error('SIMULATED ASSERTION FAILURE');
  process.exitCode = 1;
} else {
  console.log('SIMULATED JEST PASS: ' + name);
  process.exitCode = 0;
}
`;

try {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.mkdirSync(path.join(root, 'test/unit'), { recursive: true });
  fs.writeFileSync(config, 'module.exports = {};\n');
  for (const name of names) fs.writeFileSync(path.join(root, 'test/unit', name), '');
  fs.writeFileSync(fakeJest, fakeCode);

  let result = await runSupervisor('pass');
  assert.equal(result.code, 0, `全通过场景不应失败：${result.output}`);
  assert.equal(result.summary?.success, true);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 0, notRun: 0 });
  console.log('【运行器自检】正常通过、中文/空格路径：通过');

  result = await runSupervisor('parallel', 8000);
  assert.equal(result.code, 0, `并发场景两个子进程必须同时启动：${result.output}`);
  assert.equal(result.summary?.success, true);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 0, notRun: 0 });
  assert.deepEqual(result.summary?.activeFiles, []);
  assert.equal(result.summary?.activeFile, null);
  assert.ok(result.output.includes('[OK] 通过'), '成功文件应显示文本标记');
  const raw = fs.readFileSync(path.join(reports, '日常测试-完整技术日志.txt'), 'utf8');
  assert.equal((raw.match(/SIMULATED PARALLEL PASS:/g) || []).length, 2, '并行日志不得丢失');
  console.log('【运行器自检】并发执行、独立汇总与ASCII标记：通过');

  // Reuse one process for multiple files; successful suites need not be rerun.
  result = await runSupervisor('fastpass', 8000, ['--fast']);
  assert.equal(result.code, 0, `快速批次全通过不能失败：${result.output}`);
  assert.equal(result.summary?.success, true);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 0, notRun: 0 });
  assert.ok(result.output.includes('[OK] 通过'));
  console.log('【运行器自检】快速批次复用 Jest、结果实时上报：通过');

  result = await runSupervisor('fastfail', 8000, ['--fast']);
  assert.equal(result.code, 1, `快速批次断言失败应退出 1：${result.output}`);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 1, timedOut: 0, notRun: 0 });
  const failLog = fs.readFileSync(path.join(reports, '日常测试-失败技术日志.txt'), 'utf8');
  assert.ok(failLog.includes('Expected true but got false'), '真实失败细节必须保留');
  console.log('【运行器自检】快速批次真实失败、记录堆栈、后续继续：通过');

  result = await runSupervisor('fasthang', 650, ['--fast']);
  assert.equal(result.code, 1, `快速批次卡住必须终止并继续：${result.output}`);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 1, notRun: 0 });
  assert.equal(result.summary?.completed, true);
  const startedNames = fs.readFileSync(path.join(root, 'started-fasthang.txt'), 'utf8');
  assert.equal(startedNames.split('pass 中文 空格.test.ts').length - 1, 1, '已完成文件不能重复跑');
  assert.ok(result.output.includes('[TIMEOUT] 超时'));
  console.log('【运行器自检】快速批次超时杀进程、仅补跑剩余文件：通过');

  result = await runSupervisor('fasttwohang', 650, ['--fast']);
  assert.equal(result.code, 1, `两个连续卡死用例均必须得到超时结果：${result.output}`);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 2, notRun: 0 });
  const twoHangs = fs.readFileSync(path.join(root, 'started-fasttwohang.txt'), 'utf8');
  assert.equal(twoHangs.split('pass-last.test.ts').length - 1, 1, '两个超时后必须执行最后一个文件');
  console.log('【运行器自检】连续两个卡死，不误伤未执行文件：通过');

  result = await runSupervisor('fastnostart', 650, ['--fast']);
  assert.notEqual(result.code, 0, 'Jest 从未发出启动事件时不能误报通过');
  assert.equal(result.summary?.completed, false, '启动阶段卡死后应保留未完成状态');
  assert.equal(result.summary?.counts.notRun, 1);
  console.log('【运行器自检】启动阶段卡住，不冒充测试已执行：通过');

  result = await runSupervisor('fastghost', 8000, ['--fast']);
  assert.notEqual(result.code, 0, '未收到 Jest 完成事件不能报全通过');
  assert.equal(result.summary?.success, false);
  console.log('【运行器自检】快速批次缺少结束确认不得误报成功：通过');

  result = await runSupervisor('pass', 8000, ['pass-last.test.ts']);
  assert.equal(result.code, 0, `单文件选择不应失败：${result.output}`);
  assert.equal(result.summary?.total, 1);
  assert.deepEqual(result.summary?.counts, { passed: 1, failed: 0, timedOut: 0, notRun: 0 });
  console.log('【运行器自检】命令行选择单文件：通过');

  result = await runSupervisor('fail');
  assert.equal(result.code, 1, `断言失败场景退出码应为 1：${result.output}`);
  assert.equal(result.summary?.completed, true);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 1, timedOut: 0, notRun: 0 });
  assert.ok(result.output.includes('pass-last.test.ts'), '失败后仍应执行下一文件');
  assert.ok(result.output.includes('[FAIL] 失败'), '失败文件应显示文本标记');
  console.log('【运行器自检】真实失败如实记录、失败后继续：通过');

  result = await runSupervisor('timeout', 2500);
  assert.equal(result.code, 1, `超时场景退出码应为 1：${result.output}`);
  assert.equal(result.summary?.completed, true);
  assert.deepEqual(result.summary?.counts, { passed: 2, failed: 0, timedOut: 1, notRun: 0 });
  assert.ok(result.output.includes('pass-last.test.ts'), '超时后仍应执行下一文件');
  assert.ok(result.output.includes('[TIMEOUT] 超时'), '超时文件应有独立文本标记');
  console.log('【运行器自检】强制超时、终止后继续：通过');

  result = await runSupervisor('empty');
  assert.notEqual(result.code, 0);
  assert.equal(result.summary?.success, false);
  console.log('【运行器自检】无测试文件不能误报成功：通过');

  result = await runSupervisor('badjson');
  assert.notEqual(result.code, 0);
  assert.equal(result.summary?.success, false);
  console.log('【运行器自检】列表解析错误不能误报成功：通过');

  console.log('【运行器自检】全部十三组通过，未运行真实项目的 Jest 测试。');
} catch (error) {
  console.error(`【运行器自检失败】${String(error?.stack || error)}`);
  process.exitCode = 1;
} finally {
  try { fs.rmSync(temp, { recursive: true, force: true }); }
  catch { /* Antiviruses may momentarily hold temp files on Windows */ }
}
