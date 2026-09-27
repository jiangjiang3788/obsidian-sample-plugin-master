#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const exists = (file) => fs.existsSync(path.join(root, file));
const requireText = (file, needle) => {
  if (!read(file).includes(needle)) failures.push(`${file} must include ${needle}`);
};

requireText('src/core/settings/currentSettingsSchema.ts', "THINK_SETTINGS_SCHEMA_POLICY = 'current-only'");
if (read('src/core/settings/ThinkSettings.ts').includes('schemaVersion')) failures.push('ThinkSettings must not keep a data-version field.');
requireText('src/core/settings/currentSettingsSchema.ts', 'supportsLegacyMigration: false');
requireText('src/core/settings/currentSettingsSchema.ts', 'toCurrentThinkSettings');

// SettingsRepository is the only runtime loader. main.ts must not keep a second
// Obsidian Plugin.loadData()/saveData() pipeline.
const repositorySource = read('src/core/services/SettingsRepository.ts');
if (!repositorySource.includes('const loaded = await this.persistence.load();') || !repositorySource.includes('toCurrentThinkSettings(loaded)')) {
  failures.push('SettingsRepository must normalize ISettingsPersistence.load() through toCurrentThinkSettings before runtime use.');
}
const mainSource = read('src/main.ts');
if (mainSource.includes('this.loadData(') || mainSource.includes('this.saveData(')) {
  failures.push('src/main.ts must not contain a parallel Obsidian plugin data settings pipeline.');
}

for (const forbidden of ['src/core/settings/migrations', 'src/core/settings/migration.ts', 'src/app/usecases/settings/migrations']) {
  if (exists(forbidden)) failures.push(`legacy settings migration path must not exist: ${forbidden}`);
}

if (failures.length) {
  console.error('[settings-schema] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[settings-schema] PASS (current-only; SettingsRepository is the single runtime loader)');
