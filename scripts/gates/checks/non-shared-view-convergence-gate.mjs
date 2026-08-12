#!/usr/bin/env node
/**
 * non-shared-view-convergence-gate
 *
 * Guard for the final non-shared view pass.  The point is not to require every
 * settings/modal component to have a Model file; it only protects large editors
 * that were already carrying reusable rule state or repeated helper logic.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(full(relativePath), 'utf8');
}

function lineCount(relativePath) {
  return read(relativePath).split(/\r?\n/).length;
}

function assertExists(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath} is required: ${reason}`);
}

function assertLineLimit(relativePath, maxLines, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath} is missing while checking ${reason}`);
    return;
  }
  const lines = lineCount(relativePath);
  if (lines > maxLines) failures.push(`${relativePath} should stay <= ${maxLines} lines (${reason}); current ${lines}.`);
}

function assertIncludes(relativePath, tokens, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath} is missing while checking ${reason}`);
    return;
  }
  const content = read(relativePath);
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${relativePath} must keep ${token}: ${reason}`);
  }
}

function assertNotIncludes(relativePath, tokens, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath} is missing while checking ${reason}`);
    return;
  }
  const content = read(relativePath);
  for (const token of tokens) {
    if (content.includes(token)) failures.push(`${relativePath} must not contain ${token}: ${reason}`);
  }
}

assertExists('src/features/settings/views/editors/RuleBuilderModel.ts', 'MVP23 extracts rule normalization and mutation helpers.');
assertExists('src/features/settings/views/editors/RuleBuilderValueInput.tsx', 'MVP23 extracts autocomplete value editing.');
assertLineLimit('src/features/settings/views/editors/RuleBuilder.tsx', 320, 'RuleBuilder should stay as settings UI composition after MVP23.');
assertLineLimit('src/features/settings/views/editors/RuleBuilderValueInput.tsx', 80, 'value input is intentionally small and should not grow into a second builder.');
assertIncludes('src/features/settings/views/editors/RuleBuilderModel.ts', [
  'buildUniqueFieldValues',
  'normalizeFilterPatch',
  'appendRule',
  'patchRuleRows',
  'buildRuleLabel',
  'getPanelRuleGridTemplate',
], 'RuleBuilderModel owns non-visual rule state.');
assertNotIncludes('src/features/settings/views/editors/RuleBuilder.tsx', [
  'function useUniqueFieldValues',
  'function normalizeFilterPatch',
  'function normalizeMultiValue',
  'function formatRuleValue',
  'const operatorOptions =',
], 'RuleBuilder must not re-accumulate local rule model helpers.');

// These files were explicitly reviewed in the non-shared pass.  They are not
// forced into Model files because doing so would add indirection without a clear
// maintenance win.
const intentionallyNotSplit = [
  ['src/app/ui/primitives/FloatingPanel.tsx', 650],
  ['src/shared/components/ThemeTreeSelect/Panel.tsx', 320],
  ['src/platform/obsidian/modals/NamePromptModal.tsx', 140],
];
for (const [relativePath, maxLines] of intentionallyNotSplit) {
  assertLineLimit(relativePath, maxLines, 'reviewed as acceptable non-shared UI; do not split only for symmetry.');
}

if (failures.length > 0) {
  console.error('non-shared-view-convergence-gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('non-shared-view-convergence-gate passed.');
