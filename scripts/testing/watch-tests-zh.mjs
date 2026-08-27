import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const runner = path.resolve('scripts/testing/run-jest-zh.mjs');
let running = false;
let rerun = false;
let timer = null;

function run() {
  if (running) { rerun = true; return; }
  running = true;
  console.log('\n【持续测试】检测到文件变化，开始重新执行测试。');
  const child = spawn(process.execPath, [runner, '--label', '持续测试', '--config', 'test/configs/jest.config.js', '--runInBand'], {
    stdio: 'inherit',
    shell: false,
  });
  child.on('exit', (code) => {
    console.log(`【持续测试】本轮${code === 0 ? '通过' : '失败'}。`);
    running = false;
    if (rerun) { rerun = false; run(); }
  });
  child.on('error', () => {
    console.error('【持续测试】无法启动测试运行器；请检查依赖是否完整安装。');
    running = false;
  });
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(run, 250);
}

console.log('【持续测试】已启动。修改 src/ 或 test/ 下的文件后会自动重新执行；按 Ctrl+C 退出。');
for (const dir of ['src', 'test']) {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) fs.watch(full, { recursive: true }, schedule);
}
run();
