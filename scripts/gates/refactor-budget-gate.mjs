#!/usr/bin/env node
/**
 * refactor-budget-gate
 *
 * V19 closes the second-round deep-refactor by keeping large files, root public imports, module public facades, and lowered explicit-any debt under a mandatory locked budget.
 *
 * V7 used this gate as a no-regression baseline while code was moving. V13-V18
 * lowered the budgets as the codebase was split, public facades were migrated,
 * and explicit any was reduced. V19 treats those gains as the release floor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReport } from '../audit/refactor-metrics.mjs';

const root = process.cwd();
const baselinePath = path.join(root, 'scripts/gates/refactor-budget-baseline.json');

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    console.error('[refactor-budget-gate] missing scripts/gates/refactor-budget-baseline.json');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

function checkLessOrEqual(failures, label, current, budget) {
  if (typeof budget !== 'number') return;
  if (current > budget) failures.push(`${label}: ${current} > ${budget}`);
}

function checkGreaterOrEqual(failures, label, current, budget) {
  if (typeof budget !== 'number') return;
  if (current < budget) failures.push(`${label}: ${current} < ${budget}`);
}

const baseline = readBaseline();
const budgets = baseline.budgets ?? {};
const report = buildReport({ root });
const largestFile = report.fileHotspots.largestFiles[0];
const failures = [];

checkLessOrEqual(failures, 'largest file lines', largestFile?.lines ?? 0, budgets.largestFileLines);
checkLessOrEqual(failures, 'files >= 500 lines', report.fileHotspots.filesOver500Lines, budgets.filesOver500Lines);
checkLessOrEqual(failures, 'non-CSS files >= 500 lines', report.fileHotspots.nonCssFilesOver500Lines, budgets.nonCssFilesOver500Lines);
checkLessOrEqual(failures, 'TS-like files >= 450 lines', report.fileHotspots.tsLikeFilesOver450Lines, budgets.tsLikeFilesOver450Lines);
checkLessOrEqual(failures, 'TSX files >= 350 lines', report.fileHotspots.tsxFilesOver350Lines, budgets.tsxFilesOver350Lines);
checkLessOrEqual(failures, 'large file candidates', report.fileHotspots.largeFileCandidates.length, budgets.largeFileCandidates);
checkLessOrEqual(failures, 'src explicit any', report.typeHealth.explicitAny, budgets.srcExplicitAny);
checkLessOrEqual(failures, 'core/public named exports', report.boundary.corePublic.exports.count, budgets.corePublicNamedExports);
checkLessOrEqual(failures, 'core/public export-star count', report.boundary.corePublic.exports.starExports, budgets.corePublicStarExports);
checkLessOrEqual(failures, 'shared/public named exports', report.boundary.sharedPublic.exports.count, budgets.sharedPublicNamedExports);
checkLessOrEqual(failures, 'shared/public export-star count', report.boundary.sharedPublic.exports.starExports, budgets.sharedPublicStarExports);
checkLessOrEqual(failures, '@core/public importing files', report.boundary.corePublic.imports.importers.length, budgets.coreRootPublicImporters);
checkLessOrEqual(failures, '@core/public import statements', report.boundary.corePublic.imports.totalImports, budgets.coreRootPublicImportStatements);
checkLessOrEqual(failures, '@shared/public importing files', report.boundary.sharedPublic.imports.importers.length, budgets.sharedRootPublicImporters);
checkLessOrEqual(failures, '@shared/public import statements', report.boundary.sharedPublic.imports.totalImports, budgets.sharedRootPublicImportStatements);
checkLessOrEqual(failures, 'duplicate function-name groups', report.duplicateFunctionNames.length, budgets.duplicateFunctionNameGroups);
checkLessOrEqual(failures, 'core deep imports', report.boundary.corePublic.deepImports.totalImports, budgets.coreDeepImports);
checkLessOrEqual(failures, 'shared deep imports', report.boundary.sharedPublic.deepImports.totalImports, budgets.sharedDeepImports);
checkGreaterOrEqual(failures, 'core module public facades', report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length, budgets.minimumCoreModulePublicFacades);
checkGreaterOrEqual(failures, 'shared module public facades', report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length, budgets.minimumSharedModulePublicFacades);

console.log('[refactor-budget-gate] V19 locked refactor budget');
console.log(`- largest file: ${largestFile?.lines ?? 0}/${budgets.largestFileLines} ${largestFile?.file ?? ''}`);
console.log(`- files >= 500 lines: ${report.fileHotspots.filesOver500Lines}/${budgets.filesOver500Lines}`);
console.log(`- non-CSS files >= 500 lines: ${report.fileHotspots.nonCssFilesOver500Lines}/${budgets.nonCssFilesOver500Lines}`);
console.log(`- TS-like files >= 450 lines: ${report.fileHotspots.tsLikeFilesOver450Lines}/${budgets.tsLikeFilesOver450Lines}`);
console.log(`- TSX files >= 350 lines: ${report.fileHotspots.tsxFilesOver350Lines}/${budgets.tsxFilesOver350Lines}`);
console.log(`- large candidates: ${report.fileHotspots.largeFileCandidates.length}/${budgets.largeFileCandidates}`);
console.log(`- src explicit any: ${report.typeHealth.explicitAny}/${budgets.srcExplicitAny}`);
console.log(`- core/public named exports: ${report.boundary.corePublic.exports.count}/${budgets.corePublicNamedExports}`);
console.log(`- core/public export*: ${report.boundary.corePublic.exports.starExports}/${budgets.corePublicStarExports}`);
console.log(`- shared/public named exports: ${report.boundary.sharedPublic.exports.count}/${budgets.sharedPublicNamedExports}`);
console.log(`- shared/public export*: ${report.boundary.sharedPublic.exports.starExports}/${budgets.sharedPublicStarExports}`);
console.log(`- root public importers: core ${report.boundary.corePublic.imports.importers.length}/${budgets.coreRootPublicImporters}, shared ${report.boundary.sharedPublic.imports.importers.length}/${budgets.sharedRootPublicImporters}`);
console.log(`- root public import statements: core ${report.boundary.corePublic.imports.totalImports}/${budgets.coreRootPublicImportStatements}, shared ${report.boundary.sharedPublic.imports.totalImports}/${budgets.sharedRootPublicImportStatements}`);
console.log(`- duplicate function-name groups: ${report.duplicateFunctionNames.length}/${budgets.duplicateFunctionNameGroups}`);
console.log(`- core/shared deep imports: ${report.boundary.corePublic.deepImports.totalImports}/${budgets.coreDeepImports}, ${report.boundary.sharedPublic.deepImports.totalImports}/${budgets.sharedDeepImports}`);
console.log(`- module public facades: core ${report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/${budgets.minimumCoreModulePublicFacades}, shared ${report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/${budgets.minimumSharedModulePublicFacades}`);

if (failures.length > 0) {
  console.error('\n[refactor-budget-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[refactor-budget-gate] ok: deep-refactor surface is within the V19 locked budget.');
