#!/usr/bin/env node
/**
 * Domain convergence gate for the Goal × Block MVP.
 * MVP11 policy: migration is not a runtime/plugin responsibility; AI and views use Goal × Block as the primary axis.
 * The plugin must read already-clean data and expose the new Goal × Block model only.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertBalancedQuotedArrayLines(relative, label) {
  const lines = read(relative).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith("'")) continue;
    let quoteCount = 0;
    for (let i = 0; i < trimmed.length; i += 1) {
      if (trimmed[i] === "'" && trimmed[i - 1] !== '\\') quoteCount += 1;
    }
    if (quoteCount % 2 !== 0) {
      failures.push(`${label}: unbalanced single-quoted prompt literal at ${relative}:${index + 1}`);
    }
  }
}

function parsePackageJson() {
  return JSON.parse(read('package.json'));
}

function majorMinorPatch(version) {
  const match = String(version || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function isAtLeast(version, min) {
  const [a, b, c] = majorMinorPatch(version);
  const [x, y, z] = majorMinorPatch(min);
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}

assert(exists('src/core/goal/templateVariant.ts'), 'Missing Template Variant domain contract: src/core/goal/templateVariant.ts');
assert(!exists('src/core/goal/domainConvergence.ts'), 'Runtime data convergence normalizer must be removed; data is migrated offline.');
assert(!exists('scripts/migration/one-shot-domain-migration.mjs'), 'Command-line migration script must be removed from the plugin package.');
assert(!exists('src/core/goal/themeOverrideMigration.ts'), 'Theme × Block migration helpers must not ship in runtime source.');

const packageJson = parsePackageJson();
const nodeTypesVersion = packageJson.devDependencies?.['@types/node'] || packageJson.dependencies?.['@types/node'];
assert(isAtLeast(nodeTypesVersion, '20.19.0'), 'Vite 7 requires @types/node >=20.19.0; package.json must not pin an older Node type package.');

const goalIndex = read('src/core/goal/index.ts');
assert(goalIndex.includes('normalizeTemplateVariantId'), 'Template Variant helpers are not exported from core/goal.');
assert(goalIndex.includes('isSystemRecordContextField'), 'System context field helper is not exported from core/goal.');
assert(!goalIndex.includes('domainConvergence'), 'core/goal must not export runtime data convergence.');
assert(!goalIndex.includes('themeOverrideMigration'), 'core/goal must not export legacy Theme × Block migration helpers.');

const publicApi = read('src/core/public.ts');
assert(publicApi.includes('normalizeTemplateVariantId'), 'Template Variant helpers are not exported from core/public.');
assert(publicApi.includes('isSystemRecordContextField'), 'System context field helper is not exported from core/public.');
assert(!publicApi.includes('normalizeThinkSettingsForDomainConvergence'), 'core/public must not export runtime data convergence.');
assert(!publicApi.includes('ThemeOverrideMigration'), 'core/public must not export legacy Theme × Block migration types.');

const mainEntry = read('src/main.ts');
assert(!mainEntry.includes('normalizeThinkSettingsForDomainConvergence'), 'main.ts must not auto-migrate or auto-write data.json on load.');
assert(!mainEntry.includes('DomainConvergence'), 'main.ts must not contain domain convergence runtime logging.');
assert(!mainEntry.includes('convergence.settings'), 'main.ts must return loaded settings directly after lightweight normalization.');

const dataManagement = read('src/features/settings/tabs/DataManagementSettings.tsx');
assert(!dataManagement.includes('立即收敛'), 'DataManagementSettings must not expose a manual convergence button.');
assert(!dataManagement.includes('applyDomainConvergenceMigration'), 'DataManagementSettings must not call manual convergence use cases.');
if (exists('src/features/settings/input/goalManager/GoalEntitySection.tsx')) {
  const goalEntity = read('src/features/settings/input/goalManager/GoalEntitySection.tsx');
  assert(!goalEntity.includes('从已有记录导入目标'), 'GoalEntitySection must not expose legacy import UI.');
  assert(!goalEntity.includes('applyLegacyGoalMigration'), 'GoalEntitySection must not call legacy goal migration.');
}
const settingsUseCase = read('src/app/usecases/settings.usecase.ts');
assert(!settingsUseCase.includes('applyDomainConvergenceMigration'), 'SettingsUseCase must not expose manual convergence migration.');
const goalUseCase = read('src/app/usecases/goal.usecase.ts');
assert(!goalUseCase.includes('applyThemeOverrideGoalMigration'), 'GoalUseCase must not expose Theme × Block migration.');
assert(!goalUseCase.includes('applyLegacyGoalMigration'), 'GoalUseCase must not expose legacy goal migration.');
assert(!goalUseCase.includes('applyMarkdownGoalBackfill'), 'GoalUseCase must not expose Markdown migration/writeback.');
assert(goalUseCase.includes('delete safePatch.granularity'), 'GoalUseCase.updateGoal must ignore legacy goal granularity patches.');

const workspaceView = read('src/platform/obsidian/ThinkSettingsView.tsx');
assert(workspaceView.includes('THINK_SETTINGS_VIEW_TYPE'), 'Workspace settings view type is missing.');
assert(workspaceView.includes('openThinkSettingsWorkspaceView'), 'Workspace settings view opener is missing.');
const settingsIndex = read('src/features/settings/index.ts');
assert(settingsIndex.includes('registerThinkSettingsWorkspaceView'), 'Settings setup must register the workspace settings view.');
assert(settingsIndex.includes('think-open-control-center'), 'Settings setup must add the workspace settings command.');

const templateDiff = read('src/core/goal/templateVariantDiff.ts');
assert(templateDiff.includes('compactGoalTemplateForStorage'), 'Template Variant diff compactor is missing.');
assert(templateDiff.includes('CoreBlock is the source of truth'), 'Template Variant diff compactor must document CoreBlock as source of truth.');
const goalUseCaseText = read('src/app/usecases/goal.usecase.ts');
assert(goalUseCaseText.includes('compactGoalTemplateForStorage'), 'GoalUseCase must compact Template Variant storage before persisting.');

const resolver = read('src/core/services/GoalTemplateResolver.ts');
assert(!/TemplateResolver\.resolve\(/.test(resolver), 'GoalTemplateResolver must not fall back to Theme × Block TemplateResolver.');
assert(!/inputSettings\?\.overrides/.test(resolver), 'GoalTemplateResolver must not read inputSettings.overrides at runtime.');


const aiSnapshot = read('src/core/ai/AiConfigSnapshot.ts');
assert(aiSnapshot.includes('isSystemRecordContextField'), 'AI snapshot must hide system context fields from model-visible fields.');
assert(aiSnapshot.includes('hasEnabledBlockMatch'), 'AI snapshot must ignore stale enabledBlockIds instead of returning an empty Block snapshot.');
const aiParser = read('src/core/ai/AiNaturalLanguageRecordParser.ts');
assertBalancedQuotedArrayLines('src/core/ai/AiNaturalLanguageRecordParser.ts', 'AI parser prompt');
assert(aiParser.includes('normalizeParsedBatch'), 'AI parser must normalize target.goal/block/preset after model output.');
assert(aiParser.includes('cleanAiFieldValues'), 'AI parser must remove system context fields from AI fieldValues.');
assert(aiParser.includes('goalTemplateId'), 'AI parser prompt/normalizer must support goalTemplateId as stable Template Variant id.');
assert(!aiParser.includes('categoryKey is REQUIRED'), 'AI parser prompt must not make legacy categoryKey the required primary axis.');
assert(aiParser.includes('blockId is REQUIRED'), 'AI parser prompt must make blockId the required primary axis.');
const aiScope = read('src/features/settings/tabs/AiScopeSection.tsx');
assert(aiScope.includes('清理旧 Block ID'), 'AI settings must expose stale Block ID cleanup for migrated data.');
const quickInputContainer = read('src/features/quickinput/editor/QuickInputEditorContainer.tsx');
assert(!quickInputContainer.includes('settings.overrides'), 'QuickInput must not use Theme × Block overrides to disable themes.');

const quickFields = read('src/features/quickinput/editor/components/Fields.tsx');
assert(quickFields.includes('isSystemRecordContextField'), 'QuickInput fields must use the shared system-context field policy.');


const viewDomain = read('src/core/view-config/domainFields.ts');
assert(viewDomain.includes('normalizeViewFieldKey'), 'View domain field policy must normalize legacy view fields.');
assert(viewDomain.includes('normalizeViewConfigDomain'), 'View domain field policy must normalize legacy viewConfig axes.');
assert(viewDomain.includes("categoryKey: 'coreBlock'"), 'View filters must converge old categoryKey axis to coreBlock.');
assert(viewDomain.includes('taskStatus'), 'View domain policy must expose taskStatus for old done/open task filters.');
const fieldRegistry = read('src/core/fields/FieldRegistry.ts');
assert(fieldRegistry.includes('taskStatus'), 'Field registry must expose derived taskStatus for task views.');
const viewUseCase = read('src/app/usecases/viewinstance.usecase.ts');
assert(viewUseCase.includes('normalizeViewFilters'), 'ViewInstanceUseCase must normalize filters before saving.');
assert(viewUseCase.includes('normalizeViewGroupFields'), 'ViewInstanceUseCase must normalize group fields before saving.');

const outputPlanner = read('src/core/recordInput/snapshot/OutputPlanner.ts');
assert(outputPlanner.includes('resolveTemplatePeriodPolicy'), 'OutputPlanner must derive period only from periodPolicy-aware templates.');
const templates = read('src/core/goal/templates.ts');
assert(!/\n\s*granularity:\s*normalizeTemplatePeriodPolicy/.test(templates), 'GoalTemplate storage must not persist legacy granularity; use periodPolicy only.');
assert(!/goalGranularity\s*\|\|\s*['"]day['"]/.test(outputPlanner), 'OutputPlanner must not use goalGranularity || day fallback.');

const srcFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(relative);
    else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(relative);
  }
}
walk('src');
for (const file of srcFiles) {
  if (file === 'src/core/goal/period.ts' || file === 'src/core/types/schema.ts' || file === 'src/core/goal/types.ts') continue;
  const text = read(file);
  if (/granularity\s*:\s*['"]day['"]/.test(text)) failures.push(`${file}: must not persist default granularity: day`);
}

if (failures.length) {
  console.error('Domain convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Domain convergence gate passed.');
