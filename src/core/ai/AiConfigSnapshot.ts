// AI configuration snapshot. Goal is the only persisted hierarchy.

import type { InputSettings, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { AiSettings } from '@/core/types/ai-schema';
import type { GoalSettings } from '@/core/goal';
import { getGoalTemplates, isSystemRecordContextField } from '@/core/goal';
import { getEffectiveTemplate } from '@/core/utils/inputTemplateUtils';
import { resolveCaptureFieldSchema } from '@/core/fields/CaptureFieldResolver';

export interface AiBlockConfigField {
  key: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: unknown;
}

export interface AiBlockConfig {
  id: string;
  name: string;
  categoryKey: string;
  fields: AiBlockConfigField[];
}


export interface AiGoalConfig {
  path: string;
}

export interface AiGoalPresetConfig {
  id: string;
  goalPath: string;
  blockId: string;
  categoryKey: string;
  periodPolicy?: { enabled: boolean; granularity: 'week' | 'month' | 'quarter' | 'year' };
  fields: AiBlockConfigField[];
}

export interface AiConfigSnapshot {
  blocks: AiBlockConfig[];
  goals: AiGoalConfig[];
  goalPresets: AiGoalPresetConfig[];
}


function isAiVisibleField(field: TemplateField): boolean {
  return !isSystemRecordContextField(field?.key, field?.label, field?.semantic || field?.semanticType);
}

function normalizeField(field: TemplateField): AiBlockConfigField {
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
  const rawEnabledSet = ai.enabledBlockIds?.length ? new Set(ai.enabledBlockIds) : null;
  const inputBlocks = input?.blocks ?? [];
  const hasEnabledBlockMatch = !!rawEnabledSet && inputBlocks.some(
    (block) => rawEnabledSet.has(block.id) || rawEnabledSet.has(block.recordTypeId || ''),
  );
  const enabledSet = hasEnabledBlockMatch ? rawEnabledSet : null;

  const blocks = inputBlocks
    .filter((block) => !enabledSet || enabledSet.has(block.id) || enabledSet.has(block.recordTypeId || ''))
    .map((block) => {
      const effective = input ? getEffectiveTemplate(input, block.id) : undefined;
      const sourceFields = effective?.template?.fields ?? block.fields ?? [];
      return {
        id: block.id,
        name: block.name,
        categoryKey: block.categoryKey,
        fields: sourceFields.filter(isAiVisibleField).map(normalizeField),
      };
    });

  const blockById = new Map(inputBlocks.map((block) => [block.id, block]));
  const blockByCoreId = new Map(inputBlocks.map((block) => [block.recordTypeId || block.id, block]));

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
      const block = blockByCoreId.get(preset.recordTypeId) || blockById.get(preset.recordTypeId);
      const fields = (preset.fields?.length ? preset.fields : block?.fields || [])
        .filter(isAiVisibleField)
        .map(normalizeField);
      return {
        id: preset.id,
        goalPath: preset.goalPath,
        blockId: preset.recordTypeId,
        categoryKey: block?.categoryKey || preset.recordTypeId,
        periodPolicy: preset.periodPolicy,
        fields,
      };
    });

  return { blocks, goals, goalPresets };
}
