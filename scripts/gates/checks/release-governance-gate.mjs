#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildReport } from '../../audit/refactor-metrics.mjs';
const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root,file)) ? fs.readFileSync(path.join(root,file),'utf8') : '';
const json = (file) => JSON.parse(read(file) || '{}');
const pkg = json('package.json');
const baseline = json('scripts/gates/refactor-budget-baseline.json');
for (const name of ['gate:product','gate:architecture','gate:records','gate:task-session','gate:energy','gate:ui-runtime','gate:quality','gate:stability']) {
  if (!pkg.scripts?.[name]) failures.push(`missing aggregate ${name}`);
  if (!pkg.scripts?.gate?.includes(`npm run ${name}`)) failures.push(`main gate missing ${name}`);
}
for (const name of ['test:unit','test:integration','build','build:release','release:check','verify','verify:ci']) if (!pkg.scripts?.[name]) failures.push(`missing verification/release script ${name}`);
const report = buildReport({ root });
const budgets = baseline.budgets || {};
const ceilings = [
  ['largest file lines', report.fileHotspots.largestFiles[0]?.lines || 0, budgets.largestFileLines],
  ['files >= 500', report.fileHotspots.filesOver500Lines, budgets.filesOver500Lines],
  ['non-CSS files >= 500', report.fileHotspots.nonCssFilesOver500Lines, budgets.nonCssFilesOver500Lines],
  ['TS-like >= 450', report.fileHotspots.tsLikeFilesOver450Lines, budgets.tsLikeFilesOver450Lines],
  ['TSX >= 350', report.fileHotspots.tsxFilesOver350Lines, budgets.tsxFilesOver350Lines],
  ['src explicit any', report.typeHealth.explicitAny, budgets.srcExplicitAny],
  ['core root public importers', report.boundary.corePublic.imports.importers.length, budgets.coreRootPublicImporters],
  ['shared root public importers', report.boundary.sharedPublic.imports.importers.length, budgets.sharedRootPublicImporters],
];
for (const [label,current,max] of ceilings) if (typeof max === 'number' && current > max) failures.push(`${label}: ${current} > ${max}`);
if (failures.length) { console.error('[release-governance] failed'); failures.forEach((f)=>console.error(`- ${f}`)); process.exit(1); }
console.log(`[release-governance] PASS (largest=${report.fileHotspots.largestFiles[0]?.lines || 0}; any=${report.typeHealth.explicitAny})`);
