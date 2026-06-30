import type { CoreBlockDefinition, GoalDefinition, GoalTemplate, TemplateField, ThemeDefinition, UnknownRecord } from '@core/public';
import {
  compactGoalTemplateForStorage,
  describeGoalTemplateStorageDiff,
  getGoalTemplateDisplayName,
  getGoalTemplateId,
  inferGoalTemplateEditMode,
  isGeneratedGoalTemplateName,
  isPeriodAwareCoreBlock,
  isSystemRecordContextField,
  normalizePeriodPolicyGranularity,
  readGoalTemplateThemePath,
  asUnknownRecord,
  isUnknownRecord,
  readFirstString,
  readString,
} from '@core/public';

export type GoalTemplateEditMode = 'inherit' | 'override' | 'disabled';

export interface GoalTemplateDraftState {
  variantId: string;
  name: string;
  description: string;
  granularity: 'week' | 'month' | 'quarter' | 'year';
  sortOrder: number;
  fields: TemplateField[];
  outputTemplate: string;
  targetFile: string;
  appendUnderHeader: string;
  requiredFields: string[];
  defaultValues: Record<string, unknown>;
  themePath: string;
}

export interface GoalTemplateThemeOption {
  value: string;
  label: string;
}

export const presetGranularityOptions: GoalTemplateThemeOption[] = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
];

export function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readOptionText(value: unknown): string {
  if (value === undefined || value === null) return '';
  const record = asUnknownRecord(value);
  if (record && 'value' in record) return compactText(record.value);
  return compactText(value);
}

function cleanPathSegment(value: unknown): string {
  return compactText(value).replace(/^[#＃]+\s*/, '').trim();
}

export function normalizeThemePath(path?: unknown): string {
  return compactText(path)
    .split('/')
    .map(cleanPathSegment)
    .filter(Boolean)
    .join('/');
}

export function cleanDisplayThemePath(path?: unknown): string {
  return normalizeThemePath(path) || compactText(path);
}

export function themeLeafLabel(path?: unknown, fallback = ''): string {
  const normalized = normalizeThemePath(path);
  return normalized.split('/').filter(Boolean).pop() || fallback;
}

function getFieldSemantic(field: TemplateField): string {
  return compactText(field.semantic || field.semanticType).toLowerCase();
}

function isThemeField(field: TemplateField): boolean {
  const key = compactText(field.key).toLowerCase();
  const label = compactText(field.label);
  const semantic = getFieldSemantic(field);
  return key === 'themepath' || key === '主题' || label === '主题' || semantic.includes('themepath') || semantic === 'theme';
}

function isIconField(field: TemplateField): boolean {
  const key = compactText(field.key).toLowerCase();
  const label = compactText(field.label);
  const semantic = getFieldSemantic(field);
  return key === 'icon' || key === '图标' || label === '图标' || semantic === 'icon';
}

export function readThemePathFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isThemeField(field)) continue;
    const value = readOptionText(field.defaultValue);
    if (value && value !== '{{goal.themePath}}') return normalizeThemePath(value);
  }
  return '';
}

export function readThemePathFromTemplate(template: GoalTemplate | null | undefined): string {
  return normalizeThemePath(readGoalTemplateThemePath(template));
}

export function ensureThemeField(fields: TemplateField[], themePath: string): TemplateField[] {
  const normalizedThemePath = normalizeThemePath(themePath);
  let touched = false;
  const next = (fields || []).map((field) => {
    if (!isThemeField(field)) return field;
    touched = true;
    return { ...field, defaultValue: normalizedThemePath || field.defaultValue || '{{goal.themePath}}' };
  });
  if (!touched && normalizedThemePath) {
    next.push({
      id: 'themePath',
      key: 'themePath',
      label: '主题',
      type: 'path',
      semanticType: 'themePath',
      defaultValue: normalizedThemePath,
    });
  }
  return next;
}

