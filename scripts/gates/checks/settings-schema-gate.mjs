#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root,file)) ? fs.readFileSync(path.join(root,file),'utf8') : '';
const exists = (file) => fs.existsSync(path.join(root,file));
const requireText = (file, needle) => { if (!read(file).includes(needle)) failures.push(`${file} must include ${needle}`); };
requireText('src/core/settings/currentSettingsSchema.ts', "THINK_SETTINGS_SCHEMA_POLICY = 'current-only'");
if (read('src/core/settings/ThinkSettings.ts').includes('schemaVersion')) failures.push('ThinkSettings must not keep a data-version field.');
requireText('src/core/settings/currentSettingsSchema.ts', 'supportsLegacyMigration: false');
requireText('src/core/settings/currentSettingsSchema.ts', 'toCurrentThinkSettings');
const mainSource = read('src/main.ts');
const directLoad = mainSource.includes('toCurrentThinkSettings(await this.loadData())');
const stagedLoad = mainSource.includes('const raw = await this.loadData();') && mainSource.includes('toCurrentThinkSettings(raw)');
if (!directLoad && !stagedLoad) failures.push('src/main.ts must normalize plugin.loadData() through toCurrentThinkSettings before runtime use.');
for (const forbidden of ['src/core/settings/migrations','src/core/settings/migration.ts','src/app/usecases/settings/migrations']) if (exists(forbidden)) failures.push(`legacy settings migration path must not exist: ${forbidden}`);
if (failures.length) { console.error('[settings-schema] failed'); failures.forEach((f)=>console.error(`- ${f}`)); process.exit(1); }
console.log('[settings-schema] PASS (current-only; no persisted/runtime settings data version)');
