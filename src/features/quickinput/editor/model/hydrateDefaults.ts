import type { TemplateField } from '@core/types/public';
import { dayjs, getLeafPath, renderTemplate } from '@core/utils/public';
import { finalizeLinkedTimeFields } from '@shared/utils/public';

import {
  isMeaningfulValue,
  isOptionLike,
  isRefreshableSource,
  isSameValue,
} from '../quickInputFieldSourceModel';
import type {
  HydrateQuickInputTemplateDefaultsInput,
  QuickInputFieldSource,
  QuickInputFieldSourceMap,
  QuickInputFormData,
} from './types';

function assignQuickInputDefaultValue(params: {
  next: QuickInputFormData;
  nextSources: QuickInputFieldSourceMap;
  key: string;
  value: unknown;
  source: QuickInputFieldSource;
  markChanged: () => void;
}) {
  const { next, nextSources, key, value, source, markChanged } = params;
  if (!isSameValue(next[key], value)) {
    next[key] = value;
    markChanged();
  }
  if (nextSources[key] !== source) {
    nextSources[key] = source;
    markChanged();
  }
}

function resolveSelectableValue(field: TemplateField, rawValue: unknown) {
  if (isOptionLike(rawValue)) {
    const rawOptionValue = String(rawValue.value ?? '');
    const rawOptionLabel = String(rawValue.label ?? '');
    const matched = (field.options || []).find((option) => {
      const optionLabel = String(option.label || option.value || '');
      const optionValue = String(option.value || '');
      return (
        optionValue === rawOptionValue ||
        optionLabel === rawOptionLabel ||
        optionValue === rawOptionLabel ||
        optionLabel === rawOptionValue
      );
    });
    return matched
      ? { value: matched.value, label: matched.label || matched.value }
      : { value: rawValue.value, label: rawValue.label || rawValue.value };
  }

  const rawString = rawValue !== null && rawValue !== undefined ? String(rawValue) : '';
  const leafString = getLeafPath(rawString) || rawString;
  const matched = (field.options || []).find((option) => {
    const optionLabel = String(option.label || option.value || '');
    const optionValue = String(option.value || '');
    return (
      optionValue === rawString ||
      optionLabel === rawString ||
      optionLabel === leafString ||
      String(optionLabel) === String(rawString)
    );
  });
  return matched ? { value: matched.value, label: matched.label || matched.value } : rawValue;
}

function isSelectableField(field: TemplateField): boolean {
  return ['select', 'singleSelect', 'radio', 'rating'].includes(field.type);
}

export function hydrateQuickInputTemplateDefaults({
  template,
  context,
  current,
  fieldSources,
  selectedGoal,
  selectedGoalId,
  currentGoalPath,
  currentGoalTitle,
  theme,
  currentPeriod,
  timeDirection,
}: HydrateQuickInputTemplateDefaultsInput) {
  if (!template) return { changed: false, formData: current, fieldSources };

  const dataForParsing = {
    ...context,
    goal: {
      id: selectedGoal?.id || selectedGoalId || '',
      title: currentGoalTitle || '',
      path: currentGoalPath || '',
      themePath: selectedGoal?.themePath || theme?.path || '',
    },
    goalId: selectedGoal?.id || selectedGoalId || '',
    goalPath: currentGoalPath || '',
    ...(currentPeriod
      ? {
          period: currentPeriod,
          cycle: {
            id: currentPeriod.id,
            title: currentPeriod.label,
            startDate: currentPeriod.startDate,
            endDate: currentPeriod.endDate,
          },
          cycleId: currentPeriod.id,
          periodId: currentPeriod.id,
          periodLabel: currentPeriod.label,
        }
      : {}),
    theme: theme
      ? { path: theme.path, icon: theme.icon || '' }
      : { path: selectedGoal?.themePath || '', icon: '' },
  };

  let changed = false;
  const next: QuickInputFormData = { ...current };
  const nextSources: QuickInputFieldSourceMap = { ...fieldSources };
  const markChanged = () => {
    changed = true;
  };
  const assignValue = (key: string, value: unknown, source: QuickInputFieldSource) =>
    assignQuickInputDefaultValue({ next, nextSources, key, value, source, markChanged });

  (template.fields || []).forEach((field: TemplateField) => {
    const key = field.key;
    const existingValue = next[key];
    const existingSource = nextSources[key];
    const hasMeaningfulExisting = isMeaningfulValue(existingValue);
    const canRefresh = !hasMeaningfulExisting || isRefreshableSource(existingSource);

    const contextValue = context?.[field.key] ?? context?.[field.label];
    if (contextValue !== undefined) {
      if (!hasMeaningfulExisting || existingSource !== 'user') {
        assignValue(
          key,
          isSelectableField(field) ? resolveSelectableValue(field, contextValue) : contextValue,
          'context',
        );
      }
      return;
    }

    if (!canRefresh) return;

    if (field.defaultValue) {
      if (isSelectableField(field)) {
        const findOption = (value: string | undefined) =>
          (field.options || []).find((option) => option.label === value || option.value === value);
        let option = findOption(field.defaultValue as string);
        if (!option && field.options?.length) option = field.options[0];
        if (option) assignValue(key, { value: option.value, label: option.label || option.value }, 'template_default');
      } else {
        let value = field.defaultValue || '';
        if (typeof value === 'string') value = renderTemplate(value, dataForParsing);
        assignValue(key, value, 'template_default');
      }
    } else if (!hasMeaningfulExisting || existingSource === undefined || existingSource === 'system_auto') {
      if (field.type === 'date') assignValue(key, dayjs().format('YYYY-MM-DD'), 'system_auto');
      else if (field.type === 'time') assignValue(key, dayjs().format('HH:mm'), 'system_auto');
      else if (isSelectableField(field) && field.options?.length && field.autoSelectFirst !== false) {
        const first = field.options[0];
        assignValue(key, { value: first.value, label: first.label || first.value }, 'system_auto');
      }
    }
  });

  if (!changed) return { changed: false, formData: current, fieldSources };

  const taskTimeKeys = { startKey: 'startAt', endKey: 'endAt', durationKey: 'expectedDurationMinutes' };
  const legacyTimeKeys = { startKey: '时间', endKey: '结束', durationKey: '时长' };
  const taskFinalized = finalizeLinkedTimeFields(
    next,
    taskTimeKeys,
    { durationOutput: 'number', direction: timeDirection },
  );
  const finalized = finalizeLinkedTimeFields(
    taskFinalized,
    legacyTimeKeys,
    { durationOutput: 'number', direction: timeDirection },
  );
  const autoComputedKeys: string[] = [];
  for (const key of [...Object.values(taskTimeKeys), ...Object.values(legacyTimeKeys)]) {
    if (finalized[key] !== next[key]) autoComputedKeys.push(key);
  }
  autoComputedKeys.forEach((key) => {
    next[key] = finalized[key];
    nextSources[key] = 'system_auto';
  });

  return { changed: true, formData: next, fieldSources: nextSources };
}
