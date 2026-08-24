import { normalizeGoalPath, splitGoalPath } from '@/core/goal';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { RecordInputFieldSourceMap, RecordInputFormData } from './session/types';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readNestedGoalContext(context?: Record<string, unknown> | null): Record<string, unknown> {
  const direct = readRecord(context?.__goalContext);
  const ui = readRecord(context?.__recordUiContext);
  const fromUi = readRecord(ui.goalContext);
  return { ...fromUi, ...direct };
}

function readStringValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    for (const nested of value) {
      const parsed = readStringValue(nested);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return readStringValue(objectValue.value ?? objectValue.path ?? objectValue.label ?? objectValue.title);
  }
  const text = String(value).trim();
  return text || null;
}

export function resolveRecordGoalPath(input: {
  formData?: RecordInputFormData | null;
  context?: Record<string, unknown> | null;
  item?: RecordViewItem | null;
  selectedGoalPath?: string | null;
}): string | null {
  const formData = input.formData || {};
  const context = input.context || {};
  const nested = readNestedGoalContext(context);
  const candidates = [
    input.selectedGoalPath,
    formData.goalPath,
    formData['目标'],
    context.goalPath,
    context['目标'],
    nested.goalPath,
    nested['目标'],
    input.item?.goalPath,
  ];
  for (const candidate of candidates) {
    const raw = readStringValue(candidate);
    const normalized = normalizeGoalPath(raw);
    if (normalized) return normalized;
  }
  return null;
}

export function applyRecordGoalContext(input: {
  formData?: RecordInputFormData | null;
  context?: Record<string, unknown> | null;
  item?: RecordViewItem | null;
  selectedGoalPath?: string | null;
  fieldSources?: RecordInputFieldSourceMap | null;
}): {
  goalPath: string | null;
  formData: RecordInputFormData;
  fieldSources: RecordInputFieldSourceMap;
} {
  const formData: RecordInputFormData = { ...(input.formData || {}) };
  const fieldSources: RecordInputFieldSourceMap = { ...(input.fieldSources || {}) };
  const goalPath = resolveRecordGoalPath(input);
  if (!goalPath) return { goalPath: null, formData, fieldSources };

  const parts = splitGoalPath(goalPath);
  const values: Record<string, unknown> = {
    goalPath,
    rootGoal: parts.rootGoal || undefined,
    leafGoal: parts.leafGoal || undefined,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    formData[key] = value;
    if (!fieldSources[key]) fieldSources[key] = 'goal_context';
  }
  return { goalPath, formData, fieldSources };
}
