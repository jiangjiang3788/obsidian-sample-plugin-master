import { isOptionLikeValue } from '@/core/semantics/option';
import type {
  RecordInputFieldSource,
  RecordInputFieldSourceMap,
  RecordInputFormData,
} from './types';

export const RECORD_INPUT_GOAL_CONTEXT_KEYS = [
  'goalPath',
  '目标',
  'rootGoal',
  'leafGoal',
  'cycleId',
  '周期ID',
  '周期',
  '周期粒度',
  'templateId',
  'goalTemplateId',
] as const;

export const RECORD_INPUT_BLOCK_SWITCH_PRESERVE_KEYS = [
  '内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description',
  '目标', 'goalPath',
] as const;

export function isRecordInputMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function isRecordInputOptionLike(value: unknown): value is { value?: unknown; label?: unknown } {
  return isOptionLikeValue(value);
}

export function isRecordInputSameValue(left: unknown, right: unknown): boolean {
  if (isRecordInputOptionLike(left) && isRecordInputOptionLike(right)) {
    return left.value === right.value && left.label === right.label;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((value, index) => isRecordInputSameValue(value, right[index]));
  }
  return left === right;
}

export function isRecordInputRefreshableSource(source?: RecordInputFieldSource): boolean {
  return source === undefined
    || source === 'template_default'
    || source === 'system_auto'
    || source === 'goal_context';
}

export function clearRecordInputGoalContext(
  formData: RecordInputFormData,
  fieldSources: RecordInputFieldSourceMap,
) {
  const nextFormData: RecordInputFormData = { ...formData };
  const nextFieldSources: RecordInputFieldSourceMap = { ...fieldSources };
  RECORD_INPUT_GOAL_CONTEXT_KEYS.forEach((key) => {
    delete nextFormData[key];
    delete nextFieldSources[key];
  });
  return { formData: nextFormData, fieldSources: nextFieldSources };
}

export function preserveRecordInputBlockSwitchState(
  formData: RecordInputFormData,
  fieldSources: RecordInputFieldSourceMap,
) {
  const preservedFormData: RecordInputFormData = {};
  const preservedFieldSources: RecordInputFieldSourceMap = {};
  RECORD_INPUT_BLOCK_SWITCH_PRESERVE_KEYS.forEach((key) => {
    if (formData[key] !== undefined) preservedFormData[key] = formData[key];
    if (fieldSources[key]) preservedFieldSources[key] = fieldSources[key];
  });
  return { formData: preservedFormData, fieldSources: preservedFieldSources };
}

export function readRecordInputString(
  formData: RecordInputFormData,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = formData[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}
