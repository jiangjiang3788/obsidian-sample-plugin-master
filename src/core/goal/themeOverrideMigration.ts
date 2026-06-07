import type { Item, TemplateField, ThinkSettings, ThemeOverride } from '@/core/types/schema';
import type { CycleGranularity, GoalDefinition, GoalSettings } from './types';
import type { GoalTemplate } from './templates';
import { getGoalTemplateId } from './templates';
import { makeStableGoalIdFromPath } from './overview';
import { splitGoalPath } from './path';

export type ThemeOverrideGoalConfidence = 'mapped' | 'high' | 'medium' | 'fallback';

export interface ThemeOverrideGoalMigrationCandidate {
  overrideId: string;
  blockId: string;
  coreBlockId: string;
  blockName: string;
  themeId: string;
  themePath: string;
  goalPath: string;
  goalId: string;
  templateId: string;
  variantId: string;
  name: string;
  disabled: boolean;
  enabled: boolean;
  granularity: Exclude<CycleGranularity, 'custom'>;
  confidence: ThemeOverrideGoalConfidence;
  reason: string;
  usedRecordCount: number;
  fields?: TemplateField[];
  outputTemplate?: string;
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues: Record<string, unknown>;
}

export interface ThemeOverrideGoalMigrationPlan {
  totalOverrides: number;
  enabledOverrides: number;
  disabledOverrides: number;
  migrateCount: number;
  candidateCount: number;
  skippedCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  fallbackCount: number;
  matchedRecordCount: number;
  wouldCreateGoals: number;
  wouldCreateTemplates: number;
  candidates: ThemeOverrideGoalMigrationCandidate[];
  skipped: Array<{ overrideId: string; reason: string }>;
}

export interface BuildThemeOverrideGoalMigrationPlanOptions {
  includeDisabled?: boolean;
  /** 用户在迁移 UI 中指定的主题 -> 目标归类。key 可以是 themeId、完整主题路径或任意父级路径。 */
  themeGoalMap?: Record<string, string>;
  fallbackThemeAsGoal?: boolean;
}

const DEFAULT_OPTIONS: Required<BuildThemeOverrideGoalMigrationPlanOptions> = {
  includeDisabled: true,
  themeGoalMap: {},
  // 目标迁移不能再默认把主题当目标。没有目标线索时应留给用户归类。
  fallbackThemeAsGoal: false,
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function leaf(path: string): string {
  const parts = String(path || '').split('/').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || path;
}

function makeGoalPathFromTheme(themePath: string, overrideId: string): string {
  const normalizedTheme = splitGoalPath(themePath).goalPath || normalizeText(themePath);
  if (normalizedTheme) return normalizedTheme.startsWith('#') ? normalizedTheme : `#${normalizedTheme}`;
  return `#旧主题/${overrideId}`;
}
function normalizeThemeMap(input?: Record<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(input || {})) {
    const cleanKey = normalizeText(key);
    const cleanValue = splitGoalPath(normalizeText(value)).goalPath || normalizeText(value);
    if (cleanKey && cleanValue) result.set(cleanKey, cleanValue);
  }
  return result;
}

function resolveMappedGoalPath(themePath: string, themeId: string, themeGoalMap?: Record<string, string>): string | null {
  const map = normalizeThemeMap(themeGoalMap);
  if (map.size === 0) return null;
  const cleanThemePath = normalizeText(themePath);
  const cleanThemeId = normalizeText(themeId);
  const candidates: string[] = [];
  if (cleanThemePath) {
    const parts = cleanThemePath.split('/').map((part) => part.trim()).filter(Boolean);
    for (let index = parts.length; index >= 1; index -= 1) {
      candidates.push(parts.slice(0, index).join('/'));
    }
  }
  if (cleanThemeId) candidates.push(cleanThemeId);
  for (const candidate of candidates) {
    const mapped = map.get(candidate);
    if (mapped) return mapped;
  }
  return null;
}


function cleanGoalLiteral(value: string): string | null {
  const text = normalizeText(value)
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/[)\]\s]+$/g, '')
    .trim();
  if (!text || text.includes('{{') || text.includes('}}')) return null;
  return splitGoalPath(text).goalPath || text;
}

function extractHardcodedGoalPath(text: string): string | null {
  const source = normalizeText(text);
  if (!source) return null;
  const patterns = [
    /目标\s*::\s*([^\n\r\)\]]+)/g,
    /\(目标\s*::\s*([^\)]+)\)/g,
    /\[目标\s*::\s*([^\]]+)\]/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const parsed = cleanGoalLiteral(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function readLooseGoalPathFromItem(item: Item): string | null {
  const values: unknown[] = [
    (item as any).goalPath,
    Array.isArray((item as any).goalPaths) ? (item as any).goalPaths[0] : (item as any).goalPaths,
    item.extra?.['目标'],
    item.extra?.['goalPath'],
    item.extra?.['goalPaths'],
  ];
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = cleanGoalLiteral(String(raw));
    if (parsed) return parsed;
  }
  return null;
}

function readTemplateIdFromItem(item: Item): string | null {
  const candidates = [
    item.templateId,
    item.extra?.['模板ID'],
    item.extra?.['templateId'],
  ];
  for (const value of candidates) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
}

function buildRecordGoalStats(items: Item[]): Map<string, Map<string, number>> {
  const stats = new Map<string, Map<string, number>>();
  for (const item of items || []) {
    const templateId = readTemplateIdFromItem(item);
    if (!templateId) continue;
    const goalPath = readLooseGoalPathFromItem(item);
    if (!goalPath) continue;
    if (!stats.has(templateId)) stats.set(templateId, new Map());
    const perGoal = stats.get(templateId)!;
    perGoal.set(goalPath, (perGoal.get(goalPath) || 0) + 1);
  }
  return stats;
}

function bestRecordGoal(stats?: Map<string, number>): { goalPath: string; count: number } | null {
  if (!stats || stats.size === 0) return null;
  let best: { goalPath: string; count: number } | null = null;
  for (const [goalPath, count] of stats.entries()) {
    if (!best || count > best.count) best = { goalPath, count };
  }
  return best;
}

