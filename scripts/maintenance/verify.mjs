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
    // Full/CI verification checks source, unit/integration test fixtures, and E2E typings.
    ['npm', ['run', 'typecheck']],
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
  console.log('\n[verify] OK');
} catch (error) {
  console.error(`\n${error?.message || error}`);
  process.exit(1);
}
