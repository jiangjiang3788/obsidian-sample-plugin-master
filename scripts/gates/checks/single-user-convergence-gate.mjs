#!/usr/bin/env node
/**
 * Single-user Goal-only convergence gate.
 *
 * The local product has one current data model. This gate protects the final
 * architecture instead of preserving historical extraction milestones.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const full = (relative) => path.join(ROOT, relative);
const exists = (relative) => fs.existsSync(full(relative));
const read = (relative) => exists(relative) ? fs.readFileSync(full(relative), 'utf8') : '';
const walk = (dir) => {
  const absolute = full(dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name).replaceAll('\\', '/');
    return entry.isDirectory() ? walk(relative) : [relative];
  });
};
const fail = (condition, message) => { if (condition) failures.push(message); };

for (const removed of [
  'src/core/theme',
  'src/core/themeMetadata.ts',
  'src/core/types/theme.ts',
  'src/features/settings/data/ThemeMetadataManager.tsx',
  'src/app/store/slices/theme.slice.ts',
  'src/app/store/mutations/themeSettingsMutations.ts',
  'src/app/usecases/theme.usecase.ts',
  'src/features/views/runtime/ThemeFilter.tsx',
  'src/features/views/runtime/HeatmapThemeGroup.tsx',
  'src/shared/components/ThemeTreeSelect',
  'src/shared/ui/components/ThemeTreeNodeLabel.tsx',
]) {
  fail(exists(removed), `removed second-classification runtime path returned: ${removed}`);
}

for (const required of [
  'src/features/views/runtime/HeatmapGoalGroup.tsx',
  'src/core/goal/templates.ts',
  'src/core/settings/currentSettingsSchema.ts',
  'src/core/fields/FieldValueResolver.ts',
]) {
  fail(!exists(required), `Goal-only runtime file is missing: ${required}`);
}

const sourceFiles = walk('src').filter((file) => /\.(?:ts|tsx|md)$/.test(file));
const forbiddenBusinessTokens = [
  /\bthemePath\b/,
  /\bthemeId\b/,
  /\brootTheme\b/,
  /\bleafTheme\b/,
  /\bThemeDefinition\b/,
  /\bThemeManager\b/,
  /\bThemeTree\w*\b/,
  /目标ID/,
  /\bgoalId\b/,
  /\bvariantId\b/,
  /\btemplateVariant\w*\b/,
  /\bpintu\b/,
  /评图/,
];
for (const file of sourceFiles) {
  const text = read(file);
  for (const pattern of forbiddenBusinessTokens) {
    if (pattern.test(text)) failures.push(`${file} contains forbidden dual-model token ${pattern}`);
  }
}


const technicalVersionFiles = new Set([
  'src/core/services/TimerStateService.ts',
  'src/core/services/dataStore/DataStoreCache.ts',
  'src/core/types/cache.ts',
]);
for (const file of sourceFiles) {
  if (technicalVersionFiles.has(file)) continue;
  fail(/\bschemaVersion\b/.test(read(file)), `${file} contains a user/runtime data schemaVersion outside approved technical cache/timer envelopes.`);
}

const viewConfig = read('src/core/view/ViewConfig.ts');
fail(/\bdataSourceId\b/.test(viewConfig), 'ViewInstance must not keep removed dataSourceId compatibility state.');
const recordDraft = read('src/core/records/RecordDraft.ts');
fail(recordDraft.includes('captureFields?: readonly TemplateField[]'), 'RecordDraft must require the current template field list; optional compatibility projection is forbidden.');
fail(recordDraft.includes('outputTemplate'), 'RecordDraft must not consume removed outputTemplate grammar.');
const fieldResolver = read('src/core/fields/FieldValueResolver.ts');
fail(/\blegacy\s*:/.test(fieldResolver), 'FieldValueResolver must not expose legacy-resolution state.');


const recordEntity = read('src/core/records/RecordEntity.ts');
fail(recordEntity.includes('schemaVersion:'), 'RecordEntity must not carry a user-data schemaVersion.');
fail(recordEntity.includes('templateId?:'), 'RecordEntity must not carry persisted template provenance.');
fail(recordEntity.includes('templateSourceType?:'), 'RecordEntity must not carry persisted template source provenance.');

const recordCodec = read('src/core/records/codec/MarkdownRecordCodec.ts');
for (const removedAlias of ['recordid', 'coreblock', 'recordsubtype', 'recurrenceunit', 'scheduledat', 'completedat']) {
  fail(recordCodec.includes(removedAlias), `current-only Markdown decoder still contains legacy key alias ${removedAlias}`);
}

const settingsType = read('src/core/settings/ThinkSettings.ts');
fail(settingsType.includes('schemaVersion'), 'ThinkSettings must not carry a data-version field.');
fail(settingsType.includes('themes:'), 'ThinkSettings must not carry a second classification collection.');

const settingsSchema = read('src/core/settings/currentSettingsSchema.ts');
fail(!settingsSchema.includes("THINK_SETTINGS_SCHEMA_POLICY = 'current-only'"), 'settings must stay current-only.');
fail(settingsSchema.includes('supportsLegacyMigration: true'), 'legacy settings migration must stay disabled.');
fail(settingsSchema.includes('schemaVersion'), 'current settings loader must not carry a data-version field.');

const recordContracts = read('src/core/records/schema/contracts.ts');
for (const persisted of ["label: '主题'", "label: '目标ID'", "label: '记录版本'", "key: 'themePath'"]) {
  fail(recordContracts.includes(persisted), `Record contracts must not persist ${persisted}.`);
}

const goalTypes = read('src/core/goal/types.ts');
const goalDefinition = goalTypes.match(/export interface GoalDefinition \{([\s\S]*?)\n\}/)?.[1] || '';
fail(!/\bpath:\s*string;/.test(goalDefinition), 'GoalDefinition must expose one canonical path.');
for (const duplicate of ['id:', 'title:', 'goalPath:', 'parentGoalId:']) {
  fail(goalDefinition.includes(duplicate), `GoalDefinition duplicate identity returned: ${duplicate}`);
}
fail(!goalTypes.includes('One Goal path × one CoreBlock can have at most one row.'), 'GoalTemplate uniqueness contract is missing.');
fail(goalTypes.includes('variantId'), 'GoalTemplate variant identity returned.');

const heatmap = read('src/features/views/runtime/HeatmapViewModel.ts');
fail(!heatmap.includes('goalPath'), 'Heatmap runtime must group by Goal path.');
fail(heatmap.includes('themePath'), 'Heatmap runtime must not use the removed classification field.');

const progress = read('src/features/views/runtime/ProgressViewModel.ts');
fail(!progress.includes('goalBreakdown'), 'Progress runtime must use Goal breakdowns.');
fail(progress.includes('themeBreakdown'), 'Progress runtime still uses the removed breakdown model.');

const quickInput = read('src/features/quickinput/editor/QuickInputEditorContainer.tsx');
fail(quickInput.includes('selectedGoalId'), 'QuickInput must not keep a second Goal identity.');
fail(quickInput.includes('templateVariants'), 'QuickInput must not expose template variants.');

if (failures.length) {
  console.error('[single-user-convergence-gate] failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[single-user-convergence-gate] PASS (one Goal path; current-only data; no second classification runtime).');