function rewriteTemplate(template: string | undefined, goalPath: string): string | undefined {
  let text = normalizeText(template);
  if (!text) return undefined;
  text = text.replace(/(模板来源\s*::\s*)override/g, '$1{{templateSourceType}}');
  text = text.replace(/(模板来源\s*::\s*)theme-fallback/g, '$1{{templateSourceType}}');
  text = text.replace(/(模板ID\s*::\s*)ovr_[^\s\)\]\n\r]+/g, '$1{{templateId}}');
  text = text.replace(/(目标ID\s*::\s*)[^\s\)\]\n\r]+/g, '$1{{goalId}}');
  const escapedGoal = goalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (goalPath) {
    text = text.replace(new RegExp(`(目标\\s*::\\s*)${escapedGoal}`, 'g'), '$1{{goalPath}}');
  }
  text = text.replace(/(目标\s*::\s*)(?!\{\{)[^\n\r\)\]]+/g, '$1{{goalPath}}');
  return text;
}

function inferGranularity(fields?: TemplateField[]): Exclude<CycleGranularity, 'custom'> {
  const periodField = (fields || []).find((field: any) => {
    const key = normalizeText(field.key || field.label);
    return key === '周期' || key === '统计周期';
  }) as any;
  const values = [periodField?.defaultValue, ...(periodField?.options || []).map((option: any) => option.value || option.label)].map(normalizeText).join(' ');
  if (/年|year/i.test(values)) return 'year';
  if (/季|quarter/i.test(values)) return 'quarter';
  if (/月|month/i.test(values)) return 'month';
  if (/周|week/i.test(values)) return 'week';
  return 'day';
}

function themeDefaultValues(themePath: string, icon?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (themePath) {
    result.themePath = themePath;
    result['主题'] = themePath;
  }
  if (icon) {
    result.icon = icon;
    result['图标'] = icon;
  }
  return result;
}

function isThemePathField(field: TemplateField): boolean {
  const anyField = field as any;
  const key = normalizeText(anyField.key || '').toLowerCase();
  const label = normalizeText(anyField.label || '');
  const semantic = normalizeText(anyField.semantic || anyField.semanticType || '').toLowerCase();
  return key === 'themepath' || key === '主题' || label === '主题' || semantic.includes('themepath');
}

function ensureThemePathField(fields: TemplateField[] | undefined, themePath: string): TemplateField[] | undefined {
  const normalizedThemePath = normalizeText(themePath);
  const source = fields || [];
  let found = false;
  const next = source.map((field) => {
    if (!isThemePathField(field)) return field;
    found = true;
    return { ...(field as any), defaultValue: normalizedThemePath || (field as any).defaultValue || '{{goal.themePath}}' } as TemplateField;
  });
  if (!found && normalizedThemePath) {
    next.push({
      id: 'core.field.themePath',
      key: 'themePath',
      label: '主题',
      type: 'hierarchicalSingleSelect',
      semantic: 'themePath',
      semanticType: 'path',
      hierarchical: true,
      defaultValue: normalizedThemePath,
    } as any);
  }
  return next;
}

function candidateName(themePath: string, blockName: string): string {
  const themeLeaf = leaf(themePath);
  const block = normalizeText(blockName);
  if (!themeLeaf) return block || '旧主题预设';
  if (!block || themeLeaf.includes(block) || block.includes(themeLeaf)) return themeLeaf;
  return `${themeLeaf}${block}`;
}

