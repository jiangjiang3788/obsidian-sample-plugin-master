import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const contracts = read('src/core/records/schema/contracts.ts');
check(!contracts.includes("label: '主题'"), 'Record contract still persists 主题.');
check(!contracts.includes("key: 'themePath'"), 'Record contract still persists themePath.');
check(!contracts.includes("label: '目标ID'"), 'Record contract still persists 目标ID.');
check(!contracts.includes("label: '记录版本'"), 'Record contract still persists 记录版本.');

const codec = read('src/core/records/codec/MarkdownRecordCodec.ts');
check(!codec.includes("'主题':"), 'Markdown codec still writes 主题.');
check(!codec.includes("'目标ID':"), 'Markdown codec still writes 目标ID.');
check(!codec.includes("'记录版本':"), 'Markdown codec still writes 记录版本.');


const entity = read('src/core/records/RecordEntity.ts');
check(!entity.includes('schemaVersion:'), 'Record runtime must not carry a user-data schemaVersion.');
check(!entity.includes('templateId?:'), 'Record runtime must not persist template provenance.');
check(!entity.includes('templateSourceType?:'), 'Record runtime must not persist template source provenance.');

const recordId = read('src/core/records/RecordId.ts');
check(!recordId.includes('RECORD_SCHEMA_VERSION'), 'Current-only Record identity module must not expose a data schema version.');

const viewFields = read('src/core/view-config/domainFields.ts');
check(!viewFields.includes('VIEW_LEGACY_FIELD_ALIASES'), 'View config must not keep a legacy field-alias table.');

const energy = read('src/core/energy/record.ts');
check(!energy.includes("'主题':"), 'Energy writer still writes 主题.');
check(!energy.includes("'目标ID':"), 'Energy writer still writes 目标ID.');

const settings = read('src/core/settings/currentSettingsSchema.ts');
check(!settings.includes('schemaVersion'), 'Current settings contract must not carry a data-version field.');
check(!settings.includes('inputSettings.themes') && !settings.includes('out.inputSettings.themes'), 'Settings must not contain a second classification store.');
check(settings.includes('goalPath: path'), 'GoalTemplate persistence must use Goal path.');
check(!settings.includes('supportsLegacyMigration: true'), 'Legacy settings migration must stay disabled.');

const quickInput = read('src/features/quickinput/editor/QuickInputEditorContainer.tsx');
check(!quickInput.includes('resolveQuickInputEnergyThemePath'), 'QuickInput still resolves Energy Theme.');
check(!quickInput.includes('templateVariants'), 'QuickInput must not expose template variants.');

const goalTypes = read('src/core/goal/types.ts');
const goalDefinition = goalTypes.match(/export interface GoalDefinition \{([\s\S]*?)\n\}/)?.[1] || '';
check(/\bpath:\s*string;/.test(goalDefinition), 'GoalDefinition must keep one canonical path.');
for (const duplicate of ['id:', 'title:', 'goalPath:', 'parentGoalId:']) {
  check(!goalDefinition.includes(duplicate), `GoalDefinition still carries duplicate identity ${duplicate}`);
}

const goalTemplates = read('src/core/goal/templates.ts');
check(!goalTemplates.includes('variantId'), 'GoalTemplate runtime still contains variantId.');
check(!goalTemplates.includes('themePath'), 'GoalTemplate runtime still contains themePath.');
const goalTemplateEditor = read('src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx');
check(!goalTemplateEditor.includes('variantId'), 'GoalTemplate editor still contains variant state.');
check(!goalTemplateEditor.includes('ThemeTree'), 'GoalTemplate editor still renders Theme UI.');

const retrievalTypes = read('src/core/ai/retrieval/RetrievalTypes.ts');
check(retrievalTypes.includes('goalPaths?: string[]'), 'AI retrieval must expose Goal path filters.');
check(!retrievalTypes.includes('themePaths?: string[]'), 'AI retrieval still exposes Theme path filters.');
check(!retrievalTypes.includes('rootTheme:'), 'AI retrieval index still stores rootTheme.');
check(!retrievalTypes.includes('leafTheme:'), 'AI retrieval index still stores leafTheme.');

const goalManager = read('src/features/settings/input/GoalManager.tsx');
check(!goalManager.includes('goalThemePath'), 'Goal manager still captures a Theme path.');
check(!goalManager.includes('目标主题'), 'Goal manager still renders Theme UI.');

const aiScope = read('src/features/settings/tabs/AiScopeSection.tsx');
check(!aiScope.includes('默认主题'), 'AI settings still expose a default Theme.');

const heatmap = read('src/features/views/models/heatmapViewModel.ts');
check(heatmap.includes('goalPaths?: unknown'), 'Heatmap must consume goalPaths config.');
check(!heatmap.includes('config.themePaths'), 'Heatmap must not consume themePaths config.');

if (failures.length) {
  console.error(`[gate:goal-only] FAIL (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[gate:goal-only] PASS');
console.log('  Record persistence: one 目标 field, no user-data version/template provenance');
console.log('  Settings persistence: Goal-only, no schema version');
console.log('  QuickInput: no Theme selector / no template variants');
console.log('  Heatmap config: goalPaths');
console.log('  AI retrieval/settings: Goal paths, no Theme filter UI');
