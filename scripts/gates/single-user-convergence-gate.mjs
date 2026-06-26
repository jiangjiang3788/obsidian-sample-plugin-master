#!/usr/bin/env node
/**
 * single-user-convergence-gate
 *
 * This plugin is maintained for one user and does not need legacy data
 * compatibility. The gate keeps removed dual systems from returning.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const removedPaths = [
  'release/obsidian-sample-plugin',
  'release/obsidian-sample-plugin-release.zip',
  'src/core/theme-matrix',
  'src/core/services/TemplateResolver.ts',
  'src/core/blocks/legacyBlockAdapter.ts',
  'src/features/settings/theme/ThemeMatrix.tsx',
  'src/features/settings/theme/ThemeMatrixView.tsx',
  'src/features/settings/theme/ThemeTable.tsx',
  'src/features/settings/theme/ThemeTreeNodeRow.tsx',
  'src/features/settings/theme/useThemeMatrixEditor.ts',
  'src/features/settings/input/TemplateEditorModal.tsx',
  'src/features/settings/input/goalManager/GoalEntitySection.tsx',
  'src/features/settings/input/goalManager/GoalTemplateSection.tsx',
  'src/features/settings/viewEditors/GoalOverviewViewEditor.tsx',
  'src/features/settings/viewEditors/GoalDetailViewEditor.tsx',
  'src/features/settings/viewModels/goalOverviewViewModel.ts',
  'src/features/settings/viewModels/goalDetailViewModel.ts',
  'src/shared/ui/views/GoalOverviewView.tsx',
  'src/shared/ui/views/GoalDetailView.tsx',
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const removedPath of removedPaths) {
  if (exists(removedPath)) failures.push(`${removedPath} should stay removed in single-user convergence mode.`);
}

const sourceFiles = [];
function walk(relativeDir) {
  const fullDir = path.join(root, relativeDir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(rel);
  }
}
walk('src');
walk('scripts');

const forbiddenRuntimePatterns = [
  { re: /from ['"](?:@\/core\/theme-matrix|@core\/theme-matrix|\.\.?\/.*theme-matrix)/, label: 'imports removed core/theme-matrix module' },
  { re: /\bThemeMatrixService\b/, label: 'uses removed ThemeMatrixService' },
  { re: /\bThemeScanService\b/, label: 'uses removed ThemeScanService' },
  { re: /\bgetAvailableThemesForBlock\b/, label: 'uses removed ThemeOverride availability helper' },
  { re: /\bisThemeDisabledForBlock\b/, label: 'uses removed ThemeOverride disabled helper' },
  { re: /\bGoalOverviewView\b/, label: 'uses removed legacy GoalOverviewView' },
  { re: /\bGoalDetailView\b/, label: 'uses removed legacy GoalDetailView' },
  { re: /from ['\"][^'\"]*services\/TemplateResolver['\"]/, label: 'imports removed TemplateResolver service' },
  { re: /\blegacy-block\b/, label: 'uses removed legacy-block template source' },
  { re: /\blegacyBlockMap\b/, label: 'uses removed legacy block map' },
  { re: /\bbuildLegacyCoreBlockMap\b/, label: 'uses removed legacy block adapter' },
  { re: /\binferCoreBlockIdFromLegacyBlock\b/, label: 'uses removed legacy block adapter' },
];

for (const file of sourceFiles) {
  if (file === 'scripts/gates/single-user-convergence-gate.mjs') continue;
  const text = read(file);
  for (const { re, label } of forbiddenRuntimePatterns) {
    if (re.test(text)) failures.push(`${file}: ${label}`);
  }
}

const publicApi = read('src/core/public.ts');
if (publicApi.includes("./theme-matrix")) failures.push('core/public.ts must not export from ./theme-matrix.');
if (!publicApi.includes("./theme/themePathParser")) failures.push('core/public.ts must export parsePath/getRelativePath from ./theme/themePathParser.');

const viewContent = read('src/features/settings/layout/ViewContent.tsx');
if (viewContent.includes('normalizeLegacyGoalViewInstance')) failures.push('ViewContent must not normalize legacy goal view types at runtime.');

if (!exists('src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts')) {
  failures.push('QuickInputEditor pure model helper must exist after MVP4 extraction.');
}
const quickInputContainer = read('src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx');
const quickInputContainerLines = quickInputContainer.split(/\r?\n/).length;
if (quickInputContainerLines > 350) failures.push(`QuickInputEditorContainer.tsx should stay <= 350 lines after MVP6 action extraction; current ${quickInputContainerLines}.`);

const quickInputModel = read('src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts');
for (const requiredHelper of [
  'deriveQuickInputInitialSelection',
  'buildQuickInputEditorState',
  'applyQuickInputGoalSelection',
  'preserveQuickInputBlockSwitchState',
  'buildQuickInputDisplayTemplate',
  'applyQuickInputFieldUpdate',
  'applyQuickInputTimeDirectionChange',
]) {
  if (!quickInputModel.includes(requiredHelper)) failures.push(`QuickInputEditorModel.ts must keep ${requiredHelper} after MVP6 extraction.`);
}



if (!exists('src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx')) {
  failures.push('GoalTemplateNativeControls.tsx must exist after MVP6 modal control extraction.');
}
if (!exists('src/features/settings/goalTemplates/GoalTemplateEditorModel.ts')) {
  failures.push('GoalTemplateEditorModel.ts must exist after MVP7 modal model extraction.');
}
const goalTemplateEditorModal = read('src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx');
const goalTemplateEditorModalLines = goalTemplateEditorModal.split(/\r?\n/).length;
if (goalTemplateEditorModalLines > 360) failures.push(`GoalTemplateEditorModal.tsx should stay <= 360 lines after MVP7 model extraction; current ${goalTemplateEditorModalLines}.`);
const goalTemplateEditorModel = read('src/features/settings/goalTemplates/GoalTemplateEditorModel.ts');
for (const requiredHelper of [
  'makeDraftFromTemplate',
  'makeNewDraft',
  'buildTemplatePatchFromDraft',
  'buildInheritedTemplatePatchFromDraft',
  'applyThemePathToDraft',
  'switchDraftToOverride',
  'createCopiedDraft',
]) {
  if (!goalTemplateEditorModel.includes(requiredHelper)) failures.push(`GoalTemplateEditorModel.ts must keep ${requiredHelper} after MVP7 extraction.`);
}


if (!exists('src/features/settings/goalTemplates/GoalTemplateMatrixTable.tsx')) {
  failures.push('GoalTemplateMatrixTable.tsx must exist after MVP8 table extraction.');
}
const goalTemplateMatrix = read('src/features/settings/goalTemplates/GoalTemplateMatrix.tsx');
const goalTemplateMatrixLines = goalTemplateMatrix.split(/\r?\n/).length;
if (goalTemplateMatrixLines > 360) failures.push(`GoalTemplateMatrix.tsx should stay <= 360 lines after MVP8 table extraction; current ${goalTemplateMatrixLines}.`);
const goalTemplateMatrixModel = read('src/features/settings/goalTemplates/goalTemplateMatrixModel.ts');
for (const requiredHelper of [
  'filterVisibleGoalTemplateMatrixGoals',
  'orderDraggedGoalSiblings',
  'reorderPresetTemplatesInCell',
  'splitGoalsByRoot',
]) {
  if (!goalTemplateMatrixModel.includes(requiredHelper)) failures.push(`goalTemplateMatrixModel.ts must keep ${requiredHelper} after MVP8 extraction.`);
}

const schema = read('src/core/types/schema.ts');
if (/interface\s+ThemeOverride\b/.test(schema)) failures.push('schema must not define ThemeOverride in single-user mode.');
if (/inputSettings:\s*\{[^}]*overrides/s.test(schema)) failures.push('DEFAULT_SETTINGS.inputSettings must not contain overrides.');
if (/overrides:\s*ThemeOverride\[\]/.test(schema)) failures.push('InputSettings must not expose overrides.');


const encodedDocNames = [];
function walkNames(relativeDir) {
  const fullDir = path.join(root, relativeDir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    if (/#U[0-9A-Fa-f]{4}/.test(entry.name)) encodedDocNames.push(rel);
    if (entry.isDirectory()) walkNames(rel);
  }
}
for (const docRoot of ['doc', 'docs', 'reports']) walkNames(docRoot);
for (const encoded of encodedDocNames) failures.push(`${encoded}: document filename still contains #U escaped Chinese characters.`);

const themeUseCase = read('src/app/usecases/theme.usecase.ts');
for (const removedAction of ['upsertOverride', 'deleteOverride', 'batchUpsertOverrides', 'batchDeleteOverrides', 'batchSetOverrideStatus']) {
  if (themeUseCase.includes(removedAction)) failures.push(`theme.usecase must not expose ${removedAction}.`);
}

if (failures.length) {
  console.error('[single-user-convergence-gate] failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[single-user-convergence-gate] ok: removed dual systems are absent.');