export function buildThemeOverrideGoalMigrationPlan(
  settings: ThinkSettings,
  items: Item[] = [],
  options: BuildThemeOverrideGoalMigrationPlanOptions = {},
): ThemeOverrideGoalMigrationPlan {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const inputSettings = settings.inputSettings || { blocks: [], themes: [], overrides: [] };
  const overrides = inputSettings.overrides || [];
  const themesById = new Map((inputSettings.themes || []).map((theme) => [theme.id, theme]));
  const blocksById = new Map((inputSettings.blocks || []).map((block) => [block.id, block]));
  const recordStats = buildRecordGoalStats(items);
  const existingGoals = new Set((settings.goalSettings?.goals || []).map((goal) => splitGoalPath(goal.goalPath || goal.title).goalPath || goal.id));
  const newGoalPaths = new Set<string>();
  const candidates: ThemeOverrideGoalMigrationCandidate[] = [];
  const skipped: Array<{ overrideId: string; reason: string }> = [];

  for (const override of overrides as Array<ThemeOverride & { status?: string }>) {
    const disabled = override.disabled === true || override.status === 'disabled';
    if (disabled && !opts.includeDisabled) {
      skipped.push({ overrideId: override.id, reason: '旧主题模板已禁用' });
      continue;
    }
    const block = blocksById.get(override.blockId);
    const theme = themesById.get(override.themeId);
    const coreBlockId = block?.coreBlockId || override.blockId;
    const blockName = block?.name || override.blockId;
    const themePath = theme?.path || override.themeId || '';
    const mapped = resolveMappedGoalPath(themePath, override.themeId, opts.themeGoalMap);
    const hardcoded = extractHardcodedGoalPath(override.outputTemplate || '');
    const recordBest = bestRecordGoal(recordStats.get(override.id));
    let goalPath = mapped || hardcoded || recordBest?.goalPath || '';
    let confidence: ThemeOverrideGoalConfidence = mapped ? 'mapped' : hardcoded ? 'high' : recordBest ? 'medium' : 'fallback';
    let reason = mapped ? '用户已把这个主题归类到目标' : hardcoded ? '模板里写死了目标' : recordBest ? `从 ${recordBest.count} 条旧记录反推出目标` : '没有目标线索，等待用户归类主题';
    if (!goalPath && opts.fallbackThemeAsGoal) {
      goalPath = makeGoalPathFromTheme(themePath, override.id);
      reason = '高级兜底：使用主题路径生成目标';
    }
    if (!goalPath) {
      skipped.push({ overrideId: override.id, reason: '无法识别目标' });
      continue;
    }
    goalPath = splitGoalPath(goalPath).goalPath || goalPath;
    const goalId = makeStableGoalIdFromPath(goalPath);
    const variantId = `legacy-${override.id}`;
    const templateId = getGoalTemplateId(goalId, coreBlockId, variantId);
    const defaultValues = themeDefaultValues(themePath, theme?.icon);
    const fieldDefaults = (override.fields || []).reduce((acc, field: any) => {
      const key = normalizeText(field.key || field.label);
      const value = normalizeText(field.defaultValue);
      // 旧主题模板中常见的 {{goal.themePath}} 是占位符，不是有效主题值。
      // 迁移后主题应固定为该预设来源主题，否则 QuickInput 会拿不到真实主题。
      if (key && value && !/\{\{.*\}\}/.test(value)) acc[key] = field.defaultValue;
      return acc;
    }, {} as Record<string, unknown>);
    Object.assign(defaultValues, fieldDefaults);
    // 主题是迁移来源，必须最后覆盖占位符，避免被旧字段默认值改回 {{goal.themePath}}。
    Object.assign(defaultValues, themeDefaultValues(themePath, theme?.icon));
    if (!existingGoals.has(goalPath)) newGoalPaths.add(goalPath);

    candidates.push({
      overrideId: override.id,
      blockId: override.blockId,
      coreBlockId,
      blockName,
      themeId: override.themeId,
      themePath,
      goalPath,
      goalId,
      templateId,
      variantId,
      name: candidateName(themePath, blockName),
      disabled,
      enabled: !disabled,
      granularity: inferGranularity(override.fields),
      confidence,
      reason,
      usedRecordCount: recordBest?.count || 0,
      fields: override.fields,
      outputTemplate: rewriteTemplate(override.outputTemplate, goalPath),
      targetFile: override.targetFile,
      appendUnderHeader: override.appendUnderHeader || '## {{goalPath}}',
      defaultValues,
    });
  }

  const enabledOverrides = overrides.filter((item: any) => item.disabled !== true && item.status !== 'disabled').length;
  const highConfidenceCount = candidates.filter((item) => item.confidence === 'high').length;
  const mediumConfidenceCount = candidates.filter((item) => item.confidence === 'medium').length;
  const fallbackCount = candidates.filter((item) => item.confidence === 'fallback').length;
  const matchedRecordCount = candidates.reduce((sum, item) => sum + item.usedRecordCount, 0);
  return {
    totalOverrides: overrides.length,
    enabledOverrides,
    disabledOverrides: overrides.length - enabledOverrides,
    migrateCount: candidates.length,
    candidateCount: candidates.length,
    skippedCount: skipped.length,
    highConfidenceCount,
    mediumConfidenceCount,
    fallbackCount,
    matchedRecordCount,
    wouldCreateGoals: newGoalPaths.size,
    wouldCreateTemplates: candidates.length,
    candidates,
    skipped,
  };
}

