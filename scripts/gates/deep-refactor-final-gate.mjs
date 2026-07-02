#!/usr/bin/env node
/**
 * deep-refactor-final-gate
 *
 * V31 seals the V26-V31 convergence pass. It verifies that the final docs,
 * prompt guardrails, budget baseline, and live architecture metrics all point
 * to the same locked maintenance boundary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReport } from '../audit/refactor-metrics.mjs';

const root = process.cwd();
const failures = [];

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function readText(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(full(relativePath), 'utf8');
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function requireIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label} must include ${snippet}`);
}

function requireBudget(budgets, key, expected) {
  if (budgets?.[key] !== expected) failures.push(`budget ${key}: ${budgets?.[key]} !== ${expected}`);
}

function requireLessOrEqual(label, current, ceiling) {
  if (current > ceiling) failures.push(`${label}: ${current} > ${ceiling}`);
}

function requireGreaterOrEqual(label, current, floor) {
  if (current < floor) failures.push(`${label}: ${current} < ${floor}`);
}

const packageJson = readJson('package.json');
const baseline = readJson('scripts/gates/refactor-budget-baseline.json');
const arch = readText('docs/ARCH_REFACTOR_REPORT.md');
const checklist = readText('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md');
const finalDoc = readText('docs/深度收敛-V31封版.md');
const promptDoc = readText('docs/开发防发散提示词.md');
const finalHandoff = readText('docs/最终封版说明.md');

const scripts = packageJson?.scripts ?? {};
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'deep-refactor-final:gate');
requireIncludes('package.json scripts.deep-refactor-final:gate', scripts['deep-refactor-final:gate'] ?? '', 'deep-refactor-final-gate.mjs');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'refactor:budget');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'refactor:release');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'schema:gate');

if (baseline?.version !== 'V31-deep-refactor-final-locked') failures.push(`baseline version is ${baseline?.version}`);
const budgets = baseline?.budgets ?? {};
requireBudget(budgets, 'largestFileLines', 480);
requireBudget(budgets, 'filesOver500Lines', 0);
requireBudget(budgets, 'nonCssFilesOver500Lines', 0);
requireBudget(budgets, 'tsLikeFilesOver450Lines', 0);
requireBudget(budgets, 'tsxFilesOver350Lines', 1);
requireBudget(budgets, 'largeFileCandidates', 3);
requireBudget(budgets, 'srcExplicitAny', 501);
requireBudget(budgets, 'coreRootPublicImporters', 0);
requireBudget(budgets, 'sharedRootPublicImporters', 0);
requireBudget(budgets, 'minimumCoreModulePublicFacades', 16);
requireBudget(budgets, 'minimumSharedModulePublicFacades', 8);

for (const snippet of ['V26', 'V27', 'V28', 'V29', 'V30', 'V31', '语义函数收敛', '类型债收敛', '预算 / gate / 文档封版']) {
  requireIncludes('docs/ARCH_REFACTOR_REPORT.md', arch, snippet);
}

for (const section of [
  'QuickInput 回归',
  'RecordInput 写入回归',
  'Settings / Layout / Theme 回归',
  'CSS / 视图回归',
  'AI / Retrieval 回归',
  '三端回归',
  'Public API / 类型预算回归',
  '发布命令',
  '当前版 schema 验收',
]) {
  requireIncludes('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md', checklist, section);
}
for (const snippet of ['V31', '501', 'deep-refactor-final:gate', 'npm run gate']) {
  requireIncludes('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md', checklist, snippet);
}

for (const snippet of ['V26', 'V31', '完成定义', '后续开发规则', '不要继续大拆']) {
  requireIncludes('docs/深度收敛-V31封版.md', finalDoc, snippet);
}
for (const snippet of ['ownership', '新增函数前', 'public facade', 'shared 不是业务垃圾桶', '单文件超过 300 行']) {
  requireIncludes('docs/开发防发散提示词.md', promptDoc, snippet);
}
for (const snippet of ['最终质量入口', '不再强拆', '完整本地验证', 'deep-refactor-final:gate']) {
  requireIncludes('docs/最终封版说明.md', finalHandoff, snippet);
}

const report = buildReport({ root });
const largestFile = report.fileHotspots.largestFiles[0];
requireLessOrEqual('largest file lines', largestFile?.lines ?? 0, budgets.largestFileLines);
requireLessOrEqual('files >= 500 lines', report.fileHotspots.filesOver500Lines, budgets.filesOver500Lines);
requireLessOrEqual('non-CSS files >= 500 lines', report.fileHotspots.nonCssFilesOver500Lines, budgets.nonCssFilesOver500Lines);
requireLessOrEqual('TS-like files >= 450 lines', report.fileHotspots.tsLikeFilesOver450Lines, budgets.tsLikeFilesOver450Lines);
requireLessOrEqual('TSX files >= 350 lines', report.fileHotspots.tsxFilesOver350Lines, budgets.tsxFilesOver350Lines);
requireLessOrEqual('large candidates', report.fileHotspots.largeFileCandidates.length, budgets.largeFileCandidates);
requireLessOrEqual('src explicit type debt', report.typeHealth.explicitAny, budgets.srcExplicitAny);
requireLessOrEqual('core root public importers', report.boundary.corePublic.imports.importers.length, budgets.coreRootPublicImporters);
requireLessOrEqual('shared root public importers', report.boundary.sharedPublic.imports.importers.length, budgets.sharedRootPublicImporters);
requireLessOrEqual('core deep imports', report.boundary.corePublic.deepImports.totalImports, budgets.coreDeepImports);
requireLessOrEqual('shared deep imports', report.boundary.sharedPublic.deepImports.totalImports, budgets.sharedDeepImports);
requireGreaterOrEqual('core module public facades', report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length, budgets.minimumCoreModulePublicFacades);
requireGreaterOrEqual('shared module public facades', report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length, budgets.minimumSharedModulePublicFacades);

console.log('[deep-refactor-final-gate] V31 final lock');
console.log(`- largest file: ${largestFile?.lines ?? 0}/${budgets.largestFileLines} ${largestFile?.file ?? ''}`);
console.log(`- large candidates: ${report.fileHotspots.largeFileCandidates.length}/${budgets.largeFileCandidates}`);
console.log(`- TS-like files >= 450 lines: ${report.fileHotspots.tsLikeFilesOver450Lines}/${budgets.tsLikeFilesOver450Lines}`);
console.log(`- TSX files >= 350 lines: ${report.fileHotspots.tsxFilesOver350Lines}/${budgets.tsxFilesOver350Lines}`);
console.log(`- src explicit type debt: ${report.typeHealth.explicitAny}/${budgets.srcExplicitAny}`);
console.log(`- root public importers: core ${report.boundary.corePublic.imports.importers.length}/0, shared ${report.boundary.sharedPublic.imports.importers.length}/0`);

if (failures.length > 0) {
  console.error('\n[deep-refactor-final-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[deep-refactor-final-gate] ok: V26-V31 convergence is sealed by docs, prompts and locked budgets.');
