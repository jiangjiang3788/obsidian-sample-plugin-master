#!/usr/bin/env node
/**
 * refactor-release-gate
 *
 * V31 keeps the V25 folder/schema release pass intact while checking that the final
 * deep-refactor locked budgets, module-public boundary rules, prompt guardrails,
 * and manual regression checklist stay present.
 * It intentionally does not replace typecheck/build; it makes the release
 * acceptance surface explicit and hard to accidentally delete.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReport } from '../audit/refactor-metrics.mjs';

const root = process.cwd();
const failures = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireIncludes(label, value, needle) {
  if (!value.includes(needle)) failures.push(`${label} does not include ${needle}`);
}

function requireBudget(budgets, key, expected) {
  if (!budgets || budgets[key] !== expected) failures.push(`budget ${key}: ${budgets?.[key]} !== ${expected}`);
}

const packageJson = readJson('package.json');
const budgetJson = readJson('scripts/gates/refactor-budget-baseline.json');
const checklist = readText('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md');
const mvp = readText('docs/MVP_ACCEPTANCE.md');
const arch = readText('docs/ARCH_REFACTOR_REPORT.md');
const budgetGate = readText('scripts/gates/refactor-budget-gate.mjs');
const anyGate = readText('scripts/gates/any-budget-gate.mjs');

const scripts = packageJson?.scripts ?? {};
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'refactor:budget');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'refactor:release');
requireIncludes('package.json scripts.refactor:verify', scripts['refactor:verify'] ?? '', 'refactor:release');
requireIncludes('package.json scripts.refactor:release', scripts['refactor:release'] ?? '', 'refactor-release-gate.mjs');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'deep-refactor-final:gate');
requireIncludes('package.json scripts.deep-refactor-final:gate', scripts['deep-refactor-final:gate'] ?? '', 'deep-refactor-final-gate.mjs');
requireIncludes('package.json scripts.gate', scripts.gate ?? '', 'schema:gate');
requireIncludes('package.json scripts.refactor:verify', scripts['refactor:verify'] ?? '', 'schema:gate');

const budgets = budgetJson?.budgets;
if (budgetJson?.version !== 'V31-deep-refactor-final-locked') failures.push(`refactor budget version is ${budgetJson?.version}`);
requireBudget(budgets, 'filesOver500Lines', 0);
requireBudget(budgets, 'nonCssFilesOver500Lines', 0);
requireBudget(budgets, 'coreRootPublicImporters', 0);
requireBudget(budgets, 'sharedRootPublicImporters', 0);
requireBudget(budgets, 'srcExplicitAny', 501);
requireBudget(budgets, 'tsLikeFilesOver450Lines', 0);
requireBudget(budgets, 'tsxFilesOver350Lines', 1);
requireBudget(budgets, 'largeFileCandidates', 3);
requireBudget(budgets, 'minimumCoreModulePublicFacades', 16);
requireBudget(budgets, 'minimumSharedModulePublicFacades', 8);

for (const requiredSection of [
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
  requireIncludes('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md', checklist, requiredSection);
}

for (const requiredText of [
  '第二轮深度改造封版验收',
  '第三轮目录重排与当前 schema 封版验收',
  'npm run refactor:verify',
  'npm run gate',
  'npm run typecheck',
  'npm run build',
]) {
  requireIncludes('docs/MVP_ACCEPTANCE.md', mvp, requiredText);
}

requireIncludes('docs/ARCH_REFACTOR_REPORT.md', arch, '## 25. V25 当前版 schema 锁定与目录封版');
requireIncludes('docs/ARCH_REFACTOR_REPORT.md', arch, '## 31. V31 预算 / gate / 文档封版');
requireIncludes('scripts/gates/refactor-budget-gate.mjs', budgetGate, 'V31');
requireIncludes('scripts/gates/any-budget-gate.mjs', anyGate, 'V31');

const report = buildReport({ root });
if (report.fileHotspots.filesOver500Lines !== 0) failures.push(`files >= 500 lines: ${report.fileHotspots.filesOver500Lines} !== 0`);
if (report.fileHotspots.nonCssFilesOver500Lines !== 0) failures.push(`non-CSS files >= 500 lines: ${report.fileHotspots.nonCssFilesOver500Lines} !== 0`);
if (report.boundary.corePublic.imports.importers.length !== 0) failures.push(`@core/public importers: ${report.boundary.corePublic.imports.importers.length} !== 0`);
if (report.boundary.sharedPublic.imports.importers.length !== 0) failures.push(`@shared/public importers: ${report.boundary.sharedPublic.imports.importers.length} !== 0`);
if (report.typeHealth.explicitAny > 501) failures.push(`src explicit any: ${report.typeHealth.explicitAny} > 501`);

console.log('[refactor-release-gate] V31 release acceptance');
console.log(`- files >= 500 lines: ${report.fileHotspots.filesOver500Lines}/0`);
console.log(`- non-CSS files >= 500 lines: ${report.fileHotspots.nonCssFilesOver500Lines}/0`);
console.log(`- src explicit any: ${report.typeHealth.explicitAny}/501`);
console.log(`- root public importers: core ${report.boundary.corePublic.imports.importers.length}/0, shared ${report.boundary.sharedPublic.imports.importers.length}/0`);
console.log(`- module public facades: core ${report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/16, shared ${report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/8`);

if (failures.length > 0) {
  console.error('\n[refactor-release-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[refactor-release-gate] ok: V25 folder/schema release checklist and V31 deep-refactor final budget are present.');
