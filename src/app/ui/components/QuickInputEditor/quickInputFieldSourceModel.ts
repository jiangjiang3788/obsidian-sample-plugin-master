import {
  clearRecordInputGoalContext,
  isRecordInputMeaningfulValue,
  isRecordInputOptionLike,
  isRecordInputRefreshableSource,
  isRecordInputSameValue,
  preserveRecordInputBlockSwitchState,
} from '@core/public';

import type {
  QuickInputFieldSource,
  QuickInputFieldSourceMap,
  QuickInputFormData,
  QuickInputOptionLike,
} from './QuickInputEditorModel';

export const isMeaningfulValue = isRecordInputMeaningfulValue;

export const isOptionLike = (value: unknown): value is QuickInputOptionLike =>
  isRecordInputOptionLike(value);

export const isSameValue = isRecordInputSameValue;

export const isRefreshableSource = (source?: QuickInputFieldSource) =>
  isRecordInputRefreshableSource(source);

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
  theme_context: Object.values(sources).filter((v) => v === 'theme_context')
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

export function preserveQuickInputBlockSwitchState(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
) {
  return preserveRecordInputBlockSwitchState(formData, fieldSources) as {
    formData: QuickInputFormData;
    fieldSources: QuickInputFieldSourceMap;
  };
}
