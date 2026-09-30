#!/usr/bin/env node
/** Cross-platform, fail-closed acceptance runner. Never points at a personal vault. */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, npmInvocation } from './process-launch.mjs';
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));
if ([...args].some((a) => !['--full', '--help'].includes(a))) {
  console.error('用法: npm run verify:restart-timeline [-- --full]'); process.exit(2);
}
if (args.has('--help')) {
  console.log('默认：三个时区的源码故障回归 + 上轮自然语言回归 + 源码/测试语法 + 新纯模块严格类型检查。');
  console.log('--full：再执行全项目类型检查、全部 Jest 单元/组合测试、构建和隔离仓库 Obsidian E2E。');
  console.log('缺依赖、未跑、失败均不会显示完整通过。手机真机、真实模型和同步服务仍需人工验收。');
  process.exit(0);
}
const full = args.has('--full');
const folder = path.join(PROJECT_ROOT, 'reports/testing/restart-timeline');
fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), mode: full ? 'full' : 'source', steps: [],
  manualPending: ['物理手机/电脑、浅色/深色主题、实际分屏高度与触摸可读性', '真实 AI 返回及保存后重启的业务结果', '实际同步服务、系统强退与原故障现场恢复'],
  scopeNote: 'SOURCE_PASS 不是发布验收。AUTOMATED_PASS 也不代表人工验收完成。无任何个人仓库写入。' };
report.status = 'RUNNING';
const flush = () => fs.writeFileSync(path.join(folder, 'latest.json'), JSON.stringify(report, null, 2));
flush();
function blocked(id, reason) {
  report.steps.push({ id, status: 'BLOCKED', reason }); console.log(`BLOCKED ${id}: ${reason}`); flush();
}
function run(id, command, argv, env = {}) {
  console.log(`RUN ${id}`);
  const result = spawnSync(command, argv, { cwd: PROJECT_ROOT, env: { ...process.env, ...env },
    encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024 });
  const log = path.join(folder, `${id}.log`);
  fs.writeFileSync(log, (result.stdout || '') + (result.stderr || '') + (result.error ? `\n${String(result.error)}` : ''));
  const status = result.status === 0 && !result.error ? 'PASS' : 'FAIL';
  report.steps.push({ id, status, exitCode: result.status, signal: result.signal, log: path.relative(PROJECT_ROOT, log) });
  console.log(`${status} ${id} — ${path.relative(PROJECT_ROOT, log)}`); flush();
  return status === 'PASS';
}
let typescriptEntry;
try { typescriptEntry = process.env.TYPESCRIPT_PATH || require.resolve('typescript', { paths: [PROJECT_ROOT] }); }
catch { blocked('source-toolchain', '未找到 TypeScript。先运行 npm ci；不能将未执行当成通过。'); }
if (typescriptEntry) {
  const tsFolder = fs.statSync(typescriptEntry).isDirectory() ? typescriptEntry : path.dirname(path.dirname(typescriptEntry));
  const env = { TYPESCRIPT_PATH: typescriptEntry, NODE_ENV: 'test' };
  for (const [name, zone] of [['shanghai', 'Asia/Shanghai'], ['utc', 'UTC'], ['los-angeles', 'America/Los_Angeles']]) {
    run(`source-fault-${name}`, process.execPath, ['scripts/testing/restart-timeline/regression.cjs', PROJECT_ROOT, path.join(folder, `source-fault-${name}.json`)], { ...env, TZ: zone });
    run(`source-language-${name}`, process.execPath, ['scripts/testing/restart-timeline/previous-regression.cjs', PROJECT_ROOT, path.join(folder, `source-language-${name}.json`)], { ...env, TZ: zone });
  }
  run('source-syntax', process.execPath, ['scripts/testing/restart-timeline/previous-syntax-check.cjs', PROJECT_ROOT], env);
  run('test-syntax', process.execPath, ['scripts/testing/restart-timeline/test-syntax.cjs', PROJECT_ROOT], env);
  const tsc = path.join(tsFolder, 'bin', 'tsc');
  if (fs.existsSync(tsc)) run('pure-strict-types', process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'commonjs',
    'src/core/storage/SerialTaskQueue.ts', 'src/core/storage/DurableSnapshot.ts', 'src/core/storage/DurableJsonStore.ts',
    'src/core/utils/timelineScale.ts', 'src/core/recordInput/RecordDraftTimeline.ts']);
  else blocked('pure-strict-types', 'TypeScript CLI 未找到');
}
run('read-only-diagnostic-tests', process.execPath, ['scripts/testing/restart-timeline/diagnostic.test.cjs']);
if (full) {
  const required = ['node_modules/typescript/bin/tsc', 'node_modules/jest/bin/jest.js', 'node_modules/preact/package.json',
    'node_modules/immer/package.json', 'node_modules/tsyringe/package.json', 'node_modules/zod/package.json',
    'node_modules/obsidian/package.json', 'node_modules/vite/bin/vite.js', 'node_modules/@wdio/cli/bin/wdio.js'];
  const missing = required.filter((file) => !fs.existsSync(path.join(PROJECT_ROOT, file)));
  if (missing.length) {
    for (const id of ['project-types', 'jest-all', 'plugin-build', 'obsidian-e2e']) blocked(id, `依赖未安装：${missing.join(', ')}。运行 npm ci。`);
  } else {
    const npm = npmInvocation([]);
    const runNpm = (id, script) => run(id, npm.command, [...npm.args, 'run', script]);
    const types = runNpm('project-types', 'typecheck');
    const jest = runNpm('jest-all', 'test');
    const build = runNpm('plugin-build', 'build:debug');
    if (build) {
      report.buildArtifacts = ['main.js', 'styles.css', 'manifest.json'].filter((file) => fs.existsSync(path.join(PROJECT_ROOT, file)))
        .map((file) => { const bytes = fs.readFileSync(path.join(PROJECT_ROOT, file)); return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; });
      flush();
    }
    if (types && jest && build) {
      // Existing all-suite supplies a local AI fixture and a dedicated vault under test/vaults/simple.
      run('obsidian-e2e', process.execPath, ['scripts/testing/run-e2e-suite.mjs', 'all'], { THINK_E2E_AI_ENDPOINT: '' });
    } else blocked('obsidian-e2e', '前置类型、Jest 或构建失败；禁止用旧 main.js 冒充本轮构建继续验收。');
  }
}
report.finishedAt = new Date().toISOString();
report.status = report.steps.some((s) => s.status === 'FAIL') ? 'FAIL'
  : report.steps.some((s) => s.status === 'BLOCKED') ? 'BLOCKED' : full ? 'AUTOMATED_PASS' : 'SOURCE_PASS';
fs.writeFileSync(path.join(folder, 'latest.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.status}: reports/testing/restart-timeline/latest.json`);
console.log('人工验收仍包括：手机/电脑真实显示、真实模型输出、同步与实际故障恢复。');
process.exitCode = report.status === 'FAIL' ? 1 : report.status === 'BLOCKED' ? 2 : 0;
