import type { NormalizeRecordInputParams, NormalizeRecordInputResult } from '@/core/types/recordInput';
import { buildPathOption, getLeafPath, normalizePath } from '@/core/utils/pathSemantic';
import { applyTaskTimePolicy } from '@core/public';

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

  const normalizedTriple = applyTaskTimePolicy({
    startTime: normalizedFormData['时间'] as string | undefined,
    endTime: normalizedFormData['结束'] as string | undefined,
    duration: normalizedFormData['时长'] as number | string | undefined,
    mode: 'finalize',
    direction: timeDirection,
  });

  const finalized = { ...normalizedFormData };
  if (normalizedTriple.startTime !== undefined) finalized['时间'] = normalizedTriple.startTime;
  if (normalizedTriple.endTime !== undefined) finalized['结束'] = normalizedTriple.endTime;
  if (normalizedTriple.duration !== undefined) finalized['时长'] = normalizedTriple.duration;

  return {
    normalizedFormData: finalized,
    warnings: [],
  };
}
