import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import {
  compactGoalTemplateForStorage,
  describeGoalTemplateStorageDiff,
  getGoalTemplateId,
  inferGoalTemplateEditMode,
  isSystemRecordContextField,
} from '@core/goal/public';
import type { GoalTemplateDraftState, GoalTemplateEditMode } from './GoalTemplateEditorTypes';
import { buildDraftPeriodPolicy } from './GoalTemplateDraftModel';
import { compactText, ensureThemeField, mergeDefaultValues, normalizeThemePath } from './GoalTemplateThemeModel';
import { deriveRequiredFields, equalStringSet, fieldsHaveSameStructure, getFieldDefaultMap } from './GoalTemplateFieldModel';

function cleanDefaultValuesOverride(
  draft: GoalTemplateDraftState,
  block: CoreBlockDefinition | null,
  goal: GoalDefinition | null,
  themeIcon?: string,
): Record<string, unknown> | undefined {
  const merged = mergeDefaultValues(draft, themeIcon);
  const baseDefaults = getFieldDefaultMap(block?.fields as TemplateField[] | undefined);
  const result: Record<string, unknown> = {};
  const allowSystemDefault = new Set(['themePath', 'icon']);
  const forbiddenKeys = new Set([
    'legacyOverrideId', 'legacyThemePath', 'goalId', '目标ID', 'goalPath', '目标', 'templateId', '模板ID',
    'templateSourceType', '模板来源', 'templateVariantId', 'goalTemplateVariantId', '变体ID', '记录预设',
    'period', 'periodId', 'cycleId', '周期', '周期ID', '周期粒度', 'goalGranularity',
  ]);
  const goalThemePath = normalizeThemePath(goal?.themePath);

  Object.entries(merged).forEach(([key, raw]) => {
    if (forbiddenKeys.has(key)) return;
    const value = compactText(raw);
    if (!value) return;
    if (isSystemRecordContextField(key) && !allowSystemDefault.has(key)) return;
    if (key === 'themePath' && value === goalThemePath) return;
    if (key === 'themePath' && value === '{{goal.themePath}}') return;
    if (baseDefaults[key] !== undefined && baseDefaults[key] === value) return;
    result[key] = value;
  });

  if (draft.themePath && draft.themePath !== goalThemePath) {
    result.themePath = draft.themePath;
  }
  if (themeIcon && draft.themePath && draft.themePath !== goalThemePath) {
    result.icon = themeIcon;
  }

  return Object.keys(result).length ? result : undefined;
}

export function inferTemplateEditMode(
  template: GoalTemplate | null | undefined,
  block: CoreBlockDefinition | null,
  goal: GoalDefinition | null,
): GoalTemplateEditMode {
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
  const targetFile = compactText(draft.targetFile);
  const appendUnderHeader = compactText(draft.appendUnderHeader);
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
    targetFile: targetFile && targetFile !== baseTargetFile ? targetFile : undefined,
    appendUnderHeader: appendUnderHeader && appendUnderHeader !== baseAppendUnderHeader ? appendUnderHeader : undefined,
    requiredFields: sameRequired ? undefined : requiredFields,
    defaultValues,
    createdAt: selectedTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return compactGoalTemplateForStorage(rawPatch, { coreBlock: block, goal });
}

export function buildDraftDiffSummary(
  goal: GoalDefinition | null,
  block: CoreBlockDefinition | null,
  draft: GoalTemplateDraftState,
  themeIcon?: string,
): string[] {
  if (!block || !goal) return [];
  const patch = buildTemplatePatchFromDraft({ goal, block, draft, selectedTemplate: null, themeIcon });
  return describeGoalTemplateStorageDiff(patch);
}
