#!/usr/bin/env node
/**
 * current-schema-gate
 *
 * V25 single-user release policy: only the current settings schema is supported.
 * This gate keeps the rule explicit without blocking local data.json usage.
 */
import fs from 'node:fs';
import path from 'node:path';

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function requireIncludes(label, source, needle) {
  if (!source.includes(needle)) failures.push(`${label} must include ${needle}`);
}

function walk(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return [];
  const out = [];
  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const child = path.join(fullPath, entry.name);
    const rel = path.relative(root, child).replaceAll('\\\\', '/').replaceAll('\\', '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const schema = read('src/core/types/schema.ts');
const current = read('src/core/settings/currentSettingsSchema.ts');
const main = read('src/main.ts');
const packageJson = JSON.parse(read('package.json') || '{}');
const folderPlan = read('docs/FOLDER_REORG_PLAN.md');
const archReport = read('docs/ARCH_REFACTOR_REPORT.md');
const acceptance = read('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md');

requireIncludes('src/core/types/schema.ts', schema, 'export const THINK_SETTINGS_SCHEMA_VERSION = 2');
requireIncludes('src/core/types/schema.ts', schema, 'schemaVersion: THINK_SETTINGS_SCHEMA_VERSION');
requireIncludes('src/core/settings/currentSettingsSchema.ts', current, "THINK_SETTINGS_SCHEMA_POLICY = 'current-only'");
requireIncludes('src/core/settings/currentSettingsSchema.ts', current, 'supportsLegacyMigration: false');
requireIncludes('src/core/settings/currentSettingsSchema.ts', current, 'toCurrentThinkSettings');
requireIncludes('src/core/settings/currentSettingsSchema.ts', current, 'schema mismatch');
requireIncludes('src/main.ts', main, 'toCurrentThinkSettings(await this.loadData())');
requireIncludes('package.json scripts.gate', packageJson.scripts?.gate ?? '', 'schema:gate');
requireIncludes('package.json scripts.refactor:verify', packageJson.scripts?.['refactor:verify'] ?? '', 'schema:gate');
requireIncludes('docs/FOLDER_REORG_PLAN.md', folderPlan, 'V25 已执行');
requireIncludes('docs/FOLDER_REORG_PLAN.md', folderPlan, '只支持当前 settings schema');
requireIncludes('docs/ARCH_REFACTOR_REPORT.md', archReport, '## 25. V25 当前版 schema 锁定与目录封版');
requireIncludes('docs/REFACTOR_ACCEPTANCE_CHECKLIST.md', acceptance, '当前版 schema 验收');

for (const forbiddenPath of [
  'src/core/settings/migrations',
  'src/core/settings/migration.ts',
  'src/app/usecases/settings/migrations',
]) {
  if (exists(forbiddenPath)) failures.push(`legacy settings migration path must not exist: ${forbiddenPath}`);
}

const migrationFiles = walk('src/core/settings').filter((file) => /migrat(e|ion)/i.test(path.basename(file)));
if (migrationFiles.length > 0) {
  failures.push(`current-only settings must not add migration files: ${migrationFiles.join(', ')}`);
}

console.log('[current-schema-gate] V25 current settings schema');
console.log('- policy: current-only');
console.log('- schemaVersion: 2');
console.log('- legacy settings migrations: forbidden');
console.log('- root data.json: allowed locally, excluded from release packages');

if (failures.length > 0) {
  console.error('\n[current-schema-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[current-schema-gate] ok: single-user current schema policy is explicit.');
