#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const suite = String(process.argv[2] || 'all').trim().toLowerCase();
const supported = new Set(['smoke', 'p0', 'p1', 'p2', 'ui', 'runtime', 'ai', 'scale', 'compat', 'all']);
if (!supported.has(suite)) {
  console.error(`【真机测试】未知测试套件：${suite}。可选：${Array.from(supported).join('、')}`);
  process.exit(2);
}

const reportDir = path.resolve('reports', 'testing');
fs.mkdirSync(reportDir, { recursive: true });
const buildLogPath = path.join(reportDir, `e2e-${suite}-构建技术日志.txt`);
import { npmInvocation } from './process-launch.mjs';

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, ...options });
    let raw = '';
    child.stdout?.on('data', (chunk) => { raw += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { raw += chunk.toString(); });
    child.on('error', (error) => resolve({ code: 1, raw: raw + `\n${String(error?.stack || error)}`, spawnError: true }));
    child.on('exit', (code, signal) => resolve({ code: signal ? 1 : (code ?? 1), raw, signal }));
  });
}

console.log('\n【真机测试】正在构建当前源码，构建工具的英文技术日志不会直接显示在终端。');
const npmBuild = npmInvocation(['--silent', 'run', 'build:debug']);
const build = await run(npmBuild.command, npmBuild.args, { stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
fs.writeFileSync(buildLogPath, build.raw);
if (build.code !== 0) {
  console.error('【真机测试】构建失败，未启动 Obsidian。');
  console.error(`【真机测试】构建技术日志：${path.relative(process.cwd(), buildLogPath)}`);
  process.exit(build.code);
}
console.log('【真机测试】当前源码构建完成。');

const runner = path.resolve('scripts', 'testing', 'run-e2e-suite.mjs');
const child = spawn(process.execPath, [runner, suite], { stdio: 'inherit', env: process.env, shell: false });
child.on('error', () => {
  console.error('【真机测试】无法启动中文真机测试运行层。');
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error('【真机测试】测试进程被系统终止。');
    process.exit(1);
  }
  process.exit(code ?? 1);
});
