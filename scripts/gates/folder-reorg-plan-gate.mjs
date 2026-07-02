#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildReport } from '../audit/folder-reorg-map.mjs';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireIncludes(label, value, needle) {
  if (!value.includes(needle)) failures.push(`${label} must include ${needle}`);
}

const plan = read('docs/FOLDER_REORG_PLAN.md');
const packageJson = JSON.parse(read('package.json') || '{}');
const secretGate = read('scripts/gates/secret-gate.mjs');
const packageRelease = read('scripts/build/package-release.mjs');
const currentSchemaGate = read('scripts/gates/current-schema-gate.mjs');
const currentSchema = read('src/core/settings/currentSettingsSchema.ts');
const releaseBoundary = read('scripts/gates/release-boundary-gate.mjs');
const report = buildReport();

for (const text of [
  'V20',
  'V21 QuickInput',
  'V22 Settings / Views',
  'V23 Core',
  'src/core/records/task',
  'src/core/recordInput/recovery',
  'V24 Shared / Platform',
  'V25 Schema / Release',
  'V25 已执行',
  '只支持当前 settings schema',
  '不做旧数据迁移',
  'data.json',
]) {
  requireIncludes('docs/FOLDER_REORG_PLAN.md', plan, text);
}

for (const scriptName of ['folder:map', 'folder:verify']) {
  if (!packageJson.scripts?.[scriptName]) failures.push(`package.json must expose ${scriptName}`);
}

requireIncludes('scripts/gates/secret-gate.mjs', secretGate, 'ignoredLocalRuntimeRootFiles');
requireIncludes('scripts/build/package-release.mjs', packageRelease, 'Root data.json is a local Obsidian runtime file');
requireIncludes('scripts/gates/current-schema-gate.mjs', currentSchemaGate, 'current-only');
requireIncludes('src/core/settings/currentSettingsSchema.ts', currentSchema, 'supportsLegacyMigration: false');
requireIncludes('scripts/gates/release-boundary-gate.mjs', releaseBoundary, "allowedFiles = new Set(['manifest.json', 'main.js', 'styles.css'])");

const phases = new Set(report.migrations.map((entry) => entry.phase));
for (const phase of ['V21', 'V22', 'V23', 'V24', 'V25']) {
  if (!phases.has(phase)) failures.push(`folder reorg map must include ${phase}`);
}

const v22Runtime = report.migrations.find((entry) => entry.phase === 'V22' && entry.area === 'Business runtime views');
if (v22Runtime?.sourceFileCount !== 0) failures.push('V22 runtime views source path should be empty after moving out of shared/ui/views');
if (!v22Runtime || v22Runtime.targetFileCount <= 0) failures.push('V22 runtime views target must contain moved business view files');
const v22Editors = report.migrations.find((entry) => entry.phase === 'V22' && entry.area === 'Settings view editors');
if (v22Editors?.sourceFileCount !== 0) failures.push('V22 viewEditors source path should be empty after moving into settings/views/editors');
if (!v22Editors || v22Editors.targetFileCount <= 0) failures.push('V22 view editors target must contain moved editor files');
const v22Models = report.migrations.find((entry) => entry.phase === 'V22' && entry.area === 'Settings view models');
if (v22Models?.sourceFileCount !== 0) failures.push('V22 viewModels source path should be empty after moving into settings/views/models');
if (!v22Models || v22Models.targetFileCount <= 0) failures.push('V22 view models target must contain moved model files');

const v23RecordInput = report.migrations.find((entry) => entry.phase === 'V23' && entry.area === 'RecordInput core services');
if (v23RecordInput?.sourceFileCount !== 0) failures.push('V23 recordInput source path should be empty after moving out of core/services');
if (!v23RecordInput || v23RecordInput.targetFileCount <= 0) failures.push('V23 recordInput target must contain core domain files');
const v23TaskHelpers = report.migrations.find((entry) => entry.phase === 'V23' && entry.area === 'Task record helpers');
if (v23TaskHelpers?.sourceFileCount !== 0) failures.push('V23 task helper source path should be empty after moving out of core/utils');
if (!v23TaskHelpers || v23TaskHelpers.targetFileCount !== 1) failures.push('V23 task helper target must exist');
const v23RecordRecovery = report.migrations.find((entry) => entry.phase === 'V23' && entry.area === 'Record submit feedback helpers');
if (v23RecordRecovery?.sourceFileCount !== 0) failures.push('V23 record recovery source path should be empty after moving out of core/utils');
if (!v23RecordRecovery || v23RecordRecovery.targetFileCount !== 1) failures.push('V23 record recovery target must exist');


const v24Platform = report.migrations.find((entry) => entry.phase === 'V24' && entry.area === 'Platform Obsidian adapters');
if (report.platformRootDirectFileCount !== 0) failures.push('V24 platform root should not contain adapter files; keep concrete adapters under src/platform/obsidian');
if (!v24Platform || v24Platform.targetFileCount <= 0) failures.push('V24 platform/obsidian target must contain Obsidian adapter files');
for (const [area, expectedMin] of [
  ['Shared item renderers', 4],
  ['Shared heatmap renderer', 1],
  ['Shared statistics renderer', 1],
  ['Shared timeline renderer', 4],
  ['Shared Obsidian modal forwarder', 1],
]) {
  const entry = report.migrations.find((candidate) => candidate.phase === 'V24' && candidate.area === area);
  if (!entry) failures.push(`V24 migration entry missing: ${area}`);
  else {
    if (entry.sourceFileCount !== 0) failures.push(`V24 source path should be empty after moving ${area}`);
    if (entry.targetFileCount < expectedMin) failures.push(`V24 target path for ${area} should contain at least ${expectedMin} file(s)`);
  }
}
const sharedUiPublic = read('src/shared/ui/public.ts');
for (const forbiddenExport of ['items/TaskRow', 'items/BlockItem', 'items/ItemLink', 'items/FieldPill', 'heatmap/HeatmapCell', 'statistics/ChartBlock', './timeline', 'NamePromptModal']) {
  if (sharedUiPublic.includes(forbiddenExport)) failures.push(`shared UI public must not export business/platform component: ${forbiddenExport}`);
}

if (report.rootDataJsonPolicy.secretGateBlocksRootDataJson !== false) {
  failures.push('folder reorg map must document that secret-gate no longer blocks root data.json');
}
if (report.rootDataJsonPolicy.releasePackageIncludesRootDataJson !== false) {
  failures.push('folder reorg map must document that release packages still exclude root data.json');
}

if (report.version !== 'V25-current-schema-release-lock') failures.push(`folder reorg map version is ${report.version}`);
const v25Schema = report.migrations.find((entry) => entry.phase === 'V25' && entry.area === 'Current schema lock');
if (!v25Schema) failures.push('V25 current schema lock migration entry missing');
else if (v25Schema.targetFileCount <= 0) failures.push('V25 current schema target must contain schema lock files');

console.log('[folder-reorg-plan-gate] V25 folder reorg plan');
console.log(`- migration candidates: ${report.migrations.length}`);
console.log(`- platform root direct files: ${report.platformRootDirectFileCount}`);
console.log(`- root data.json blocked by secret-gate: ${report.rootDataJsonPolicy.secretGateBlocksRootDataJson}`);
console.log(`- root data.json included in release: ${report.rootDataJsonPolicy.releasePackageIncludesRootDataJson}`);

if (failures.length > 0) {
  console.error('\n[folder-reorg-plan-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[folder-reorg-plan-gate] ok: folder reorg plan, current schema policy and release boundaries are explicit.');