export function buildGoalDefinitionFromThemeMigration(candidate: ThemeOverrideGoalMigrationCandidate, existing?: GoalDefinition | null): GoalDefinition {
  const timestamp = nowIso();
  const title = splitGoalPath(candidate.goalPath).leafGoal || candidate.goalPath;
  return {
    ...(existing || {}),
    id: candidate.goalId,
    title,
    goalPath: candidate.goalPath,
    description: existing?.description,
    status: existing?.status || 'active',
    parentGoalId: existing?.parentGoalId ?? null,
    themePath: existing?.themePath ?? null,
    granularity: existing?.granularity || 'day',
    metrics: existing?.metrics || [],
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function buildGoalTemplateFromThemeMigration(candidate: ThemeOverrideGoalMigrationCandidate): GoalTemplate {
  const timestamp = nowIso();
  return {
    id: candidate.templateId,
    goalId: candidate.goalId,
    coreBlockId: candidate.coreBlockId,
    variantId: candidate.variantId,
    name: candidate.name,
    description: `由旧主题模板迁移：${candidate.themePath || candidate.themeId}`,
    isDefault: true,
    granularity: candidate.granularity,
    sortOrder: 0,
    enabled: candidate.enabled,
    fields: ensureThemePathField(candidate.fields, candidate.themePath),
    outputTemplate: candidate.outputTemplate,
    targetFile: candidate.targetFile,
    appendUnderHeader: candidate.appendUnderHeader,
    defaultValues: {
      ...candidate.defaultValues,
      legacyOverrideId: candidate.overrideId,
      legacyThemePath: candidate.themePath,
    },
    requiredFields: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeGoalSettingsForMigration(goalSettings?: GoalSettings): GoalSettings {
  return {
    goals: [...(goalSettings?.goals || [])],
    cycles: [...(goalSettings?.cycles || [])],
    goalBlockBindings: [...(goalSettings?.goalBlockBindings || [])],
    goalRecordRelations: [...(goalSettings?.goalRecordRelations || [])],
  };
}

export interface ThemeOverrideGoalMigrationValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'ok';
  title: string;
  description: string;
  count: number;
}

export interface ThemeOverrideGoalMigrationValidationReport {
  ready: boolean;
  errorCount: number;
  warningCount: number;
  legacyOverrideCount: number;
  legacyRecordCount: number;
  goalCount: number;
  goalTemplateCount: number;
  legacyGoalTemplateCount: number;
  orphanTemplateCount: number;
  multipleDefaultCellCount: number;
  missingThemeDefaultCount: number;
  issues: ThemeOverrideGoalMigrationValidationIssue[];
}


export interface LegacyOverrideRecordTarget {
  legacyOverrideId: string;
  templateId: string;
  goalId: string;
  goalPath: string;
  coreBlockId: string;
  themePath?: string;
}

export interface ThemeOverrideRecordMigrationPreviewItem {
  itemId: string;
  title: string;
  oldTemplateId: string;
  status: 'rewriteable' | 'unresolved';
  targetTemplateId?: string;
  goalPath?: string;
  coreBlockId?: string;
}

export interface ThemeOverrideRecordMigrationPreview {
  legacyRecordCount: number;
  rewriteableCount: number;
  unresolvedCount: number;
  targetCount: number;
  samples: ThemeOverrideRecordMigrationPreviewItem[];
}



export type ThemeOverrideRecordShape = 'task-inline' | 'block-metadata' | 'mixed' | 'unknown';

export interface ThemeOverrideRecordDeepScanSample {
  itemId: string;
  title: string;
  type: 'task' | 'block';
  filePath?: string;
  line?: number;
  shape: ThemeOverrideRecordShape;
  oldTemplateId: string;
  oldSource: string;
  goalPath?: string;
  themePath?: string;
  coreBlockId?: string;
  targetTemplateId?: string;
  targetGoalPath?: string;
  status: 'rewriteable' | 'unresolved';
}

export interface ThemeOverrideRecordDeepScanOverrideRow {
  oldTemplateId: string;
  count: number;
  rewriteableCount: number;
  unresolvedCount: number;
  targetGoalPath?: string;
}

export interface ThemeOverrideRecordDeepScanReport {
  itemCount: number;
  legacyRecordCount: number;
  rewriteableCount: number;
  unresolvedCount: number;
  taskInlineCount: number;
  blockMetadataCount: number;
  mixedCount: number;
  unknownShapeCount: number;
  recordsWithGoalCount: number;
  recordsWithThemeCount: number;
  recordsWithCoreBlockCount: number;
  recordsWithTemplateIdCount: number;
  recordsWithTemplateSourceCount: number;
  topOverrides: ThemeOverrideRecordDeepScanOverrideRow[];
  samples: ThemeOverrideRecordDeepScanSample[];
}

export interface ThemeOverrideMigrationAuditRow {
  id: string;
  label: string;
  count: number;
  status: 'ok' | 'warning' | 'error' | 'info';
  description: string;
}

export interface ThemeOverrideMigrationAuditThemeRow {
  themeId: string;
  themePath: string;
  overrideCount: number;
  migratedPresetCount: number;
  pendingOverrideCount: number;
}

export interface ThemeOverrideMigrationAuditBlockRow {
  blockId: string;
  blockName: string;
  overrideCount: number;
  migratedPresetCount: number;
}

export interface ThemeOverrideMigrationAudit {
  blockCount: number;
  themeCount: number;
  themeWithOverrideCount: number;
  overrideCount: number;
  enabledOverrideCount: number;
  disabledOverrideCount: number;
  goalCount: number;
  goalTemplateCount: number;
  legacyGoalTemplateCount: number;
  pendingOverrideCount: number;
  itemCount: number;
  legacyRecordCount: number;
  rewriteableRecordCount: number;
  unresolvedRecordCount: number;
  recordsWithGoalCount: number;
  recordsWithThemeCount: number;
  recordsWithCoreBlockCount: number;
  rows: ThemeOverrideMigrationAuditRow[];
  topThemes: ThemeOverrideMigrationAuditThemeRow[];
  topBlocks: ThemeOverrideMigrationAuditBlockRow[];
}

function recordHasGoal(item: Item): boolean {
  return Boolean(readLooseGoalPathFromItem(item));
}

function recordHasTheme(item: Item): boolean {
  const values = [
    (item as any).themePath,
    item.extra?.['主题'],
    item.extra?.['themePath'],
  ];
  return values.some((value) => normalizeText(Array.isArray(value) ? value[0] : value));
}

function recordHasCoreBlock(item: Item): boolean {
  const values = [
    (item as any).coreBlock,
    (item as any).coreBlockId,
    item.extra?.['核心Block'],
    item.extra?.['coreBlock'],
    item.extra?.['coreBlockId'],
  ];
  return values.some((value) => normalizeText(Array.isArray(value) ? value[0] : value));
}

export function buildThemeOverrideMigrationAudit(settings: ThinkSettings, items: Item[] = []): ThemeOverrideMigrationAudit {
  const inputSettings = settings.inputSettings || { blocks: [], themes: [], overrides: [] };
  const blocks = inputSettings.blocks || [];
  const themes = inputSettings.themes || [];
  const overrides = inputSettings.overrides || [];
  const goalSettings = settings.goalSettings || normalizeGoalSettingsForMigration();
  const targets = buildLegacyOverrideTemplateTargets(settings);
  const migratedOverrideIds = new Set(Object.keys(targets));
  const recordPreview = buildThemeOverrideRecordMigrationPreview(settings, items, 0);

  const themesById = new Map(themes.map((theme: any) => [theme.id, theme]));
  const blocksById = new Map(blocks.map((block: any) => [block.id, block]));
  const themeCounts = new Map<string, { themeId: string; themePath: string; overrideCount: number; migratedPresetCount: number; pendingOverrideCount: number }>();
  const blockCounts = new Map<string, { blockId: string; blockName: string; overrideCount: number; migratedPresetCount: number }>();
  let enabledOverrideCount = 0;
  let disabledOverrideCount = 0;
  let pendingOverrideCount = 0;

  for (const override of overrides as any[]) {
    const disabled = Boolean(override.disabled) || override.status === 'disabled';
    if (disabled) disabledOverrideCount += 1;
    else enabledOverrideCount += 1;
    if (!migratedOverrideIds.has(override.id)) pendingOverrideCount += 1;

    const theme: any = themesById.get(override.themeId);
    const themePath = theme?.path || override.themeId || '(无主题)';
    const themeRow = themeCounts.get(override.themeId) || { themeId: override.themeId, themePath, overrideCount: 0, migratedPresetCount: 0, pendingOverrideCount: 0 };
    themeRow.overrideCount += 1;
    if (migratedOverrideIds.has(override.id)) themeRow.migratedPresetCount += 1;
    else themeRow.pendingOverrideCount += 1;
    themeCounts.set(override.themeId, themeRow);

    const block: any = blocksById.get(override.blockId);
    const blockName = block?.name || block?.categoryKey || override.blockId || '(无Block)';
    const blockRow = blockCounts.get(override.blockId) || { blockId: override.blockId, blockName, overrideCount: 0, migratedPresetCount: 0 };
    blockRow.overrideCount += 1;
    if (migratedOverrideIds.has(override.id)) blockRow.migratedPresetCount += 1;
    blockCounts.set(override.blockId, blockRow);
  }

  let recordsWithGoalCount = 0;
  let recordsWithThemeCount = 0;
  let recordsWithCoreBlockCount = 0;
  for (const item of items || []) {
    if (recordHasGoal(item)) recordsWithGoalCount += 1;
    if (recordHasTheme(item)) recordsWithThemeCount += 1;
    if (recordHasCoreBlock(item)) recordsWithCoreBlockCount += 1;
  }

  const legacyGoalTemplateCount = (goalSettings.goalBlockBindings || []).filter((template: any) => normalizeText(template.defaultValues?.legacyOverrideId)).length;
  const rows: ThemeOverrideMigrationAuditRow[] = [
    {
      id: 'blocks',
      label: 'Block / 记录类型',
      count: blocks.length,
      status: blocks.length ? 'ok' : 'warning',
      description: blocks.length ? '已有记录类型，可作为目标预设的列。' : '没有找到记录类型，迁移前需要先配置 Block。',
    },
    {
      id: 'themes',
      label: '主题',
      count: themes.length,
      status: themes.length ? 'info' : 'warning',
      description: themes.length ? '主题会作为表单默认主题和统计二级维度保留。' : '没有主题可归类。',
    },
    {
      id: 'theme-overrides',
      label: '旧主题表单',
      count: overrides.length,
      status: overrides.length ? 'warning' : 'ok',
      description: overrides.length ? '这些 Theme × Block 表单需要迁移为目标 × Block 预设。' : '没有旧主题表单残留。',
    },
    {
      id: 'goal-templates',
      label: '目标预设',
      count: goalSettings.goalBlockBindings?.length || 0,
      status: goalSettings.goalBlockBindings?.length ? 'ok' : 'info',
      description: goalSettings.goalBlockBindings?.length ? '目标 × Block 预设已经存在。' : '还没有目标预设。',
    },
    {
      id: 'legacy-records',
      label: '旧记录标记',
      count: recordPreview.legacyRecordCount,
      status: recordPreview.legacyRecordCount ? 'warning' : 'ok',
      description: recordPreview.legacyRecordCount ? '这些记录还写着 override 模板来源，需要改写。' : '没有发现旧 override 记录。',
    },
    {
      id: 'rewriteable-records',
      label: '可自动改写记录',
      count: recordPreview.rewriteableCount,
      status: recordPreview.rewriteableCount ? 'ok' : 'info',
      description: recordPreview.rewriteableCount ? '这些旧记录能匹配到新目标预设。' : '当前没有可自动改写的旧记录。',
    },
  ];

  return {
    blockCount: blocks.length,
    themeCount: themes.length,
    themeWithOverrideCount: themeCounts.size,
    overrideCount: overrides.length,
    enabledOverrideCount,
    disabledOverrideCount,
    goalCount: goalSettings.goals?.length || 0,
    goalTemplateCount: goalSettings.goalBlockBindings?.length || 0,
    legacyGoalTemplateCount,
    pendingOverrideCount,
    itemCount: items.length,
    legacyRecordCount: recordPreview.legacyRecordCount,
    rewriteableRecordCount: recordPreview.rewriteableCount,
    unresolvedRecordCount: recordPreview.unresolvedCount,
    recordsWithGoalCount,
    recordsWithThemeCount,
    recordsWithCoreBlockCount,
    rows,
    topThemes: Array.from(themeCounts.values()).sort((left, right) => right.overrideCount - left.overrideCount).slice(0, 12),
    topBlocks: Array.from(blockCounts.values()).sort((left, right) => right.overrideCount - left.overrideCount).slice(0, 12),
  };
}

export function buildLegacyOverrideTemplateTargets(settings: ThinkSettings): Record<string, LegacyOverrideRecordTarget> {
  const goalSettings = settings.goalSettings || normalizeGoalSettingsForMigration();
  const goalsById = new Map((goalSettings.goals || []).map((goal) => [goal.id, goal]));
  const result: Record<string, LegacyOverrideRecordTarget> = {};
  for (const template of goalSettings.goalBlockBindings || []) {
    const defaults = (template as any).defaultValues || {};
    const legacyOverrideId = normalizeText(defaults.legacyOverrideId);
    if (!legacyOverrideId) continue;
    const goal = goalsById.get(template.goalId);
    result[legacyOverrideId] = {
      legacyOverrideId,
      templateId: template.id,
      goalId: template.goalId,
      goalPath: goal?.goalPath || goal?.title || template.goalId,
      coreBlockId: template.coreBlockId,
      themePath: normalizeText(defaults.themePath || defaults['主题'] || defaults.legacyThemePath) || undefined,
    };
  }
  return result;
}

export function buildThemeOverrideRecordMigrationPreview(settings: ThinkSettings, items: Item[] = [], limit = 20): ThemeOverrideRecordMigrationPreview {
  const targets = buildLegacyOverrideTemplateTargets(settings);
  let legacyRecordCount = 0;
  let rewriteableCount = 0;
  let unresolvedCount = 0;
  const samples: ThemeOverrideRecordMigrationPreviewItem[] = [];
  for (const item of items || []) {
    if (!itemHasLegacyOverrideMarker(item)) continue;
    legacyRecordCount += 1;
    const oldTemplateId = readTemplateIdFromItem(item) || '';
    const target = oldTemplateId ? targets[oldTemplateId] : undefined;
    if (target) rewriteableCount += 1;
    else unresolvedCount += 1;
    if (samples.length < limit) {
      samples.push({
        itemId: String((item as any).id || ''),
        title: normalizeText((item as any).title || (item as any).content || item.extra?.['内容'] || item.extra?.['任务内容']) || '(无标题)',
        oldTemplateId,
        status: target ? 'rewriteable' : 'unresolved',
        targetTemplateId: target?.templateId,
        goalPath: target?.goalPath,
        coreBlockId: target?.coreBlockId,
      });
    }
  }
  return {
    legacyRecordCount,
    rewriteableCount,
    unresolvedCount,
    targetCount: Object.keys(targets).length,
    samples,
  };
}

function itemHasLegacyOverrideMarker(item: Item): boolean {
  const source = normalizeText((item as any).templateSourceType || item.extra?.['模板来源'] || item.extra?.['templateSourceType']);
  const templateId = normalizeText((item as any).templateId || item.extra?.['模板ID'] || item.extra?.['templateId']);
  return source === 'override' || /^ovr_/.test(templateId);
}


function readLooseThemePathFromItem(item: Item): string | null {
  const values: unknown[] = [
    (item as any).themePath,
    item.extra?.['主题'],
    item.extra?.['themePath'],
    (item as any).theme,
  ];
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const raw = Array.isArray(value) ? value[0] : value;
    const text = normalizeText(raw);
    if (text) return text;
  }
  return null;
}

function readLooseCoreBlockFromItem(item: Item): string | null {
  const values: unknown[] = [
    (item as any).coreBlock,
    (item as any).coreBlockId,
    item.extra?.['核心Block'],
    item.extra?.['coreBlock'],
    item.extra?.['coreBlockId'],
  ];
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const raw = Array.isArray(value) ? value[0] : value;
    const text = normalizeText(raw);
    if (text) return text;
  }
  return null;
}

function readTemplateSourceFromItem(item: Item): string {
  return normalizeText((item as any).templateSourceType || item.extra?.['模板来源'] || item.extra?.['templateSourceType']);
}

function detectRecordShape(item: Item): ThemeOverrideRecordShape {
  const raw = normalizeText((item as any).rawSource || (item as any).fullData || item.content || item.title);
  const hasParenMeta = /\(\s*(模板ID|模板来源|目标|主题|核心Block)\s*::/.test(raw);
  const hasLineMeta = /(^|\n)\s*(模板ID|模板来源|目标|主题|核心Block)\s*::/m.test(raw);
  if (item.type === 'task' || hasParenMeta) return hasLineMeta ? 'mixed' : 'task-inline';
  if (hasLineMeta) return 'block-metadata';
  return 'unknown';
}

export function buildThemeOverrideRecordDeepScan(settings: ThinkSettings, items: Item[] = [], limit = 20): ThemeOverrideRecordDeepScanReport {
  const targets = buildLegacyOverrideTemplateTargets(settings);
  const topMap = new Map<string, ThemeOverrideRecordDeepScanOverrideRow>();
  const samples: ThemeOverrideRecordDeepScanSample[] = [];
  let legacyRecordCount = 0;
  let rewriteableCount = 0;
  let unresolvedCount = 0;
  let taskInlineCount = 0;
  let blockMetadataCount = 0;
  let mixedCount = 0;
  let unknownShapeCount = 0;
  let recordsWithGoalCount = 0;
  let recordsWithThemeCount = 0;
  let recordsWithCoreBlockCount = 0;
  let recordsWithTemplateIdCount = 0;
  let recordsWithTemplateSourceCount = 0;

  for (const item of items || []) {
    const oldTemplateId = readTemplateIdFromItem(item) || '';
    const oldSource = readTemplateSourceFromItem(item);
    if (oldTemplateId) recordsWithTemplateIdCount += 1;
    if (oldSource) recordsWithTemplateSourceCount += 1;
    const goalPath = readLooseGoalPathFromItem(item) || undefined;
    const themePath = readLooseThemePathFromItem(item) || undefined;
    const coreBlockId = readLooseCoreBlockFromItem(item) || undefined;
    if (goalPath) recordsWithGoalCount += 1;
    if (themePath) recordsWithThemeCount += 1;
    if (coreBlockId) recordsWithCoreBlockCount += 1;
    if (!itemHasLegacyOverrideMarker(item)) continue;

    legacyRecordCount += 1;
    const target = oldTemplateId ? targets[oldTemplateId] : undefined;
    if (target) rewriteableCount += 1;
    else unresolvedCount += 1;
    const shape = detectRecordShape(item);
    if (shape === 'task-inline') taskInlineCount += 1;
    else if (shape === 'block-metadata') blockMetadataCount += 1;
    else if (shape === 'mixed') mixedCount += 1;
    else unknownShapeCount += 1;

    const topKey = oldTemplateId || '(无模板ID)';
    const top = topMap.get(topKey) || { oldTemplateId: topKey, count: 0, rewriteableCount: 0, unresolvedCount: 0, targetGoalPath: target?.goalPath };
    top.count += 1;
    if (target) top.rewriteableCount += 1;
    else top.unresolvedCount += 1;
    if (target?.goalPath) top.targetGoalPath = target.goalPath;
    topMap.set(topKey, top);

    if (samples.length < limit) {
      samples.push({
        itemId: String((item as any).id || ''),
        title: normalizeText((item as any).title || (item as any).content || item.extra?.['内容'] || item.extra?.['任务内容']) || '(无标题)',
        type: item.type,
        filePath: item.file?.path || (item as any).fileName || (item as any).filename,
        line: item.file?.line,
        shape,
        oldTemplateId,
        oldSource,
        goalPath,
        themePath,
        coreBlockId,
        targetTemplateId: target?.templateId,
        targetGoalPath: target?.goalPath,
        status: target ? 'rewriteable' : 'unresolved',
      });
    }
  }

  return {
    itemCount: items.length,
    legacyRecordCount,
    rewriteableCount,
    unresolvedCount,
    taskInlineCount,
    blockMetadataCount,
    mixedCount,
    unknownShapeCount,
    recordsWithGoalCount,
    recordsWithThemeCount,
    recordsWithCoreBlockCount,
    recordsWithTemplateIdCount,
    recordsWithTemplateSourceCount,
    topOverrides: Array.from(topMap.values()).sort((left, right) => right.count - left.count).slice(0, 12),
    samples,
  };
}

function templateHasThemeDefault(template: GoalTemplate): boolean {
  const defaults = (template as any).defaultValues || {};
  const defaultTheme = normalizeText(defaults.themePath || defaults['主题'] || defaults.legacyThemePath);
  if (defaultTheme) return true;
  return (template.fields || []).some((field) => {
    const anyField = field as any;
    return isThemePathField(field) && normalizeText(anyField.defaultValue);
  });
}

export function validateThemeOverrideGoalMigration(settings: ThinkSettings, items: Item[] = []): ThemeOverrideGoalMigrationValidationReport {
  const goalSettings = settings.goalSettings || normalizeGoalSettingsForMigration();
  const goals = goalSettings.goals || [];
  const templates = goalSettings.goalBlockBindings || [];
  const goalsById = new Set(goals.map((goal) => goal.id));
  const legacyOverrideCount = settings.inputSettings?.overrides?.length || 0;
  const legacyRecordCount = (items || []).filter(itemHasLegacyOverrideMarker).length;
  const legacyGoalTemplateCount = templates.filter((template: any) => normalizeText(template.defaultValues?.legacyOverrideId)).length;
  const orphanTemplateCount = templates.filter((template) => !goalsById.has(template.goalId)).length;
  const missingThemeDefaultCount = templates.filter((template) => !templateHasThemeDefault(template)).length;
  const defaultCounts = new Map<string, number>();
  for (const template of templates) {
    if (!template.isDefault) continue;
    const key = `${template.goalId}::${template.coreBlockId}`;
    defaultCounts.set(key, (defaultCounts.get(key) || 0) + 1);
  }
  const multipleDefaultCellCount = Array.from(defaultCounts.values()).filter((count) => count > 1).length;
  const issues: ThemeOverrideGoalMigrationValidationIssue[] = [];
  issues.push({
    id: 'legacy-overrides',
    level: legacyOverrideCount ? 'warning' : 'ok',
    title: '旧主题模板残留',
    description: legacyOverrideCount ? '仍有旧 Theme × Block 模板留在 inputSettings.overrides。已确认迁移完成后可以继续清理。' : '没有旧主题模板残留。',
    count: legacyOverrideCount,
  });
  issues.push({
    id: 'legacy-records',
    level: legacyRecordCount ? 'warning' : 'ok',
    title: '旧记录标记残留',
    description: legacyRecordCount ? '仍有记录使用 模板来源:: override 或 模板ID:: ovr_xxx。建议继续执行旧记录改写。' : '没有旧 override 记录标记。',
    count: legacyRecordCount,
  });
  issues.push({
    id: 'orphan-templates',
    level: orphanTemplateCount ? 'error' : 'ok',
    title: '孤儿预设',
    description: orphanTemplateCount ? '存在找不到目标的目标预设，需要先修复或删除。' : '所有预设都能找到目标。',
    count: orphanTemplateCount,
  });
  issues.push({
    id: 'multiple-defaults',
    level: multipleDefaultCellCount ? 'error' : 'ok',
    title: '多个默认预设',
    description: multipleDefaultCellCount ? '部分目标 × Block 单元格里存在多个默认预设，需要保留一个。' : '每个目标 × Block 最多一个默认预设。',
    count: multipleDefaultCellCount,
  });
  issues.push({
    id: 'missing-theme-default',
    level: missingThemeDefaultCount ? 'warning' : 'ok',
    title: '预设缺少默认主题',
    description: missingThemeDefaultCount ? '部分预设没有默认主题。数据不会丢，但 QuickInput 中主题可能为空。' : '预设都保留了主题默认值。',
    count: missingThemeDefaultCount,
  });
  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;
  return {
    ready: errorCount === 0 && legacyRecordCount === 0,
    errorCount,
    warningCount,
    legacyOverrideCount,
    legacyRecordCount,
    goalCount: goals.length,
    goalTemplateCount: templates.length,
    legacyGoalTemplateCount,
    orphanTemplateCount,
    multipleDefaultCellCount,
    missingThemeDefaultCount,
    issues,
  };
}


export type ThemeOverrideMigrationRegressionStatus = 'ok' | 'warning' | 'error';

export interface ThemeOverrideMigrationBlockRegressionRow {
  coreBlockId: string;
  blockName: string;
  presetCount: number;
  defaultPresetCount: number;
  fieldCount: number;
  hasOutputTemplate: boolean;
  status: ThemeOverrideMigrationRegressionStatus;
  description: string;
}

export interface ThemeOverrideMigrationRegressionReport {
  ready: boolean;
  blockCount: number;
  newRecordReadyCount: number;
  newRecordWarningCount: number;
  newRecordErrorCount: number;
  oldRecordEditReady: boolean;
  legacyRecordCount: number;
  legacyRecordRewriteableCount: number;
  legacyRecordUnresolvedCount: number;
  recordsWithCoreBlockCount: number;
  recordsWithGoalCount: number;
  recordsWithThemeCount: number;
  rows: ThemeOverrideMigrationBlockRegressionRow[];
}

function isTemplateEnabled(template: GoalTemplate): boolean {
  return (template as any).enabled !== false;
}

export function buildThemeOverrideMigrationRegressionReport(settings: ThinkSettings, items: Item[] = []): ThemeOverrideMigrationRegressionReport {
  const blocks = settings.inputSettings?.blocks || [];
  const goalSettings = settings.goalSettings || normalizeGoalSettingsForMigration();
  const templates = (goalSettings.goalBlockBindings || []).filter(isTemplateEnabled);
  const templatesByCoreBlock = new Map<string, GoalTemplate[]>();
  for (const template of templates) {
    const key = normalizeText(template.coreBlockId);
    if (!key) continue;
    const list = templatesByCoreBlock.get(key) || [];
    list.push(template);
    templatesByCoreBlock.set(key, list);
  }

  const rows: ThemeOverrideMigrationBlockRegressionRow[] = blocks.map((block: any) => {
    const coreBlockId = normalizeText(block.coreBlockId || block.id);
    const presets = templatesByCoreBlock.get(coreBlockId) || [];
    const defaultPresetCount = presets.filter((template) => template.isDefault).length;
    const fieldCount = Array.isArray(block.fields) ? block.fields.length : 0;
    const hasOutputTemplate = Boolean(normalizeText(block.outputTemplate));
    let status: ThemeOverrideMigrationRegressionStatus = 'ok';
    let description = '可以新建记录：有目标预设，也有 Block 默认表单作为兜底。';
    if (!hasOutputTemplate) {
      status = 'error';
      description = 'Block 缺少输出模板，新建记录可能无法写入。';
    } else if (presets.length === 0) {
      status = 'warning';
      description = '没有目标预设，会使用 Block 默认表单；如果这个 Block 需要目标专属表单，建议补一个预设。';
    } else if (defaultPresetCount === 0) {
      status = 'warning';
      description = '已有目标预设，但没有默认预设；多预设场景可能需要手动选择。';
    }
    return {
      coreBlockId,
      blockName: normalizeText(block.name || block.categoryKey || block.id) || coreBlockId,
      presetCount: presets.length,
      defaultPresetCount,
      fieldCount,
      hasOutputTemplate,
      status,
      description,
    };
  });

  const deepScan = buildThemeOverrideRecordDeepScan(settings, items, 0);
  const newRecordErrorCount = rows.filter((row) => row.status === 'error').length;
  const newRecordWarningCount = rows.filter((row) => row.status === 'warning').length;
  const newRecordReadyCount = rows.filter((row) => row.status === 'ok').length;
  const oldRecordEditReady = deepScan.legacyRecordCount === 0 || (deepScan.unresolvedCount === 0 && deepScan.recordsWithCoreBlockCount >= deepScan.legacyRecordCount);

  return {
    ready: newRecordErrorCount === 0 && oldRecordEditReady,
    blockCount: rows.length,
    newRecordReadyCount,
    newRecordWarningCount,
    newRecordErrorCount,
    oldRecordEditReady,
    legacyRecordCount: deepScan.legacyRecordCount,
    legacyRecordRewriteableCount: deepScan.rewriteableCount,
    legacyRecordUnresolvedCount: deepScan.unresolvedCount,
    recordsWithCoreBlockCount: deepScan.recordsWithCoreBlockCount,
    recordsWithGoalCount: deepScan.recordsWithGoalCount,
    recordsWithThemeCount: deepScan.recordsWithThemeCount,
    rows,
  };
}

export function buildThemeOverrideMigrationSummaryReport(settings: ThinkSettings, items: Item[] = []): string {
  const audit = buildThemeOverrideMigrationAudit(settings, items);
  const validation = validateThemeOverrideGoalMigration(settings, items);
  const regression = buildThemeOverrideMigrationRegressionReport(settings, items);
  const deepScan = buildThemeOverrideRecordDeepScan(settings, items, 0);
  const lines: string[] = [];
  lines.push('# ThinkOS 目标迁移收尾报告');
  lines.push('');
  lines.push(`生成时间：${nowIso()}`);
  lines.push('');
  lines.push('## 总览');
  lines.push(`- 目标数：${audit.goalCount}`);
  lines.push(`- 目标预设数：${audit.goalTemplateCount}`);
  lines.push(`- 旧主题表单残留：${audit.overrideCount}`);
  lines.push(`- 旧记录标记残留：${deepScan.legacyRecordCount}`);
  lines.push(`- 可自动改写旧记录：${deepScan.rewriteableCount}`);
  lines.push(`- 未匹配旧记录：${deepScan.unresolvedCount}`);
  lines.push('');
  lines.push('## 验证');
  for (const issue of validation.issues) {
    const prefix = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : '✅';
    lines.push(`- ${prefix} ${issue.title}：${issue.count}。${issue.description}`);
  }
  lines.push('');
  lines.push('## 新建记录回归');
  lines.push(`- 可直接新建：${regression.newRecordReadyCount}/${regression.blockCount}`);
  lines.push(`- 提醒：${regression.newRecordWarningCount}`);
  lines.push(`- 阻断：${regression.newRecordErrorCount}`);
  for (const row of regression.rows) {
    const prefix = row.status === 'error' ? '❌' : row.status === 'warning' ? '⚠️' : '✅';
    lines.push(`- ${prefix} ${row.blockName}：预设 ${row.presetCount}，默认 ${row.defaultPresetCount}，字段 ${row.fieldCount}。${row.description}`);
  }
  lines.push('');
  lines.push('## 旧记录编辑回归');
  lines.push(`- 状态：${regression.oldRecordEditReady ? '可以继续编辑' : '仍需处理未匹配旧记录'}`);
  lines.push(`- 旧记录：${regression.legacyRecordCount}`);
  lines.push(`- 未匹配：${regression.legacyRecordUnresolvedCount}`);
  lines.push(`- 有核心Block字段：${regression.recordsWithCoreBlockCount}`);
  lines.push(`- 有目标字段：${regression.recordsWithGoalCount}`);
  lines.push(`- 有主题字段：${regression.recordsWithThemeCount}`);
  lines.push('');
  lines.push('## 建议下一步');
  if (validation.legacyRecordCount > 0) lines.push('- 继续执行“深度改写旧记录”，直到旧记录标记为 0。');
  if (validation.legacyOverrideCount > 0) lines.push('- 确认迁移无误后执行“清理旧主题表单”。');
  if (regression.newRecordErrorCount > 0) lines.push('- 先修复缺少输出模板的 Block。');
  if (validation.ready && regression.ready) lines.push('- 迁移状态良好，可以进入最终清理和构建验证。');
  return lines.join('\n');
}
