// scripts/gates/checks/settings-persistence-gate.mjs
// Purpose: protect the single settings persistence boundary.
// - Settings live at Think/data.json through IPluginStorage.
// - Sensitive apiKey data is sanitized before every durable write.
// - App/main must not fall back to Obsidian Plugin.loadData/saveData.

import fs from 'node:fs';
import path from 'node:path';

import { failWithViolations, printOk } from '../../lib/gate-formatter.mjs';

const root = process.cwd();
const violations = [];
const full = (relative) => path.join(root, relative);
const read = (relative) => fs.existsSync(full(relative)) ? fs.readFileSync(full(relative), 'utf8') : '';
const requireFile = (relative) => {
  if (!fs.existsSync(full(relative))) {
    violations.push({
      file: full(relative),
      loc: '0:0',
      message: `Missing file: ${relative}`,
      hint: '保持 SettingsRepository -> VaultSettingsPersistence -> IPluginStorage 的单一路径。',
    });
    return false;
  }
  return true;
};
const requireText = (relative, needle, message) => {
  if (!read(relative).includes(needle)) {
    violations.push({ file: full(relative), loc: '0:0', message });
  }
};
const forbidText = (relative, needle, message) => {
  if (read(relative).includes(needle)) {
    violations.push({ file: full(relative), loc: '0:0', message });
  }
};

const persistenceFile = 'src/core/services/SettingsPersistence.ts';
const storageFile = 'src/core/services/StorageService.ts';
const registerFile = 'src/app/bootstrap/register.ts';
const mainFile = 'src/main.ts';

requireFile(persistenceFile);
requireFile(storageFile);
requireFile(registerFile);

requireText(storageFile, "settings: inThinkStorage('data.json')", 'THINK_STORAGE_PATHS must own the Think/data.json settings path.');
requireText(persistenceFile, 'toSafePersistedThinkSettings', 'Settings persistence must keep one sanitizer for durable settings writes.');
requireText(persistenceFile, "aiSettings.apiKey = ''", 'Settings persistence must blank apiKey unless persistApiKey is explicitly enabled.');
requireText(persistenceFile, 'this.storage.readJSON(THINK_STORAGE_PATHS.settings)', 'Settings reads must go through IPluginStorage and THINK_STORAGE_PATHS.settings.');
requireText(persistenceFile, 'THINK_STORAGE_PATHS.settings,', 'Settings writes must target THINK_STORAGE_PATHS.settings.');
requireText(persistenceFile, 'toSafePersistedThinkSettings(settings)', 'Settings writes must use the sanitized persisted payload.');
requireText(registerFile, 'VaultSettingsPersistence', 'App composition must register VaultSettingsPersistence as the settings adapter.');

forbidText(registerFile, 'plugin.loadData', 'registerSettingsPersistence must not use Obsidian plugin.loadData().');
forbidText(registerFile, 'plugin.saveData', 'registerSettingsPersistence must not use Obsidian plugin.saveData().');
forbidText(mainFile, 'this.loadData(', 'main.ts must not maintain a parallel settings load path.');
forbidText(mainFile, 'this.saveData(', 'main.ts must not maintain a parallel settings save path.');

if (violations.length) {
  failWithViolations('settings-persistence-gate', violations, {
    rootDir: root,
    summary: 'settings persistence boundary regressed',
  });
}

printOk('settings-persistence-gate', 'Think/data.json / sanitizer / VaultSettingsPersistence 单一路径正确');