export function mergeDefaultValues(draft: Pick<GoalTemplateDraftState, 'defaultValues' | 'fields' | 'themePath'>, themeIcon?: string): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(draft.defaultValues || {}) };
  const themePath = normalizeThemePath(draft.themePath) || readThemePathFromFields(draft.fields);
  if (themePath) {
    result.themePath = themePath;
    result['主题'] = themePath;
  }
  const icon = compactText(themeIcon) || readIconFromFields(draft.fields);
  if (icon) {
    result.icon = icon;
    result['图标'] = icon;
  }
  return result;
}

function readIconFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isIconField(field)) continue;
    const value = readOptionText(field.defaultValue);
    if (value && value !== '{{theme.icon}}') return value;
  }
  return '';
}

export function makeVariantId(label: string): string {
  const text = compactText(label);
  if (!text) return `variant-${Date.now()}`;
  return text.replace(/\s+/g, '-').replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-').replace(/^-+|-+$/g, '') || `variant-${Date.now()}`;
}

export function isGeneratedPresetName(value: unknown): boolean {
  return isGeneratedGoalTemplateName(value);
}

export function inferTemplateDisplayName(template: GoalTemplate | null | undefined, themePath = ''): string {
  const displayName = getGoalTemplateDisplayName(template, null, '记录预设');
  if (displayName && !isGeneratedPresetName(displayName)) return displayName;
  return themeLeafLabel(themePath, displayName || '记录预设');
}

export function readPeriodGranularity(template: GoalTemplate | null | undefined, block: CoreBlockDefinition | null | undefined): GoalTemplateDraftState['granularity'] {
  return normalizePeriodPolicyGranularity(
    template?.periodPolicy?.granularity
    || block?.periodPolicy?.granularity
    || 'week',
  );
}

export function buildDraftPeriodPolicy(block: CoreBlockDefinition | null | undefined, draft: Pick<GoalTemplateDraftState, 'granularity'>) {
  if (!block || !isPeriodAwareCoreBlock(block.id)) return undefined;
  return { enabled: true, granularity: normalizePeriodPolicyGranularity(draft.granularity) };
}

export function makeDraftFromTemplate(template: GoalTemplate | null, block: CoreBlockDefinition | null, variants: GoalTemplate[]): GoalTemplateDraftState {
  const variantId = template?.variantId || 'default';
  const index = Math.max(0, variants.findIndex((item) => (item.variantId || 'default') === variantId));
  const themePath = readThemePathFromTemplate(template) || readThemePathFromFields(block?.fields as TemplateField[] | undefined);
  const fields = ensureThemeField(cloneValue(template?.fields || block?.fields || []), themePath);
  return {
    variantId,
    name: inferTemplateDisplayName(template, themePath),
    description: template?.description || '',
    granularity: readPeriodGranularity(template, block),
    sortOrder: template?.sortOrder ?? index * 10,
    fields,
    outputTemplate: template?.outputTemplate || block?.outputTemplate || '',
    targetFile: template?.targetFile || block?.targetFile || '',
    appendUnderHeader: template?.appendUnderHeader || block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: cloneValue(template?.requiredFields || []),
    defaultValues: cloneValue(template?.defaultValues || {}),
    themePath,
  };
}

