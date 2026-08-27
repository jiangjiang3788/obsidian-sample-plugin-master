#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const JEST_ENTRY = path.join(PROJECT_ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

function runNode(entry, args = [], extraEnv = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

console.log('\n【故障实验室】开始执行可重复异常场景。');
if (!fs.existsSync(JEST_ENTRY)) {
  console.error('【故障实验室】没有找到 Jest，请先运行 npm ci。');
  process.exitCode = 1;
} else {
  let failed = false;
  if (runNode(path.join(PROJECT_ROOT, 'scripts/testing/audit-fault-lab.mjs')) !== 0) {
    console.error('【故障实验室】静态审计失败，停止执行测试。');
    process.exitCode = 1;
  } else {
    const coreFiles = [
      'test/integration/faultLabMarkdownIntegrity.test.ts',
      'test/integration/faultLabTransactionRecovery.test.ts',
      'test/integration/faultLabAiFailures.test.ts',
      'test/integration/dataStoreRestartRecovery.test.ts',
      'test/unit/chatSessionStore.test.ts',
      'test/integration/migrationBackupSafety.test.ts',
    ];

    const reportDir = path.join(PROJECT_ROOT, 'reports', 'testing');
    fs.mkdirSync(reportDir, { recursive: true });

    console.log('【故障实验室】1/2 核心故障场景……');
    if (runNode(JEST_ENTRY, [
      '--config', './test/configs/jest.config.js',
      '--runInBand',
      '--runTestsByPath',
      ...coreFiles,
    ], {
      THINK_TEST_LABEL: '故障实验室核心测试',
      THINK_JEST_STRUCTURED_FILE: path.join(reportDir, '故障实验室核心测试-结构化结果.json'),
      THINK_JEST_FAILURE_FILE: path.join(reportDir, '故障实验室核心测试-失败技术日志.txt'),
    }) !== 0) failed = true;

    console.log('【故障实验室】2/2 超大数据场景……');
    if (runNode(JEST_ENTRY, [
      '--config', './test/configs/jest.performance.config.js',
      '--runInBand',
      '--runTestsByPath',
      'test/performance/faultLabOversizedData.test.ts',
    ], {
      THINK_TEST_LABEL: '故障实验室规模测试',
      THINK_JEST_STRUCTURED_FILE: path.join(reportDir, '故障实验室规模测试-结构化结果.json'),
      THINK_JEST_FAILURE_FILE: path.join(reportDir, '故障实验室规模测试-失败技术日志.txt'),
      THINK_PERFORMANCE_METRICS_FILE: path.join(reportDir, 'performance-latest.jsonl'),
    }) !== 0) failed = true;

    runNode(path.join(PROJECT_ROOT, 'scripts/testing/generate-fault-lab-report.mjs'));
    if (failed) {
      console.error('【故障实验室】存在失败场景。');
      process.exitCode = 1;
    } else {
      console.log('【故障实验室】全部自动化场景通过。');
    }
  }
}
