#!/usr/bin/env node
import fs, { readFileSync } from 'node:fs';
import path from 'node:path';

function check_version_sync_gate() {
  function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  function fail(message) {
    console.error(`[version-sync-gate] ${message}`);
    process.exit(1);
  }

  const pkg = readJson('package.json');
  const manifest = readJson('manifest.json');

  if (!pkg.version) fail('package.json is missing version');
  if (!manifest.version) fail('manifest.json is missing version');

  if (pkg.version !== manifest.version) {
    fail(`package.json version (${pkg.version}) must match manifest.json version (${manifest.version})`);
  }

  console.log(`[version-sync-gate] ok: ${pkg.version}`);
}

check_version_sync_gate();

function check_manifest_gate() {
  const REQUIRED_STRING_FIELDS = ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'main'];
  const PLACEHOLDER_PATTERNS = [/yourname/i, /example\.com/i, /sample-plugin/i, /todo/i, /placeholder/i];

  function fail(message) {
    console.error(`[manifest-gate] ${message}`);
    process.exit(1);
  }

  function readJson(path) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const manifest = readJson('manifest.json');
  const pkg = readJson('package.json');

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof manifest[field] !== 'string' || manifest[field].trim().length === 0) {
      fail(`manifest.${field} must be a non-empty string`);
    }
  }

  if (manifest.id !== pkg.name) {
    fail(`manifest.id (${manifest.id}) must match package.json name (${pkg.name})`);
  }

  if (manifest.main !== 'main.js') {
    fail(`manifest.main must be main.js, got ${manifest.main}`);
  }

  if (manifest.styles && manifest.styles !== 'styles.css') {
    fail(`manifest.styles must be styles.css when present, got ${manifest.styles}`);
  }

  for (const [field, value] of Object.entries(manifest)) {
    if (typeof value !== 'string') continue;
    const pattern = PLACEHOLDER_PATTERNS.find((candidate) => candidate.test(value));
    if (pattern) {
      fail(`manifest.${field} looks like placeholder content: ${value}`);
    }
  }

  console.log(`[manifest-gate] ok: ${manifest.id} ${manifest.version}`);
}

check_manifest_gate();

function check_product_acceptance_gate() {
  const root = process.cwd();
  const failures = [];
  const exists = (file) => fs.existsSync(path.join(root, file));
  const read = (file) => exists(file) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  const json = (file) => JSON.parse(read(file) || '{}');
  const expectFile = (file, reason) => { if (!exists(file)) failures.push(`${file} missing: ${reason}`); };
  const expectText = (file, needle) => { if (!read(file).includes(needle)) failures.push(`${file} must contain ${needle}`); };

  const pkg = json('package.json');
  const manifest = json('manifest.json');
  const example = json('data.example.json');
  if (manifest.id !== pkg.name) failures.push('manifest.id must match package name');
  if (manifest.version !== pkg.version) failures.push('manifest.version must match package version');
  if (example.aiSettings?.enabled !== false) failures.push('AI must be disabled by default');
  if (example.aiSettings?.apiEndpoint !== '') failures.push('AI endpoint must be blank by default');
  if (example.aiSettings?.apiKey !== '') failures.push('AI API key must be blank by default');
  if (example.aiSettings?.model !== '') failures.push('AI model must be blank by default');
  if (example.aiSettings?.persistApiKey !== false) failures.push('API key persistence must be opt-in');

  for (const [file, reason] of [
    ['.github/workflows/ci.yml', 'CI'],
    ['src/app/actions/recordCreate/index.ts', 'record create boundary'],
    ['src/app/actions/recordEditActions.ts', 'record edit boundary'],
    ['src/app/actions/recordTaskActions.ts', 'task mutation boundary'],
    ['src/app/actions/recordExcelActions.ts', 'Excel mutation boundary'],
    ['src/features/quickinput/modal/useQuickInputSubmit.ts', 'QuickInput submit boundary'],
    ['src/features/quickinput/modal/QuickInputConflictRecoveryPanel.tsx', 'conflict recovery UI'],
    ['src/core/recordInput/recovery.ts', 'conflict recovery planner'],
    ['src/platform/obsidian/ObsidianAiHttpTransport.ts', 'Obsidian requestUrl transport'],
    ['src/shared/ui/icons/index.tsx', 'local icon layer'],
    ['test/unit/platform/obsidianAiHttpTransport.test.ts', 'AI transport coverage'],
    ['test/unit/recordSubmitRecovery.test.ts', 'record recovery coverage'],
    ['test/unit/quickInputEditorModel.test.ts', 'QuickInput editor/option coverage'],
  ]) expectFile(file, reason);

  for (const script of ['build:release','release:check','bundle:report','gate:product','gate:quality','verify:ci']) {
    if (!pkg.scripts?.[script]) failures.push(`missing package script: ${script}`);
  }
  expectText('.github/workflows/ci.yml', 'npm run verify:ci');
  expectText('.github/workflows/ci.yml', 'npm run build:release');
  expectText('README.md', 'single-select options');
  expectText('README.md', 'conflict recovery actions');
  expectText('README.md', 'npm run build:release');

  if (failures.length) {
    console.error('[product-acceptance] failed');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[product-acceptance] PASS');
}

check_product_acceptance_gate();
