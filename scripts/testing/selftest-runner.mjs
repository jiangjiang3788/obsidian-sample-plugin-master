#!/usr/bin/env node
// 不依赖 Jest 的调度器自检；必须覆盖异常退出、卡死、恢复和误报防护。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, 'run-jest-with-timeout.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkos-jest-watchdog-'));
const root = path.join(temp, '中文 test project with spaces');
const reports = path.join(temp, 'reports');
const fakeJest = path.join(temp, 'fake-jest.cjs');
const config = path.join(root, 'test/configs/jest.core.config.js');

const fakeCode = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.THINK_TEST_INTERNAL_ROOT;
const scenario = process.env.THINK_TEST_INTERNAL_CASE;
const names = {
  many: Array.from({length:291}, (_,i) => 'file-' + String(i + 1).padStart(3,'0') + '.test.ts'),
  pass: ['通过 中文 空格.test.ts', 'last.test.ts'],
  parallel: ['通过 中文 空格.test.ts', 'last.test.ts'],
  fail: ['通过 中文 空格.test.ts', 'fail.test.ts', 'last.test.ts'],
  hang: ['通过 中文 空格.test.ts', 'last.test.ts', 'hang.test.ts', 'after-hang.test.ts', 'end.test.ts'],
  twohang: ['通过 中文 空格.test.ts', 'last.test.ts', 'hang.test.ts', 'after-hang.test.ts', 'hang-two.test.ts', 'end.test.ts'],
  startup: ['通过 中文 空格.test.ts', 'last.test.ts'],
  ghost: ['通过 中文 空格.test.ts'],
  stuckcleanup: ['通过 中文 空格.test.ts'],
  crash: ['crash.test.ts', 'last.test.ts'],
  empty: [],
  badjson: [],
};
let all = names[scenario] || [];
if (args.includes('--listTests')) {
  const filter = args.find((arg) => arg.endsWith('.test.ts'));
  if (filter) all = all.filter((name) => name.includes(filter));
  if (scenario === 'badjson') { console.log('not json'); process.exit(0); }
  process.stdout.write(JSON.stringify(all.map((name) => path.join(root, 'test/unit', name))));
  process.exit(0);
}
if (!process.env.THINK_JEST_EVENTS_FILE) process.exit(2);
const selection = args.slice(args.indexOf('--runTestsByPath') + 1).filter((arg) => arg.endsWith('.test.ts'));
const events = process.env.THINK_JEST_EVENTS_FILE;
const failures = process.env.THINK_JEST_FAILURE_FILE;
const startedLog = path.join(root, 'started-' + scenario + '.txt');
function emit(event) { fs.appendFileSync(events, JSON.stringify(event) + '\n'); }
async function run() {
  if (scenario === 'startup') { setInterval(() => {}, 1000); return; }
  let failed = 0;
  for (const file of selection) {
    const name = path.basename(file);
    if (!all.includes(name)) process.exit(2);
    const id = 'test/unit/' + name;
    fs.appendFileSync(startedLog, name + '\n');
    emit({event:'start',file:id});
    if (scenario === 'parallel') {
      const marker = path.join(root, 'parallel-started.txt');
      fs.appendFileSync(marker, name + '\n');
      let tries = 0;
      while (fs.readFileSync(marker, 'utf8').trim().split('\n').length < 2) {
        if (++tries >= 150) process.exit(3);
        await new Promise((res) => setTimeout(res, 20));
      }
    }
    if (name.startsWith('hang')) { setInterval(() => {}, 1000); return; }
    if (name === 'crash.test.ts') process.exit(2);
    const bad = name === 'fail.test.ts';
    if (bad) {
      failed++;
      fs.appendFileSync(failures, 'Jest mock: expected 10, actual 20\n');
    }
    await new Promise((res) => setTimeout(res, 15));
    emit({event:'result',file:id,status:bad?'失败':'通过',passed:bad?0:1,
      failed:bad?1:0,pending:0,durationMs:15,
      ...(bad ? {reason:'Expected 10 but received 20',expected:'10',actual:'20'} : {})});
  }
  if (scenario !== 'ghost') emit({event:'complete',success:failed===0,files:selection.length});
  if (scenario === 'stuckcleanup') { setInterval(() => {}, 1000); return; }
  process.exitCode = failed ? 1 : 0;
}
run().catch((error) => { console.error(error); process.exitCode = 3; });
`;

function runScenario(scenario, { timeoutMs = 8000, selection = [], concurrency = 2, interruptAfter = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, ...selection], {
      cwd: root, shell: false, windowsHide: true,
      env: {
        ...process.env,
        THINK_TEST_INTERNAL_SELFTEST: '1',
        THINK_TEST_INTERNAL_ROOT: root,
        THINK_TEST_INTERNAL_JEST: fakeJest,
        THINK_TEST_INTERNAL_CONFIG: config,
        THINK_TEST_INTERNAL_REPORT_DIR: reports,
        THINK_TEST_INTERNAL_CASE: scenario,
        THINK_TEST_FILE_TIMEOUT_MS: String(timeoutMs),
        THINK_TEST_CONCURRENCY: String(concurrency),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += String(chunk); });
    child.stderr.on('data', (chunk) => { output += String(chunk); });
    child.once('error', reject);
    const interruption = interruptAfter ? setTimeout(() => child.kill('SIGINT'), interruptAfter) : null;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`模拟场景 ${scenario} 运行器超时：${output.slice(-1000)}`));
    }, 30_000);
    child.once('close', (code) => {
      clearTimeout(timer);
      clearTimeout(interruption);
      try {
        const summary = JSON.parse(fs.readFileSync(path.join(reports, '日常测试-汇总.json'), 'utf8'));
        resolve({ code, output, summary });
      } catch (error) { reject(error); }
    });
  });
}
function counts(summary) {
  return [summary.counts.passed, summary.counts.failed, summary.counts.timedOut, summary.counts.notRun];
}

try {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.mkdirSync(path.join(root, 'test/unit'), { recursive: true });
  fs.writeFileSync(config, 'module.exports = {};\n');
  fs.writeFileSync(fakeJest, fakeCode);
  let result = await runScenario('pass');
  assert.equal(result.code, 0, result.output);
  assert.equal(result.summary.success, true);
  assert.deepEqual(counts(result.summary), [2, 0, 0, 0]);
  assert.match(result.output, /OOO.*通过 中文 空格\.test\.ts/);
  console.log('【运行器自检】正常通过、中文及空格路径：通过');

  result = await runScenario('many');
  assert.equal(result.code, 0, result.output);
  assert.equal(result.summary.total, 291);
  assert.deepEqual(counts(result.summary), [291, 0, 0, 0]);
  assert.equal(new Set(result.summary.files.map((file) => file.file)).size, 291);
  console.log('【运行器自检】291 文件复用进程、完整去重汇总：通过');

  result = await runScenario('parallel');
  assert.equal(result.code, 0, result.output);
  assert.deepEqual(counts(result.summary), [2, 0, 0, 0]);
  console.log('【运行器自检】两个长期进程真正并发：通过');

  result = await runScenario('fail');
  assert.equal(result.code, 1, result.output);
  assert.deepEqual(counts(result.summary), [2, 1, 0, 0]);
  assert.match(result.output, /XXX.*fail\.test\.ts/);
  assert.match(result.output, /原因：Expected 10 but received 20/);
  assert.match(result.output, /期望：10/);
  assert.match(result.output, /实际：20/);
  const failureLog = fs.readFileSync(path.join(reports, '日常测试-失败技术日志.txt'), 'utf8');
  assert.match(failureLog, /Jest mock: expected 10, actual 20/);
  console.log('【运行器自检】真实失败保留原因、继续运行：通过');

  result = await runScenario('hang', { timeoutMs: 650 });
  assert.equal(result.code, 1, result.output);
  assert.deepEqual(counts(result.summary), [4, 0, 1, 0]);
  assert.match(result.output, /!!!.*hang\.test\.ts/);
  const history = fs.readFileSync(path.join(root, 'started-hang.txt'), 'utf8');
  assert.equal(history.split('通过 中文 空格.test.ts').length - 1, 1, '已通过文件不应补跑');
  assert.equal(history.split('end.test.ts').length - 1, 1, '超时后应该跑后续文件');
  console.log('【运行器自检】卡住后杀进程、只补跑剩余文件：通过');

  result = await runScenario('twohang', { timeoutMs: 650 });
  assert.equal(result.code, 1, result.output);
  assert.deepEqual(counts(result.summary), [4, 0, 2, 0]);
  console.log('【运行器自检】连续两个文件卡住后继续：通过');

  result = await runScenario('startup', { timeoutMs: 650 });
  assert.notEqual(result.code, 0);
  assert.equal(result.summary.completed, false);
  assert.deepEqual(counts(result.summary), [0, 0, 0, 2]);
  console.log('【运行器自检】启动无进度不误报成功：通过');

  result = await runScenario('ghost');
  assert.notEqual(result.code, 0);
  assert.equal(result.summary.success, false);
  console.log('【运行器自检】缺少 Jest 完成事件不能成功：通过');

  result = await runScenario('stuckcleanup', { timeoutMs: 650 });
  assert.notEqual(result.code, 0, result.output);
  assert.equal(result.summary.completed, false, '收尾卡住不得报告完整成功');
  assert.equal(result.summary.success, false);
  console.log('【运行器自检】所有文件结束但 Jest 收尾卡住，不误报成功：通过');

  result = await runScenario('crash');
  assert.equal(result.code, 1, result.output);
  assert.deepEqual(counts(result.summary), [1, 1, 0, 0]);
  console.log('【运行器自检】Jest 连续异常退出，记录失败并继续：通过');

  if (process.platform !== 'win32') {
    result = await runScenario('hang', { timeoutMs: 8000, interruptAfter: 350 });
    assert.equal(result.code, 130, result.output);
    assert.equal(result.summary.success, false);
    assert.equal(result.summary.interrupted, true);
    console.log('【运行器自检】中断清理与失败状态（非 Windows）：通过');
  }

  result = await runScenario('pass', { selection: ['last.test.ts'], concurrency: 1 });
  assert.equal(result.code, 0, result.output);
  assert.deepEqual(counts(result.summary), [1, 0, 0, 0]);
  console.log('【运行器自检】单文件筛选、单进程回退：通过');

  result = await runScenario('empty');
  assert.notEqual(result.code, 0);
  assert.equal(result.summary.success, false);
  console.log('【运行器自检】0 文件不误报成功：通过');

  result = await runScenario('badjson');
  assert.notEqual(result.code, 0);
  assert.equal(result.summary.success, false);
  console.log('【运行器自检】无效列表不误报成功：通过');

  console.log('【运行器自检】全部核心场景通过；真实 Jest 与 Windows 10 行为尚待本机验证。');
} catch (error) {
  console.error(`【运行器自检失败】${String(error?.stack || error)}`);
  process.exitCode = 1;
} finally {
  try { fs.rmSync(temp, { recursive: true, force: true }); }
  catch { /* Windows antivirus may briefly lock temporary files */ }
}
