import type { NormalizeRecordInputParams, NormalizeRecordInputResult } from '@/core/types/recordInput';
import {
  getTemplateFieldSemantic,
  templateFieldMatches,
} from '@/core/fields/TemplateFieldAdapter';
import { normalizeFieldValueByBehavior } from '@/core/fields/FieldBehavior';
import { recordDebugLog } from '@/core/recordInput/debug';
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
  const startKey = findFieldKey(fields, ['时间', '开始', '开始时间', 'time', 'start', 'starttime', 'startTime'], '时间', 'startTime');
  const endKey = findFieldKey(fields, ['结束', '结束时间', 'end', 'endtime', 'endTime'], '结束', 'endTime');
  const durationKey = findFieldKey(fields, ['时长', 'duration', 'minutes', '持续时间'], '时长', 'duration');

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

export function normalizeRecordInput(input: NormalizeRecordInputParams): NormalizeRecordInputResult {
  const normalizedFormData: Record<string, unknown> = { ...input.formData };
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