export function makeNewDraft(goal: GoalDefinition | null, block: CoreBlockDefinition | null, variants: GoalTemplate[], themes: ThemeDefinition[]): GoalTemplateDraftState {
  const base = makeDraftFromTemplate(null, block, variants);
  const usedVariantIds = new Set(variants.map((item) => String(item.variantId || 'default')));
  const usedThemePaths = new Set(variants.map((item) => normalizeThemePath(readThemePathFromTemplate(item))).filter(Boolean));
  const preferredTheme = normalizeThemePath(goal?.themePath) || normalizeThemePath(base.themePath);
  const firstUnusedTheme = themes.map((theme) => normalizeThemePath(theme.path)).find((path) => path && !usedThemePaths.has(path));
  const themePath = preferredTheme && !usedThemePaths.has(preferredTheme) ? preferredTheme : (firstUnusedTheme || preferredTheme || '');
  const label = themeLeafLabel(themePath, block?.name || '记录预设');
  let variantId = makeVariantId(label || `preset-${variants.length + 1}`);
  if (usedVariantIds.has(variantId)) {
    let index = 2;
    while (usedVariantIds.has(`${variantId}-${index}`)) index += 1;
    variantId = `${variantId}-${index}`;
  }
  const fields = ensureThemeField(base.fields || [], themePath);
  return {
    ...base,
    variantId,
    name: label || '记录预设',
    sortOrder: variants.length * 10,
    themePath,
    fields,
    defaultValues: mergeDefaultValues({ ...base, themePath, fields, name: label || '记录预设', variantId } as GoalTemplateDraftState, themes.find((theme) => normalizeThemePath(theme.path) === themePath)?.icon),
  };
}

function deriveRequiredFields(fields: TemplateField[]): string[] {
  return (fields || [])
    .filter((field) => field.required === true)
    .map((field) => compactText(field.key || field.label))
    .filter(Boolean);
}

type StableJsonValue = string | number | boolean | null | StableJsonValue[] | { [key: string]: StableJsonValue };

function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (input: unknown): StableJsonValue | undefined => {
    if (input === undefined) return undefined;
    if (input === null) return null;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input;
    if (typeof input !== 'object') return compactText(input);
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (Array.isArray(input)) return input.map(normalize).filter((item): item is StableJsonValue => item !== undefined);
    if (!isUnknownRecord(input)) return compactText(input);
    const out: Record<string, StableJsonValue> = {};
    Object.keys(input).sort().forEach((key) => {
      const value = normalize(input[key]);
      if (value !== undefined) out[key] = value;
    });
    return out;
  };
  return JSON.stringify(normalize(value));
}

function compactFieldForStructureCompare(field: TemplateField): Record<string, unknown> {
  const source = field as unknown as UnknownRecord;
  const out: Record<string, unknown> = {};
  Object.keys(source).sort().forEach((key) => {
    if (key === 'id' || key === 'defaultValue' || key === 'required') return;
    const value = source[key];
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  });
  return out;
}

function fieldsHaveSameStructure(left: TemplateField[] | undefined, right: TemplateField[] | undefined): boolean {
  const normalize = (fields: TemplateField[] | undefined) => (fields || []).map(compactFieldForStructureCompare);
  return stableJson(normalize(left)) === stableJson(normalize(right));
}

