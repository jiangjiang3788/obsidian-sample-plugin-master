import {
  clearRecordInputGoalContext,
  isRecordInputMeaningfulValue,
  isRecordInputOptionLike,
  isRecordInputRefreshableSource,
  isRecordInputSameValue,
  preserveRecordInputRecordTypeSwitchState,
} from '@core/recordInput/public';

import type {
  QuickInputFieldSource,
  QuickInputFieldSourceMap,
  QuickInputFormData,
  QuickInputOptionLike,
} from './model/types';

export const isMeaningfulValue = isRecordInputMeaningfulValue;

export const isOptionLike = (value: unknown): value is QuickInputOptionLike =>
  isRecordInputOptionLike(value);

export const isSameValue = isRecordInputSameValue;

export const isRefreshableSource = (source?: QuickInputFieldSource) =>
  isRecordInputRefreshableSource(source);

/**
 * Blur/change fires when an untouched empty native text field loses focus to
 * the Goal selector. This must not be treated as an explicit user clear, or
 * selecting a GoalTemplate cannot populate the Task body on the first create.
 */
export function isUntouchedEmptyNativeInput(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
  key: string,
  nextValue: unknown,
): boolean {
  return nextValue === '' && (formData[key] === undefined || formData[key] === null || formData[key] === '')
    && fieldSources[key] === undefined;
}

export const buildInitialFieldSources = (
  initialData?: QuickInputFormData,
  source: QuickInputFieldSource = 'context',
): QuickInputFieldSourceMap => {
  const next: QuickInputFieldSourceMap = {};
  if (!initialData) return next;
  Object.keys(initialData).forEach((key) => {
    if (key === '__timeDirection' || key === 'lastChanged') return;
    if (!isMeaningfulValue(initialData[key])) return;
    next[key] = source;
  });
  return next;
};

export const buildFieldSourceSummary = (
  sources: QuickInputFieldSourceMap,
): Record<QuickInputFieldSource, number> => ({
  user: Object.values(sources).filter((v) => v === 'user').length,
  context: Object.values(sources).filter((v) => v === 'context').length,
  edit_backfill: Object.values(sources).filter((v) => v === 'edit_backfill')
    .length,
  invocation_context: Object.values(sources).filter(
    (v) => v === 'invocation_context',
  ).length,
  goal_context: Object.values(sources).filter((v) => v === 'goal_context')
    .length,
  template_default: Object.values(sources).filter(
    (v) => v === 'template_default',
  ).length,
  system_auto: Object.values(sources).filter((v) => v === 'system_auto').length,
});

export function clearQuickInputGoalContext(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
) {
  return clearRecordInputGoalContext(formData, fieldSources) as {
    formData: QuickInputFormData;
    fieldSources: QuickInputFieldSourceMap;
  };
}

export function preserveQuickInputRecordTypeSwitchState(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
) {
  return preserveRecordInputRecordTypeSwitchState(formData, fieldSources) as {
    formData: QuickInputFormData;
    fieldSources: QuickInputFieldSourceMap;
  };
}
