import type { NormalizeRecordInputParams, NormalizeRecordInputResult } from '@/core/types/recordInput';
import {
  getTemplateFieldSemantic,
  templateFieldMatches,
} from '@/core/fields/TemplateFieldAdapter';
import { normalizeFieldValueByBehavior } from '@/core/fields/FieldBehavior';
import { recordDebugLog } from '@/core/recordInput/debug';
import { renderTemplate } from '@/core/utils/templateUtils';
import { applyTaskTimePolicy } from '@/core/records/task/taskTime';
import type { TaskTimeDirection } from '@/core/records/task/taskTime';

function fieldMatches(field: any, aliases: string[]): boolean {
  return templateFieldMatches(field, aliases);
}

function fieldSemanticMatches(field: any, semantic: string): boolean {
  return getTemplateFieldSemantic(field) === semantic;
}

function findFieldKey(fields: any[], aliases: string[], fallbackKey: string, semantic?: string): string {
  const matched = fields.find((field) => (semantic ? fieldSemanticMatches(field, semantic) : false) || fieldMatches(field, aliases));
  return String(matched?.key || fallbackKey);
}

function parseDurationValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function finalizeTimeFieldsByTemplate(
  formData: Record<string, unknown>,
  fields: any[],
  direction: TaskTimeDirection,
): Record<string, unknown> {
  const hasExplicitEndField = fields.some((field) => fieldSemanticMatches(field, 'endTime') || fieldMatches(field, ['结束', '结束时间', 'end', 'endtime', 'endTime', 'endAt']));
  if (!hasExplicitEndField) return { ...formData };

  const startKey = findFieldKey(fields, ['时间', '开始', '开始时间', '开始/预计时间', 'time', 'start', 'starttime', 'startTime', 'startAt'], '时间', 'startTime');
  const endKey = findFieldKey(fields, ['结束', '结束时间', 'end', 'endtime', 'endTime', 'endAt'], '结束', 'endTime');
  const durationKey = findFieldKey(fields, ['时长', '时长（分钟）', '预计时长', 'duration', 'minutes', '持续时间', 'expectedDurationMinutes'], '时长', 'duration');

  const startTime = formData[startKey] ?? formData['时间'];
  const endTime = formData[endKey] ?? formData['结束'];
  const duration = parseDurationValue(formData[durationKey] ?? formData['时长']);

  const normalizedTriple = applyTaskTimePolicy({
    startTime: startTime as string | undefined,
    endTime: endTime as string | undefined,
    duration,
    mode: 'finalize',
    direction,
  });

  const finalized = { ...formData };
  if (normalizedTriple.startTime !== undefined) {
    finalized[startKey] = normalizedTriple.startTime;
    if (startKey !== '时间' && Object.prototype.hasOwnProperty.call(finalized, '时间')) finalized['时间'] = normalizedTriple.startTime;
  }
  if (normalizedTriple.endTime !== undefined) {
    finalized[endKey] = normalizedTriple.endTime;
    if (endKey !== '结束' && Object.prototype.hasOwnProperty.call(finalized, '结束')) finalized['结束'] = normalizedTriple.endTime;
  }
  if (normalizedTriple.duration !== undefined) {
    finalized[durationKey] = normalizedTriple.duration;
    if (durationKey !== '时长' && Object.prototype.hasOwnProperty.call(finalized, '时长')) finalized['时长'] = normalizedTriple.duration;
  }

  recordDebugLog('时间计算', 'normalizeRecordInput 保存前时间字段归一化', {
    templateFields: fields.map((field) => ({
      key: field?.key,
      label: field?.label,
      semantic: field?.semantic,
      semanticType: field?.semanticType,
      type: field?.type,
    })),
    recognizedKeys: { startKey, endKey, durationKey, direction },
    before: { startTime, endTime, duration, formData },
    after: { normalizedTriple, finalized },
  });

  return finalized;
}

/**
 * 模板正文默认值属于创建语义，不能只依赖 QuickInput 的异步 UI 水合。
 * 只填真正缺失的正文；显式空字符串以及其它正文别名均视为用户/调用方决定。
 */
function applyMissingBodyDefault(input: NormalizeRecordInputParams, formData: Record<string, unknown>): void {
  if (input.mode !== 'create') return;
  const bodyFields = (input.template.fields || []).filter((field) => getTemplateFieldSemantic(field) === 'body');
  if (!bodyFields.length) return;

  const bodyKeys = new Set(['内容', '任务内容', '正文', 'content', 'body']);
  for (const field of bodyFields) {
    if (field.key) bodyKeys.add(field.key);
    if (field.label) bodyKeys.add(field.label);
  }
  if ([...bodyKeys].some((key) => Object.prototype.hasOwnProperty.call(formData, key) && formData[key] !== undefined)) return;

  const fieldWithDefault = bodyFields.find((field) => typeof field.defaultValue === 'string' && field.defaultValue.length > 0);
  if (!fieldWithDefault) return;
  const goalPath = String(formData.goalPath ?? formData['目标'] ?? input.context?.goalPath ?? '').trim();
  const goalTitle = goalPath.split('/').filter(Boolean).pop() || '';
  const value = renderTemplate(fieldWithDefault.defaultValue as string, {
    ...(input.context || {}),
    ...formData,
    goalPath,
    goal: { path: goalPath, title: goalTitle },
  });
  if (value) formData[fieldWithDefault.key] = value;
}

export function normalizeRecordInput(input: NormalizeRecordInputParams): NormalizeRecordInputResult {
  const normalizedFormData: Record<string, unknown> = { ...input.formData };
  applyMissingBodyDefault(input, normalizedFormData);
  const timeDirection = (normalizedFormData as any).__timeDirection === 'backward' ? 'backward' : 'forward';
  delete (normalizedFormData as any).lastChanged;
  delete (normalizedFormData as any).__timeDirection;

  for (const field of input.template.fields || []) {
    if (!Object.prototype.hasOwnProperty.call(normalizedFormData, field.key)) continue;
    normalizedFormData[field.key] = normalizeFieldValueByBehavior(field, normalizedFormData[field.key]);
  }

  const finalized = finalizeTimeFieldsByTemplate(
    normalizedFormData,
    input.template.fields || [],
    timeDirection,
  );

  return {
    normalizedFormData: finalized,
    warnings: [],
  };
}