function equalStringSet(left: string[], right: string[]): boolean {
  const a = new Set(left.map(compactText).filter(Boolean));
  const b = new Set(right.map(compactText).filter(Boolean));
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function getFieldDefaultMap(fields: TemplateField[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields || []) {
    const key = compactText(field.key || field.label);
    if (!key) continue;
    const value = field.defaultValue;
    if (value !== undefined && value !== null && compactText(value) !== '') result[key] = compactText(value);
  }
  return result;
}

function cleanDefaultValuesOverride(draft: GoalTemplateDraftState, block: CoreBlockDefinition | null, goal: GoalDefinition | null, themeIcon?: string): Record<string, unknown> | undefined {
  const merged = mergeDefaultValues(draft, themeIcon);
  const baseDefaults = getFieldDefaultMap(block?.fields as TemplateField[] | undefined);
  const result: Record<string, unknown> = {};
  const allowSystemDefault = new Set(['themePath', '主题', 'icon', '图标']);
  const forbiddenKeys = new Set(['legacyOverrideId', 'legacyThemePath', 'goalId', '目标ID', 'goalPath', '目标', 'templateId', '模板ID', 'templateSourceType', '模板来源', 'templateVariantId', 'goalTemplateVariantId', '变体ID', '记录预设', 'period', 'periodId', 'cycleId', '周期', '周期ID', '周期粒度', 'goalGranularity']);
  const goalThemePath = normalizeThemePath(goal?.themePath);

  Object.entries(merged).forEach(([key, raw]) => {
    if (forbiddenKeys.has(key)) return;
    const value = compactText(raw);
    if (!value) return;
    if (isSystemRecordContextField(key) && !allowSystemDefault.has(key)) return;
    if ((key === 'themePath' || key === '主题') && value === goalThemePath) return;
    if ((key === 'themePath' || key === '主题') && value === '{{goal.themePath}}') return;
    if (baseDefaults[key] !== undefined && baseDefaults[key] === value) return;
    result[key] = value;
  });

  if (draft.themePath && draft.themePath !== goalThemePath) {
    result.themePath = draft.themePath;
    result['主题'] = draft.themePath;
  }
  if (themeIcon && draft.themePath && draft.themePath !== goalThemePath) {
    result.icon = themeIcon;
    result['图标'] = themeIcon;
  }

  return Object.keys(result).length ? result : undefined;
}

export function buildInheritedDraft(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const baseFields = ensureThemeField(cloneValue(block?.fields || []), previous.themePath);
  const requiredFields = deriveRequiredFields(baseFields);
  return {
    ...previous,
    fields: baseFields,
    outputTemplate: block?.outputTemplate || '',
    targetFile: block?.targetFile || '',
    appendUnderHeader: block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields,
    defaultValues: mergeDefaultValues({ ...previous, fields: baseFields } as GoalTemplateDraftState),
  };
}

export function inferTemplateEditMode(template: GoalTemplate | null | undefined, block: CoreBlockDefinition | null, goal: GoalDefinition | null): GoalTemplateEditMode {
  return inferGoalTemplateEditMode(template, block, goal) as GoalTemplateEditMode;
}

export function buildInheritedTemplatePatchFromDraft(params: {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  draft: GoalTemplateDraftState;
  selectedTemplate: GoalTemplate | null;
  themeIcon?: string;
}): GoalTemplate {
  const { goal, block, draft, selectedTemplate, themeIcon } = params;
  const variantId = draft.variantId || 'default';
  const defaultValues = cleanDefaultValuesOverride({ ...draft, fields: [] }, block, goal, themeIcon);
  const rawPatch: GoalTemplate = {
    id: getGoalTemplateId(goal.id, block.id, variantId),
    goalId: goal.id,
    coreBlockId: block.id,
    variantId,
    name: draft.name || (variantId === 'default' ? '记录预设' : variantId),
    description: draft.description || undefined,
    periodPolicy: buildDraftPeriodPolicy(block, draft),
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    enabled: true,
    defaultValues,
    createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return compactGoalTemplateForStorage(rawPatch, { coreBlock: block, goal });
}

export function buildTemplatePatchFromDraft(params: {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  draft: GoalTemplateDraftState;
  selectedTemplate: GoalTemplate | null;
  themeIcon?: string;
}): GoalTemplate {
  const { goal, block, draft, selectedTemplate, themeIcon } = params;
  const variantId = draft.variantId || 'default';
  const draftFields = ensureThemeField(draft.fields || [], draft.themePath);
  const baseFields = block.fields as TemplateField[] | undefined;
  const requiredFields = deriveRequiredFields(draftFields);
  const baseRequiredFields = deriveRequiredFields(baseFields || []);
  const defaultValues = cleanDefaultValuesOverride(draft, block, goal, themeIcon);
  const sameFields = fieldsHaveSameStructure(draftFields, baseFields);
  const sameRequired = equalStringSet(requiredFields, baseRequiredFields);
  const outputTemplate = compactText(draft.outputTemplate);
  const targetFile = compactText(draft.targetFile);
  const appendUnderHeader = compactText(draft.appendUnderHeader);
  const baseOutputTemplate = compactText(block.outputTemplate);
  const baseTargetFile = compactText(block.targetFile);
  const baseAppendUnderHeader = compactText(block.appendUnderHeader);

  const rawPatch: GoalTemplate = {
    id: getGoalTemplateId(goal.id, block.id, variantId),
    goalId: goal.id,
    coreBlockId: block.id,
    variantId,
    name: draft.name || (variantId === 'default' ? '记录预设' : variantId),
    description: draft.description || undefined,
    periodPolicy: buildDraftPeriodPolicy(block, draft),
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    enabled: true,
    fields: sameFields ? undefined : draftFields,
    outputTemplate: outputTemplate && outputTemplate !== baseOutputTemplate ? outputTemplate : undefined,
    targetFile: targetFile && targetFile !== baseTargetFile ? targetFile : undefined,
    appendUnderHeader: appendUnderHeader && appendUnderHeader !== baseAppendUnderHeader ? appendUnderHeader : undefined,
    requiredFields: sameRequired ? undefined : requiredFields,
    defaultValues,
    createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return compactGoalTemplateForStorage(rawPatch, { coreBlock: block, goal });
}

export function buildDraftDiffSummary(goal: GoalDefinition | null, block: CoreBlockDefinition | null, draft: GoalTemplateDraftState, themeIcon?: string): string[] {
  if (!block || !goal) return [];
  const patch = buildTemplatePatchFromDraft({ goal, block, draft, selectedTemplate: null, themeIcon });
  return describeGoalTemplateStorageDiff(patch);
}

export function nextCopyVariantId(existing: GoalTemplate[], sourceVariantId: string): string {
  const base = `${sourceVariantId || 'default'}-copy`;
  const used = new Set(existing.map((item) => String(item.variantId || 'default')));
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function sortGoalTemplateVariants(variants: GoalTemplate[]): GoalTemplate[] {
  return variants
    .map((template, index) => ({ template, index }))
    .sort((left, right) => {
      const bySort = (left.template.sortOrder ?? 9999) - (right.template.sortOrder ?? 9999);
      if (bySort !== 0) return bySort;
      return left.index - right.index;
    })
    .map(({ template }) => template);
}

export function buildThemeOptions(themes: ThemeDefinition[]): GoalTemplateThemeOption[] {
  return [
    { value: '', label: '不指定主题' },
    ...(themes || []).map((theme) => ({
      value: theme.path,
      label: `${theme.icon ? `${theme.icon} ` : ''}${cleanDisplayThemePath(theme.path)}`,
    })),
  ];
}

export function buildThemeByPath(themes: ThemeDefinition[]): Map<string, ThemeDefinition> {
  return new Map((themes || []).map((theme) => [String(theme.path || ''), theme]));
}

export function applyThemePathToDraft(draft: GoalTemplateDraftState, themePath: string, themeIcon?: string): GoalTemplateDraftState {
  const normalizedThemePath = normalizeThemePath(themePath);
  const fields = ensureThemeField(draft.fields || [], normalizedThemePath);
  return {
    ...draft,
    themePath: normalizedThemePath,
    fields,
    defaultValues: mergeDefaultValues({ ...draft, themePath: normalizedThemePath, fields }, themeIcon),
  };
}

export function switchDraftToOverride(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const base = buildInheritedDraft(previous, block);
  return {
    ...previous,
    fields: previous.fields?.length ? previous.fields : base.fields,
    outputTemplate: previous.outputTemplate || base.outputTemplate,
    targetFile: previous.targetFile || base.targetFile,
    appendUnderHeader: previous.appendUnderHeader || base.appendUnderHeader,
    requiredFields: previous.requiredFields?.length ? previous.requiredFields : base.requiredFields,
  };
}

export function createCopiedDraft(currentDraft: GoalTemplateDraftState, selectedTemplate: GoalTemplate | null, sortedVariants: GoalTemplate[]): GoalTemplateDraftState {
  const sourceVariantId = currentDraft.variantId || selectedTemplate?.variantId || 'default';
  const variantId = nextCopyVariantId(sortedVariants, sourceVariantId);
  return {
    ...currentDraft,
    variantId,
    name: `${currentDraft.name || selectedTemplate?.name || sourceVariantId} 副本`,
    sortOrder: sortedVariants.length * 10,
  };
}
