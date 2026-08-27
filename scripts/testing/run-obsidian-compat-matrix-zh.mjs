#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';

const matrix = String(process.env.THINK_OBSIDIAN_COMPAT_VERSIONS || 'earliest/earliest latest/latest').trim();
if (!matrix) {
  console.error('【兼容矩阵】没有配置 Obsidian 版本矩阵。');
  process.exit(2);
}

console.log(`\n【兼容矩阵】将验证：${matrix}`);
console.log('【兼容矩阵】默认同时检查插件声明支持的最早版本与最新版本；可用 THINK_OBSIDIAN_COMPAT_VERSIONS 覆盖。');
const runner = path.resolve('scripts', 'testing', 'run-e2e-with-build-zh.mjs');
const child = spawn(process.execPath, [runner, 'compat'], {
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, OBSIDIAN_VERSIONS: matrix },
});
child.on('error', () => {
  console.error('【兼容矩阵】无法启动兼容测试运行层。');
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error('【兼容矩阵】测试进程被系统终止。');
    process.exit(1);
  }
  process.exit(code ?? 1);
});
