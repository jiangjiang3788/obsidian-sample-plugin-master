// AI configuration snapshot. Goal is the only persisted hierarchy.

import type { InputSettings, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { AiSettings } from '@/core/types/ai-schema';
import type { GoalSettings } from '@/core/goal';
import { getGoalTemplates, isSystemRecordContextField } from '@/core/goal';
import { getEffectiveTemplate } from '@/core/utils/inputTemplateUtils';
import { resolveCaptureFieldSchema } from '@/core/fields/CaptureFieldResolver';

export interface AiRecordTypeConfigField {
  key: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: unknown;
}

export interface AiRecordTypeConfig {
  id: string;
  name: string;
  fields: AiRecordTypeConfigField[];
}


export interface AiGoalConfig {
  path: string;
}

export interface AiGoalPresetConfig {
  id: string;
  goalPath: string;
  recordTypeId: string;
  periodPolicy?: { enabled: boolean; granularity: 'week' | 'month' | 'quarter' | 'year' };
  fields: AiRecordTypeConfigField[];
}

export interface AiConfigSnapshot {
  recordTypes: AiRecordTypeConfig[];
  goals: AiGoalConfig[];
  goalPresets: AiGoalPresetConfig[];
}


function isAiVisibleField(field: TemplateField): boolean {
  return !isSystemRecordContextField(field?.key, field?.label, field?.semantic || field?.semanticType);
}

function normalizeField(field: TemplateField): AiRecordTypeConfigField {
  const schema = resolveCaptureFieldSchema(field);
  return {
    key: field.key,
    label: schema.label,
    type: schema.inputType || field.type,
    options: (schema.options ?? []).map((option) => ({
      value: option.value,
      label: option.label || option.value,
    })),
    defaultValue: schema.defaultValue,
  };
}

export function buildAiConfigSnapshot(
  input: InputSettings | undefined,
  ai: AiSettings,
  goalSettings?: GoalSettings,
): AiConfigSnapshot {
  const rawEnabledSet = ai.enabledRecordTypeIds?.length ? new Set(ai.enabledRecordTypeIds) : null;
  const inputRecordTypes = input?.recordTypes ?? [];
  const hasEnabledRecordTypeMatch = !!rawEnabledSet && inputRecordTypes.some(
    (recordType) => rawEnabledSet.has(recordType.id) || rawEnabledSet.has(recordType.recordTypeId || ''),
  );
  const enabledSet = hasEnabledRecordTypeMatch ? rawEnabledSet : null;

  const recordTypes = inputRecordTypes
    .filter((recordType) => !enabledSet || enabledSet.has(recordType.id) || enabledSet.has(recordType.recordTypeId || ''))
    .map((recordType) => {
      const effective = input ? getEffectiveTemplate(input, recordType.id) : undefined;
      const sourceFields = effective?.template?.fields ?? recordType.fields ?? [];
      return {
        id: recordType.id,
        name: recordType.name,
        fields: sourceFields.filter(isAiVisibleField).map(normalizeField),
      };
    });

  const recordTypeById = new Map(inputRecordTypes.map((recordType) => [recordType.id, recordType]));
  const recordTypeByCanonicalId = new Map(inputRecordTypes.map((recordType) => [recordType.recordTypeId || recordType.id, recordType]));

  const goals = (goalSettings?.goals ?? [])
    .filter((goal) => goal.status !== 'archived')
    .map((goal) => {
      const path = String(goal.path || '').trim();
      return { path };
    })
    .filter((goal) => !!goal.path);
  const goalPaths = new Set(goals.map((goal) => goal.path));

  const goalPresets = getGoalTemplates(goalSettings)
    .filter((preset) => preset.enabled !== false)
    .filter((preset) => goalPaths.has(preset.goalPath))
    .filter((preset) => !enabledSet || enabledSet.has(preset.recordTypeId))
    .map((preset) => {
      const recordType = recordTypeByCanonicalId.get(preset.recordTypeId) || recordTypeById.get(preset.recordTypeId);
      const fields = (preset.fields?.length ? preset.fields : recordType?.fields || [])
        .filter(isAiVisibleField)
        .map(normalizeField);
      return {
        id: preset.id,
        goalPath: preset.goalPath,
        recordTypeId: preset.recordTypeId,
        periodPolicy: preset.periodPolicy,
        fields,
      };
    });

  return { recordTypes, goals, goalPresets };
}
