// scripts/settings-persistence-gate.mjs
// Purpose: prevent regressions where sensitive fields (e.g. aiSettings.apiKey) are accidentally persisted.
// This is a lightweight *static* gate: it validates that the persistence sanitizer exists and enforces apiKey stripping.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(msg) {
  console.error(`\n[gate:settings-persistence] ${msg}\n`);
  process.exit(1);
}

const registerPath = path.join(root, 'src', 'app', 'bootstrap', 'register.ts');
if (!fs.existsSync(registerPath)) {
  fail(`Missing file: ${registerPath}`);
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

console.log('[gate:settings-persistence] OK');
