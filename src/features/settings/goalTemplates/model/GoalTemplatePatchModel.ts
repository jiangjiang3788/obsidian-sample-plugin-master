import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import {
  compactGoalTemplateForStorage,
  describeGoalTemplateStorageDiff,
  getGoalTemplateId,
} from '@core/goal/public';
import type { GoalTemplateDraftState, GoalTemplateEditMode } from './GoalTemplateEditorTypes';
import { buildDraftPeriodPolicy } from './GoalTemplateDraftModel';
import { deriveRequiredFields, equalStringSet, fieldsHaveSameStructure, getFieldDefaultMap } from './GoalTemplateFieldModel';
import { compactText } from '@core/semantics/public';
import { isSystemRecordContextField } from '@core/goal/public';

const FORBIDDEN_CONTEXT_KEYS = new Set([
  'goalPath', '目标', '目标路径', 'rootGoal', 'leafGoal',
  'templateId', '模板ID', 'templateSourceType', '模板来源',
]);

function cleanDefaultValuesOverride(
  draft: GoalTemplateDraftState,
  block: TemplateRecordTypeDefinition | null,
): Record<string, unknown> | undefined {
  const baseDefaults = getFieldDefaultMap(block?.fields as TemplateField[] | undefined);
  const result: Record<string, unknown> = {};
  Object.entries(draft.defaultValues || {}).forEach(([key, raw]) => {
    if (FORBIDDEN_CONTEXT_KEYS.has(key) || isSystemRecordContextField(key)) return;
    const value = compactText(raw);
    if (!value) return;
    if (baseDefaults[key] !== undefined && baseDefaults[key] === value) return;
    result[key] = raw;
  });
  return Object.keys(result).length ? result : undefined;
}

export function inferTemplateEditMode(template: GoalTemplate | null | undefined): GoalTemplateEditMode {
  if (!template) return 'default';
  return template.enabled === false ? 'disabled' : 'override';
}

export function buildTemplatePatchFromDraft(params: {
  goal: GoalDefinition;
  block: TemplateRecordTypeDefinition;
  draft: GoalTemplateDraftState;
}): GoalTemplate {
  const { goal, block, draft } = params;
  const goalPath = goal.path;
  const draftFields = draft.fields || [];
  const baseFields = block.fields as TemplateField[] | undefined;
  const requiredFields = deriveRequiredFields(draftFields);
  const baseRequiredFields = deriveRequiredFields(baseFields || []);
  const sameFields = fieldsHaveSameStructure(draftFields, baseFields);
  const sameRequired = equalStringSet(requiredFields, baseRequiredFields);
  const targetFile = compactText(draft.targetFile);
  const appendUnderHeader = compactText(draft.appendUnderHeader);
  const baseTargetFile = compactText(block.targetFile);
  const baseAppendUnderHeader = compactText(block.appendUnderHeader);

  const rawPatch: GoalTemplate = {
    id: getGoalTemplateId(goalPath, block.id),
    goalPath,
    recordTypeId: block.id,
    description: draft.description || undefined,
    periodPolicy: buildDraftPeriodPolicy(block, draft),
    enabled: true,
    fields: sameFields ? undefined : draftFields,
    targetFile: targetFile && targetFile !== baseTargetFile ? targetFile : undefined,
    appendUnderHeader: appendUnderHeader && appendUnderHeader !== baseAppendUnderHeader ? appendUnderHeader : undefined,
    requiredFields: sameRequired ? undefined : requiredFields,
    defaultValues: cleanDefaultValuesOverride(draft, block),
  };
  return compactGoalTemplateForStorage(rawPatch, { recordType: block });
}

export function buildDisabledTemplate(goal: GoalDefinition, block: TemplateRecordTypeDefinition): GoalTemplate {
  const goalPath = goal.path;
  return {
    id: getGoalTemplateId(goalPath, block.id),
    goalPath,
    recordTypeId: block.id,
    enabled: false,
  };
}

export function buildDraftDiffSummary(
  goal: GoalDefinition | null,
  block: TemplateRecordTypeDefinition | null,
  draft: GoalTemplateDraftState,
): string[] {
  if (!block || !goal) return [];
  return describeGoalTemplateStorageDiff(buildTemplatePatchFromDraft({ goal, block, draft }));
}
