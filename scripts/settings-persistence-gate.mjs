// scripts/settings-persistence-gate.mjs
// Purpose: prevent regressions where sensitive fields (e.g. aiSettings.apiKey) are accidentally persisted.
// This is a lightweight *static* gate: it validates that the persistence sanitizer exists and enforces apiKey stripping.

import fs from 'node:fs';
import path from 'node:path';

import { failWithViolations, printOk } from './gate-formatter.mjs';

const root = process.cwd();

const registerPath = path.join(root, 'src', 'app', 'bootstrap', 'register.ts');
if (!fs.existsSync(registerPath)) {
  failWithViolations('settings-persistence-gate', [{ file: registerPath, loc: '0:0', message: `Missing file: ${registerPath}`, hint: '修复：确保 registerSettingsPersistence 存在 sanitizeForPersistence 且剥离 apiKey，并用其保存' }], { rootDir: root, summary: 'settings persistence gate' });
}

const src = fs.readFileSync(registerPath, 'utf8');

// 1) Must have a sanitize function.
if (!src.includes('sanitizeForPersistence')) {
  fail('sanitizeForPersistence() not found in registerSettingsPersistence.');
}

// 2) Must enforce apiKey removal/blanking.
const hasApiKeyStrip =
  src.includes("out.aiSettings.apiKey = ''") ||
  src.includes("out.aiSettings.apiKey = \"\"") ||
  src.includes('delete out.aiSettings.apiKey');

if (!hasApiKeyStrip) {
  fail('No explicit apiKey stripping found (expected: set to empty string or delete).');
}

// 3) Must call plugin.saveData() with sanitized output.
if (!src.includes('plugin.saveData(sanitizeForPersistence(settings))')) {
  fail('saveData() is not using sanitizeForPersistence(settings).');
}

printOk('settings-persistence-gate', 'sanitizeForPersistence / apiKey stripping / saveData 串联正确');
