#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import { wdioInvocation } from './process-launch.mjs';

console.log('【真机诊断】直接显示 WDIO / Obsidian 原始技术输出。');
console.log('【真机诊断】此命令只运行快速冒烟测试，用于判断下载、启动或驱动卡在哪一步。');
console.log('【真机诊断】部分第三方信息可能是英文，这是诊断模式的正常现象。\n');

const invocation = wdioInvocation(['run', './test/configs/wdio.conf.mts']);
if (!invocation.exists) {
  console.error('【真机诊断】没有找到 WDIO，请先运行 npm ci。');
  process.exitCode = 1;
} else {
  const child = spawn(invocation.command, invocation.args, {
    stdio: 'inherit',
    cwd: invocation.cwd,
    env: { ...process.env, THINK_E2E_SUITE: 'smoke' },
    shell: false,
  });
  child.on('error', (error) => {
    console.error(`【真机诊断】无法启动 WDIO：${String(error?.message || error)}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`【真机诊断】进程被系统终止：${signal}`);
      process.exitCode = 1;
      return;
    }
    if (code === 0) console.log('\n【真机诊断】快速冒烟测试通过。');
    else console.error(`\n【真机诊断】快速冒烟测试失败，退出码 ${code ?? 1}。`);
    process.exitCode = code ?? 1;
  });
}
