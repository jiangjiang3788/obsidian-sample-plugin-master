#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const problems = [];
const hasChinese = (text) => /[\u3400-\u9fff]/.test(text);
const hasProseEnglish = (text) => /\b[A-Za-z]{4,}\b/.test(text);
const allowedTechnical = /^(?:P[0-2]|E2E|UI|Jest|WebdriverIO|Obsidian|Think OS|DataStore|RecordIndex|Quick Input|Timer|Goal|Markdown|JSON|HTML|API|AI|Runtime|Vault|WDIO|CI|Task|Record|TaskSession|TaskSeries|GoalTemplate|Store|Repository|InputService|RecordRepository|TypeScript|TSX|MTS|JavaScript|MJS|CJS)(?:[\s/:._-].*)?$/i;

function problem(file, line, text) {
  problems.push(`${file}:${line}：${text.trim()}`);
}

function scanFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const isHumanOutput = /console\.(?:log|info|warn|error)\s*\(|timeoutMsg\s*:|throw new Error\s*\(/.test(line);
    if (!isHumanOutput) return;
    const literals = [...line.matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    for (const literal of literals) {
      if (literal.includes('${')) continue;
      if (!hasProseEnglish(literal)) continue;
      if (hasChinese(literal)) continue;
      // Fault-injection test inputs deliberately use the operating-system error message,
      // which is not user-facing copy and must not be counted as an i18n violation.
      if (rel.endsWith('githubDevUpdater.test.ts') && literal === 'disk full') continue;
      if (allowedTechnical.test(literal.trim())) continue;
      if (/^[A-Za-z0-9_./:@-]+$/.test(literal.trim())) continue; // 纯技术标识/路径
      problem(rel, index + 1, literal);
    }
  });
}

for (const rel of [
  'scripts/testing/test-system-report.mjs',
  'scripts/testing/check-test-ready-zh.mjs',
  'scripts/testing/run-jest-zh.mjs',
  'scripts/testing/run-jest-with-timeout.mjs',
  'scripts/testing/run-e2e-suite.mjs',
  'scripts/testing/run-e2e-with-build-zh.mjs',
  'scripts/testing/audit-ci-matrix.mjs',
  'scripts/testing/run-quality-checks-zh.mjs',
  'scripts/testing/history-utils.mjs',
  'scripts/testing/performance-history.mjs',
  'scripts/testing/run-stability-audit-zh.mjs',
  'scripts/testing/run-e2e-stability-zh.mjs',
  'scripts/testing/generate-quality-report.mjs',
  'scripts/testing/audit-result-governance.mjs',
  'scripts/testing/audit-fault-lab.mjs',
  'scripts/testing/generate-fault-lab-report.mjs',
  'scripts/testing/run-fault-lab-zh.mjs',
  'scripts/testing/run-obsidian-compat-matrix-zh.mjs',
  'scripts/testing/coverage-summary-zh.mjs',
  'scripts/testing/audit-test-evidence.mjs',
  'scripts/testing/audit-product-surface.mjs',
  'scripts/testing/audit-test-syntax.mjs',
  'test/configs/wdio.conf.mts',
]) scanFile(rel);

function scanTree(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { recursive: true })) {
    const rel = path.join(relativeDir, String(entry)).replace(/\\/g, '/');
    if (/\.(?:ts|tsx|mts|js|mjs|cjs)$/.test(rel)) scanFile(rel);
  }
}

for (const dir of ['test/unit', 'test/integration', 'test/performance', 'test/support']) scanTree(dir);

const specsDir = path.join(root, 'test/specs');
if (fs.existsSync(specsDir)) {
  for (const name of fs.readdirSync(specsDir, { recursive: true })) {
    const rel = path.join('test/specs', String(name)).replace(/\\/g, '/');
    if (rel.endsWith('.ts')) scanFile(rel);
  }
}

const jestConfig = fs.readFileSync(path.join(root, 'test/configs/jest.config.js'), 'utf8');
if (!jestConfig.includes('jest-reporter.zh-CN.cjs')) problems.push('Jest 未配置中文报告器。');
const coverageConfig = fs.readFileSync(path.join(root, 'test/configs/jest.coverage.config.js'), 'utf8');
if (coverageConfig.includes('text-summary')) problems.push('覆盖率仍启用了 Jest 英文 text-summary 输出。');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const testCommand = String(pkg.scripts?.test || '');
const runnerPath = path.join(root, 'scripts/testing/run-jest-with-timeout.mjs');
const selftestPath = path.join(root, 'scripts/testing/selftest-runner.mjs');
// Check the supported contract and self-test, not old implementation tokens.
// The former audit required PowerShell/spawnSync even after those paths proved
// unreliable on Windows 10; such checks must not block a better design.
if (!testCommand.includes('run-jest-with-timeout.mjs') || !fs.existsSync(runnerPath)) {
  problems.push('npm test 未配置全量 Jest 超时运行器。');
}
if (!fs.existsSync(selftestPath)) {
  problems.push('缺少测试运行器的独立验收脚本。');
}
if (!String(pkg.scripts?.pretest || '').includes('selftest-runner.mjs')) {
  problems.push('pretest 未验证运行器的通过、失败与超时行为。');
}
if (!String(pkg.scripts?.pretest || '').includes('check-test-ready-zh.mjs')) problems.push('npm test 缺少依赖准备检查。');
if (!String(pkg.scripts?.['test:smoke'] || '').includes('run-e2e-with-build-zh.mjs')) problems.push('真机冒烟测试缺少构建及日志包装层。');
for (const name of Object.keys(pkg.scripts || {})) {
  if (/[\u3400-\u9fff]/.test(name)) problems.push(`发现过时中文 npm 命令别名：${name}`);
}
console.log('\n【中文测试输出审计】');
if (problems.length) {
  console.error(`- 结果：失败，共 ${problems.length} 个问题`);
  for (const item of problems.slice(0, 80)) console.error(`  - ${item}`);
  if (problems.length > 80) console.error(`  - ……其余 ${problems.length - 80} 项请查看脚本输出。`);
  process.exit(1);
}
console.log('- npm test 日常入口：完整单元 + 组合，单文件超时 30 秒可跳过继续');
console.log('- Jest 汇总与失败标签：中文');
console.log('- 覆盖率汇总：中文');
console.log('- 真实 Obsidian E2E 公共输出：中文');
console.log('- 性能基线信息：中文');
console.log('- npm 入口：英文统一命名，输出说明保持中文');
console.log('- 结果：通过');
