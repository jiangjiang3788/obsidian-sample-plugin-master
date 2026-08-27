#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { npmInvocation } from './process-launch.mjs';
const reportDir = path.resolve('reports', 'testing');
fs.mkdirSync(reportDir, { recursive: true });

const steps = [
  ['类型检查', 'typecheck'],
  ['工程与架构门禁', 'gate'],
  ['当前源码构建', 'build'],
];

function runNpmScript(label, script) {
  return new Promise((resolve) => {
    const log = path.join(reportDir, `v8-${script.replace(/[^a-z0-9_-]+/gi, '-')}-技术日志.txt`);
    const invocation = npmInvocation(['--silent', 'run', script]);
    const child = spawn(invocation.command, invocation.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: process.env,
    });
    let raw = '';
    child.stdout?.on('data', (chunk) => { raw += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { raw += chunk.toString(); });
    child.on('error', (error) => {
      raw += `\n${String(error?.stack || error)}`;
      fs.writeFileSync(log, raw);
      resolve({ ok: false, label, log });
    });
    child.on('exit', (code, signal) => {
      fs.writeFileSync(log, raw);
      resolve({ ok: !signal && code === 0, label, log });
    });
  });
}

console.log('\n【工程质量检查】开始执行 v8 非测试工程门禁；第三方英文技术输出只写入日志。');
for (const [label, script] of steps) {
  const result = await runNpmScript(label, script);
  if (!result.ok) {
    console.error(`【工程质量检查】失败：${label}`);
    console.error(`【工程质量检查】技术日志：${path.relative(process.cwd(), result.log)}`);
    process.exit(1);
  }
  console.log(`【工程质量检查】通过：${label}`);
}
console.log('【工程质量检查】全部通过');
