#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const files = [
  'test/unit/layoutEditorControlsUi.test.tsx',
  'test/integration/layoutEditorLifecycle.test.ts',
  'test/integration/moduleSettingsLifecycle.test.ts',
  'test/integration/energyViewTaskFlow.test.ts',
  'test/integration/aiBatchConfirmActionFlow.test.tsx',
  'test/integration/aiNaturalInputCommandFlow.test.ts',
];

console.log(`【P1 v6 专项】准备执行 ${files.length} 个新增单元/组合测试文件。`);
const runner = path.resolve('scripts', 'testing', 'run-jest-zh.mjs');
const child = spawn(process.execPath, [
  runner,
  '--label', 'P1 v6 新增专项测试',
  '--config', 'test/configs/jest.config.js',
  '--runInBand',
  '--runTestsByPath',
  ...files,
], { stdio: 'inherit', shell: false, env: process.env });
child.on('error', () => {
  console.error('【P1 v6 专项】无法启动中文 Jest 运行层。');
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error('【P1 v6 专项】测试进程被系统终止。');
    process.exit(1);
  }
  process.exit(code ?? 1);
});
