#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function canRead(path) {
  return existsSync(join(root, path));
}

function readJson(path) {
  return JSON.parse(read(path));
}

function expectFile(path, reason) {
  if (!existsSync(join(root, path))) failures.push(`${path} missing: ${reason}`);
}

function expectContains(path, needle, reason) {
  if (!canRead(path)) {
    failures.push(`${path} missing: ${reason}`);
    return;
  }
  if (!read(path).includes(needle)) failures.push(`${path} must contain ${needle}: ${reason}`);
}

function expectMaxLines(path, max, reason) {
  if (!canRead(path)) {
    failures.push(`${path} missing: ${reason}`);
    return;
  }
  const lines = read(path).split(/\r?\n/).length;
  if (lines > max) failures.push(`${path} has ${lines} lines, expected <= ${max}: ${reason}`);
}

function expectEqual(actual, expected, reason) {
  if (actual !== expected) failures.push(`${reason}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const pkg = readJson('package.json');
const manifest = readJson('manifest.json');
const exampleData = readJson('data.example.json');

expectEqual(manifest.id, pkg.name, 'manifest.id and package.json name must match');
expectEqual(manifest.version, pkg.version, 'manifest and package version must match');
expectEqual(exampleData.aiSettings?.enabled, false, 'AI must be disabled by default');
expectEqual(exampleData.aiSettings?.apiEndpoint, '', 'AI endpoint must be blank by default');
expectEqual(exampleData.aiSettings?.apiKey, '', 'AI API key must be blank by default');
expectEqual(exampleData.aiSettings?.model, '', 'AI model must be blank by default');
expectEqual(exampleData.aiSettings?.persistApiKey, false, 'API key persistence must be opt-in');

expectFile('docs/MVP_ACCEPTANCE.md', 'MVP user journey must be documented');
expectFile('.github/workflows/ci.yml', 'CI must exist before release sharing');
expectFile('src/app/actions/recordCreateActions.ts', 'record create actions should stay split from the public barrel');
expectFile('src/app/actions/recordEditActions.ts', 'record edit actions should stay split from the public barrel');
expectFile('src/app/actions/recordTaskActions.ts', 'record task mutations should stay split from the public barrel');
expectFile('src/app/actions/recordExcelActions.ts', 'Excel mutation actions should stay split from the public barrel');
expectFile('src/features/quickinput/modal/useQuickInputSubmit.ts', 'QuickInput submit flow should stay isolated from the modal shell');
expectFile('src/features/settings/tabs/AiApiConfigSection.tsx', 'AI settings form should stay split by section');
expectFile('scripts/gates/bundle-budget-gate.mjs', 'release builds should enforce a bundle size budget');
expectFile('scripts/audit/bundle-size-report.mjs', 'release builds should produce a trackable bundle size report');
expectFile('src/platform/obsidian/ObsidianAiHttpTransport.ts', 'AI HTTP must use a platform transport for Obsidian requestUrl');
expectFile('test/unit/platform/obsidianAiHttpTransport.test.ts', 'Obsidian AI transport should be covered by unit tests');
expectFile('test/unit/recordSubmitFeedback.test.ts', 'record conflict feedback should be covered by unit tests');
expectFile('src/features/quickinput/editor/components/QuickInputOptionPillGroup.tsx', 'QuickInput single-select fields should render visible options instead of dropdowns');
expectFile('src/features/quickinput/editor/components/quickInputOptionSelection.ts', 'QuickInput option selection state should be normalized and testable');
expectFile('test/unit/quickInputOptionSelection.test.ts', 'QuickInput option selection helpers should be covered by unit tests');
expectFile('docs/INITIAL_PLAN_PROGRESS.md', 'the original engineering plan should track implementation progress');
expectFile('src/features/quickinput/modal/QuickInputConflictRecoveryPanel.tsx', 'QuickInput edit conflicts should expose in-modal recovery actions');
expectFile('src/core/recordInput/recovery.ts', 'record conflict recovery actions should be pure and testable');
expectFile('test/unit/recordSubmitRecovery.test.ts', 'record conflict recovery action planning should be covered by unit tests');
expectFile('src/shared/ui/icons/index.tsx', 'runtime icons should stay local instead of importing @mui/icons-material');
expectFile('scripts/gates/no-mui-icons-gate.mjs', 'the gate chain should block MUI icon package regressions');
expectFile('test/unit/sharedIcons.test.ts', 'the local lightweight icon layer should have a basic unit test');

expectMaxLines('src/app/actions/recordUiActions.ts', 80, 'recordUiActions should remain a compatibility barrel');
expectMaxLines('src/platform/obsidian/modals/QuickInputModal.tsx', 350, 'QuickInput modal shell should remain manageable');
expectMaxLines('src/features/settings/tabs/AiSettings.tsx', 260, 'AI settings shell should remain manageable');

expectContains('package.json', 'build:release', 'release build command must be available');
expectContains('package.json', 'release:check', 'release boundary check command must be available');
expectContains('package.json', 'mvp:gate', 'MVP acceptance gate must be available');
expectContains('package.json', 'bundle:gate', 'bundle budget gate must be available');
expectContains('package.json', 'bundle:report', 'bundle size report must be available');
expectContains('package.json', 'no-mui-icons:gate', 'local icon import gate must be available');
expectContains('README.md', 'build:release', 'README should explain the release path');
expectContains('README.md', 'bundle:gate', 'README should explain release bundle budget checks');
expectContains('README.md', 'bundle:report', 'README should explain release bundle reporting');
expectContains('README.md', 'no-mui-icons:gate', 'README should explain local icon gate usage');
expectContains('.github/workflows/ci.yml', 'npm run verify:ci', 'CI should run verification');
expectContains('.github/workflows/ci.yml', 'npm run build:release', 'CI should build the release package');
expectContains('docs/MVP_ACCEPTANCE.md', 'MVP user journey', 'acceptance doc must describe the user path');
expectContains('docs/MVP_ACCEPTANCE.md', 'bundle budget', 'acceptance doc must mention release bundle budget');
expectContains('docs/MVP_ACCEPTANCE.md', 'Obsidian requestUrl', 'acceptance doc must mention Obsidian AI HTTP transport');
expectContains('docs/MVP_ACCEPTANCE.md', 'single-select options', 'acceptance doc must mention visible QuickInput single-select options');
expectContains('docs/MVP_ACCEPTANCE.md', 'conflict recovery actions', 'acceptance doc must mention in-modal record conflict recovery actions');
expectContains('docs/MVP_ACCEPTANCE.md', '@shared/ui/icons', 'acceptance doc must mention the local icon layer');
expectContains('docs/MVP_ACCEPTANCE.md', '@mui/icons-material', 'acceptance doc must mention the banned MUI icon package');
expectContains('README.md', 'single-select options', 'README should mention the QuickInput single-select UX rule');
expectContains('README.md', 'conflict recovery actions', 'README should mention in-modal record conflict recovery actions');
expectContains('docs/INITIAL_PLAN_PROGRESS.md', '总体加权完成度', 'plan progress doc must summarize weighted completion');

if (failures.length > 0) {
  console.error('\n[mvp-acceptance-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[mvp-acceptance-gate] ok: MVP safety and maintainability checks passed');
