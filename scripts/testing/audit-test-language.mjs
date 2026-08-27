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
      if (allowedTechnical.test(literal.trim())) continue;
      if (/^[A-Za-z0-9_./:@-]+$/.test(literal.trim())) continue; // 纯技术标识/路径
      problem(rel, index + 1, literal);
    }
  });
}

for (const rel of [
  'scripts/testing/test-system-report.mjs',
  'scripts/testing/run-jest-zh.mjs',
  'scripts/testing/run-e2e-suite.mjs',
  'scripts/testing/run-e2e-with-build-zh.mjs',
  'scripts/testing/run-v5-p1-zh.mjs',
  'scripts/testing/run-v6-p1-zh.mjs',
  'scripts/testing/run-v7-p2-zh.mjs',
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
  'scripts/testing/watch-tests-zh.mjs',
  'scripts/testing/sync-test-evidence.mjs',
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
for (const key of ['测试', '测试:单元', '测试:组合', '测试:覆盖率', '测试:性能', '测试:语法', '测试:体系', '测试:真机', '测试:结果治理', '测试:故障实验室:审计', '测试:故障实验室', '测试:故障实验室:报告', '测试:稳定性', '测试:质量报告']) {
  if (!pkg.scripts?.[key]) problems.push(`缺少中文测试命令：${key}`);
}

for (const [name, command] of Object.entries(pkg.scripts || {})) {
  if ((name === 'test:e2e' || name.startsWith('test:e2e:') || name === '测试:真机' || name.startsWith('测试:真机:'))
      && String(command).includes('build:debug')
      && !String(command).includes('run-e2e-with-build-zh.mjs')) {
    problems.push(`真机测试命令直接暴露构建工具输出：${name}`);
  }
}

for (const [name, command] of Object.entries(pkg.scripts || {})) {
  if ((name === 'test' || name.startsWith('test:') || name === '测试' || name.startsWith('测试:'))
      && /(^|\s)jest(?:\s|$)/.test(String(command))
      && !String(command).includes('run-jest-zh.mjs')) {
    problems.push(`测试命令绕过中文 Jest 运行层：${name}`);
  }
}

console.log('\n【中文测试输出审计】');
if (problems.length) {
  console.error(`- 结果：失败，共 ${problems.length} 个问题`);
  for (const item of problems.slice(0, 80)) console.error(`  - ${item}`);
  if (problems.length > 80) console.error(`  - ……其余 ${problems.length - 80} 项请查看脚本输出。`);
  process.exit(1);
}
console.log('- Jest 汇总与失败标签：中文');
console.log('- 覆盖率汇总：中文');
console.log('- 真实 Obsidian E2E 公共输出：中文');
console.log('- 性能基线信息：中文');
console.log('- 测试体系报告命令：中文');
console.log('- 结果：通过');
