import type { NormalizeRecordInputParams, NormalizeRecordInputResult } from '@/core/types/recordInput';
import { buildPathOption, getLeafPath, normalizePath } from '@/core/utils/pathSemantic';
import { recordDebugLog } from '@/core/utils/recordDebug';
import { applyTaskTimePolicy } from '@core/public';
import type { TaskTimeDirection } from '@core/public';


function normalizeToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function fieldMatches(field: any, aliases: string[]): boolean {
  const tokens = [field?.key, field?.label, field?.semanticType, field?.role]
    .map(normalizeToken)
    .filter(Boolean);
  const normalizedAliases = aliases.map(normalizeToken);
  return tokens.some((token) => normalizedAliases.includes(token));
}

function findFieldKey(fields: any[], aliases: string[], fallbackKey: string): string {
  const matched = fields.find((field) => fieldMatches(field, aliases));
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
  const startKey = findFieldKey(fields, ['时间', '开始', '开始时间', 'time', 'start', 'starttime', 'startTime'], '时间');
  const endKey = findFieldKey(fields, ['结束', '结束时间', 'end', 'endtime', 'endTime'], '结束');
  const durationKey = findFieldKey(fields, ['时长', 'duration', 'minutes', '持续时间'], '时长');

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
    templateFields: fields.map((field) => ({ key: field?.key, label: field?.label, semanticType: field?.semanticType })),
    recognizedKeys: { startKey, endKey, durationKey, direction },
    before: { startTime, endTime, duration, formData },
    after: { normalizedTriple, finalized },
  });

  return finalized;
}

function isOptionObject(value: unknown): value is { label?: unknown; value?: unknown } {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
}

function isPathLikeField(field: any): boolean {
  if (!field) return false;
  if (field.semanticType === 'path') return true;
  const key = String(field.key || field.label || '');
  if (key.includes('分类') || /category/i.test(key)) return true;
  return Array.isArray(field.options) && field.options.some((opt: any) => String(opt?.value || '').includes('/'));
}

function normalizeOptionValue(field: any, rawValue: unknown): unknown {
  if (rawValue === undefined || rawValue === null || rawValue === '') return rawValue;

  if (isOptionObject(rawValue)) {
    if (isPathLikeField(field)) {
      const normalized = normalizePath(String(rawValue.value ?? rawValue.label ?? ''));
      return { value: normalized, label: String((rawValue.label ?? getLeafPath(normalized)) || normalized) };
    }
    return {
      value: rawValue.value,
      label: rawValue.label ?? rawValue.value,
    };
  }

  if (!['select', 'radio', 'rating'].includes(field.type)) {
    return rawValue;
  }

  const rawString = String(rawValue);
  const options = field.options || [];

  if (isPathLikeField(field)) {
    const normalizedPath = normalizePath(rawString);
    const matched = options.find((opt: any) => normalizePath(String(opt.value || '')) === normalizedPath || String(opt.label || '') === rawString);
    if (matched) {
      return {
        value: normalizePath(String(matched.value || '')),
        label: matched.label || getLeafPath(String(matched.value || '')) || matched.value,
      };
    }
    return buildPathOption(normalizedPath) ?? rawValue;
  }

  const matched = options.find((opt: any) => String(opt.value) === rawString || String(opt.label) === rawString || String(opt.label ?? opt.value) === rawString);
  if (matched) {
    return {
      value: matched.value,
      label: matched.label || matched.value,
    };
  }

  if (field.type === 'rating' || field.semanticType === 'ratingPair') {
    return {
      value: rawString,
      label: rawString,
    };
  }

  return rawValue;
}

export function normalizeRecordInput(input: NormalizeRecordInputParams): NormalizeRecordInputResult {
  const normalizedFormData: Record<string, unknown> = { ...input.formData };
  const timeDirection = (normalizedFormData as any).__timeDirection === 'backward' ? 'backward' : 'forward';
  delete (normalizedFormData as any).lastChanged;
  delete (normalizedFormData as any).__timeDirection;

  for (const field of input.template.fields || []) {
    if (!Object.prototype.hasOwnProperty.call(normalizedFormData, field.key)) continue;
    normalizedFormData[field.key] = normalizeOptionValue(field as any, normalizedFormData[field.key]);
  }

  // SNAPSHOT-MIGRATION: 保存前时间计算不能只认中文固定 key。
  // 有些模板字段可能叫 start/startTime/endTime/duration；这里按模板字段别名识别后统一 finalize。
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
