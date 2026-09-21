import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const required = [
  'node_modules/typescript/bin/tsc',
  'node_modules/jest/bin/jest.js',
  'node_modules/vite/bin/vite.js',
];
const missing = required.filter((path) => !fs.existsSync(path));
if (missing.length) {
  console.error('❌ 连续记录验证无法开始：当前项目依赖未就绪。');
  console.error('缺少：');
  for (const path of missing) console.error(`  - ${path}`);
  console.error('本命令不会执行 npm ci / npm install；请使用你现有的项目依赖环境后重试。');
  process.exit(2);
}

function run(label, command, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\n❌ ${label} 失败`);
    process.exit(result.status || 1);
  }
  console.log(`✅ ${label}`);
}

run('TypeScript', 'npm', ['--silent', 'run', 'typecheck:src']);
run('连续记录单元测试', 'node', [
  './node_modules/jest/bin/jest.js', '--config', './test/configs/jest.unit.config.js', '--runInBand', '--runTestsByPath',
  'test/unit/createAvailableRecordTypes.test.ts',
  'test/unit/taskCompletionContinuation.test.ts',
  'test/unit/followUpCreateAction.test.ts',
  'test/unit/quickInputContinuationPanel.test.tsx',
  'test/unit/recordTypePresentation.test.ts',
]);
run('连续记录组合测试', 'node', [
  './node_modules/jest/bin/jest.js', '--config', './test/configs/jest.integration.config.js', '--runInBand', '--runTestsByPath',
  'test/integration/recordInputTaskCompletionFollowUp.test.ts',
]);
run('架构边界', 'npm', ['--silent', 'run', 'gate:architecture']);
run('Record 边界', 'npm', ['--silent', 'run', 'gate:records']);
run('Task Session 边界', 'npm', ['--silent', 'run', 'gate:task-session']);
run('精力边界', 'npm', ['--silent', 'run', 'gate:energy']);
run('工程质量', 'npm', ['--silent', 'run', 'gate:quality']);
run('生产构建', 'npm', ['--silent', 'run', 'build']);

console.log('\n✅ 连续记录专项验证全部通过');
