#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const isFast = args.has('--fast');
const isCi = args.has('--ci');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commandSets = {
  fast: [
    ['npm', ['run', 'typecheck:src']],
    ['npm', ['run', 'gate']],
    ['npm', ['run', 'test:unit']],
  ],
  full: [
    ['npm', ['run', 'docs:index']],
    ['npm', ['run', 'typecheck:src']],
    ['npm', ['run', 'gate']],
    ['npm', ['run', 'test:unit']],
    ['npm', ['run', 'test:integration']],
    ['npm', ['run', 'build']],
  ],
};

const steps = isFast ? commandSets.fast : commandSets.full;

function run(cmd, cmdArgs) {
  const printable = `${cmd} ${cmdArgs.join(' ')}`;
  console.log(`\n[verify] ${printable}`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd === 'npm' ? npmCmd : cmd, cmdArgs, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[verify] failed: ${printable} exited with ${code}`));
    });
  });
}

try {
  console.log(`[verify] mode=${isFast ? 'fast' : isCi ? 'ci' : 'full'}`);
  for (const [cmd, cmdArgs] of steps) {
    await run(cmd, cmdArgs);
  }
  if (isCi) {
    await run('git', ['diff', '--exit-code', '--', '文档/_资源/搜索索引.js', '文档/_资源/页面内容索引.js']);
  }
  console.log('\n[verify] OK');
} catch (error) {
  console.error(`\n${error?.message || error}`);
  process.exit(1);
}
