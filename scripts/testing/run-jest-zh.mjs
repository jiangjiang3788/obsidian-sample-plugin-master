#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { recordStructuredTestRun } from './history-utils.mjs';
import { updatePerformanceHistory } from './performance-history.mjs';
import { jestInvocation, PROJECT_ROOT } from './process-launch.mjs';

let argv = process.argv.slice(2);
const labelIndex = argv.indexOf('--label');
let label = 'Jest 测试';
if (labelIndex >= 0) {
  label = String(argv[labelIndex + 1] || label);
  argv.splice(labelIndex, 2);
}

const reportDir = path.resolve(PROJECT_ROOT, 'reports/testing');
fs.mkdirSync(reportDir, { recursive: true });
const safeName = label.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'jest';
const reportFile = path.join(reportDir, `${safeName}-中文结果.txt`);
const rawFile = path.join(reportDir, `${safeName}-第三方技术日志.txt`);
const failureFile = path.join(reportDir, `${safeName}-失败技术日志.txt`);
const structuredFile = path.join(reportDir, `${safeName}-结构化结果.json`);
const performanceMetricsFile = path.join(reportDir, 'performance-latest.jsonl');

// v9.3 Windows 兼容：兼容 v9/v9.1 旧 package.json 中把 test/unit 或 test/integration
// 作为 Jest 位置参数传入的写法。Windows 下该参数会被 Jest 当成路径正则，导致 0 matches。
function normalizeLegacyScopeArgs(inputArgs) {
  const args = [...inputArgs];
  let scope = null;
  const kept = [];

  for (const item of args) {
    const normalized = String(item)
      .replace(/^\.([\\/])/, '')
      .replace(/\\/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();

    if (normalized === 'test/unit') {
      scope = 'unit';
      continue;
    }
    if (normalized === 'test/integration') {
      scope = 'integration';
      continue;
    }
    kept.push(item);
  }

  if (!scope) return { args: kept, scope: null };

  const wantedConfig = scope === 'unit'
    ? 'test/configs/jest.unit.config.js'
    : 'test/configs/jest.integration.config.js';
  const configIndex = kept.indexOf('--config');
  if (configIndex >= 0) {
    if (configIndex + 1 < kept.length) kept[configIndex + 1] = wantedConfig;
    else kept.push(wantedConfig);
  } else {
    kept.unshift('--config', wantedConfig);
  }
  return { args: kept, scope };
}

const normalizedLegacy = normalizeLegacyScopeArgs(argv);
argv = normalizedLegacy.args;
const invocation = jestInvocation(argv);

console.log(`\n【测试命令】${label}`);
if (normalizedLegacy.scope === 'unit') console.log('【测试命令】已自动兼容旧版单元测试入口。');
if (normalizedLegacy.scope === 'integration') console.log('【测试命令】已自动兼容旧版组合测试入口。');
try { fs.rmSync(structuredFile, { force: true }); } catch {}
if (argv.some((item) => String(item).includes('jest.performance.config.js'))) {
  try { fs.rmSync(performanceMetricsFile, { force: true }); } catch {}
}

if (!invocation.exists) {
  console.error('【测试命令】没有找到 Jest。当前项目的测试依赖尚未安装完整。');
  console.error(`【测试命令】检查路径：${invocation.entry}`);
  console.error('【测试命令】请先在项目目录运行：npm install');
  process.exitCode = 1;
} else {
  console.log('【测试命令】正在运行，请不要关闭终端……');
}

if (!invocation.exists) {
  // 让中文错误自然刷出后结束，不再强制 process.exit()。
} else {
const startedAt = Date.now();
let heartbeat = setInterval(() => {
  const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  console.log(`【测试命令】${label}仍在运行，已用时 ${elapsed} 秒……`);
}, 10000);
heartbeat.unref?.();

const child = spawn(invocation.command, invocation.args, {
  cwd: invocation.cwd || PROJECT_ROOT,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false,
  env: {
    ...process.env,
    THINK_JEST_REPORT_FILE: reportFile,
    THINK_JEST_FAILURE_FILE: failureFile,
    THINK_JEST_STRUCTURED_FILE: structuredFile,
    THINK_TEST_LABEL: label,
    ...(argv.some((item) => String(item).includes('jest.performance.config.js')) ? { THINK_PERFORMANCE_METRICS_FILE: performanceMetricsFile } : {}),
  },
});

let raw = '';
let finished = false;
child.stdout?.on('data', (chunk) => { raw += chunk.toString(); });
child.stderr?.on('data', (chunk) => { raw += chunk.toString(); });

function stopHeartbeat() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
}

function saveHistory() {
  try { recordStructuredTestRun(structuredFile, { label }); } catch (error) {
    fs.appendFileSync(rawFile, `\n【历史记录内部错误】${String(error?.stack || error)}`);
  }
}

function savePerformanceHistory() {
  if (!argv.some((item) => String(item).includes('jest.performance.config.js'))) return;
  try { updatePerformanceHistory(performanceMetricsFile); } catch (error) {
    fs.appendFileSync(rawFile, `\n【性能历史内部错误】${String(error?.stack || error)}`);
  }
}

function showReport() {
  if (fs.existsSync(reportFile)) {
    const text = fs.readFileSync(reportFile, 'utf8').trim();
    if (text) console.log(text);
  }
}

function finish(code, message) {
  if (finished) return;
  finished = true;
  stopHeartbeat();
  if (message) console.error(message);
  // 不使用 process.exit() 强制结束：Windows 上快速失败时会截断尚未刷新的中文输出。
  // 设置 exitCode 后让 Node 自然退出，确保最终结论和日志位置一定显示。
  process.exitCode = code;
}

child.once('error', (error) => {
  try { fs.writeFileSync(rawFile, raw + `\n${String(error?.stack || error)}`); } catch {}
  showReport();
  saveHistory();
  savePerformanceHistory();
  console.error('【测试命令】无法启动 Jest。第三方技术错误已写入日志。');
  console.error(`【测试命令】技术日志：${path.relative(PROJECT_ROOT, rawFile)}`);
  finish(1);
});

child.once('close', (code, signal) => {
  if (finished) return;
  stopHeartbeat();
  try { fs.writeFileSync(rawFile, raw); } catch {}
  showReport();
  saveHistory();
  savePerformanceHistory();
  if (signal) {
    console.error(`【测试命令】被系统信号终止：${signal}`);
    console.error(`【测试命令】技术日志：${path.relative(PROJECT_ROOT, rawFile)}`);
    finish(1);
    return;
  }
  if (code === 0) {
    console.log(`【测试命令】${label}：通过`);
    finish(0);
    return;
  }
  console.error(`【测试命令】${label}：失败`);
  console.error(`【测试命令】第三方技术日志：${path.relative(PROJECT_ROOT, rawFile)}`);
  if (fs.existsSync(failureFile) && fs.statSync(failureFile).size > 0) {
    console.error(`【测试命令】失败技术日志：${path.relative(PROJECT_ROOT, failureFile)}`);
  }
  finish(code ?? 1);
});
}
