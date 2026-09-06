import type { TemplateField } from '@core/types/public';
import { getTemplateFieldSemantic, templateFieldValueToArray } from '@core/fields/public';
import { dayjs, getLeafPath, renderTemplate } from '@core/utils/public';
import { resolveGoalIcon } from '@core/goal/public';
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

function isMultiSelectField(field: TemplateField): boolean {
  return field.type === 'multiSelect';
}

function resolveMultiSelectValue(field: TemplateField, rawValue: unknown): string[] {
  return templateFieldValueToArray(rawValue).map((token) => {
    const leaf = getLeafPath(token) || token;
    const matched = (field.options || []).find((option) => {
      const optionLabel = String(option.label || option.value || '');
      const optionValue = String(option.value || '');
      return optionValue === token || optionLabel === token || optionLabel === leaf;
    });
    return String(matched?.value ?? token);
  });
}

function resolveSeedValue(field: TemplateField, rawValue: unknown): unknown {
  if (isMultiSelectField(field)) return resolveMultiSelectValue(field, rawValue);
  if (isSelectableField(field)) return resolveSelectableValue(field, rawValue);
  if (field.type === 'number') {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return rawValue;
    const numeric = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
    return Number.isFinite(numeric) ? numeric : rawValue;
  }
  return rawValue;
}

function resolveContextValue(field: TemplateField, context?: Record<string, unknown> | null): unknown {
  if (!context) return undefined;
  const semantic = String(getTemplateFieldSemantic(field) || '');
  const semanticKeys: Partial<Record<string, string[]>> = {
    status: ['status', '状态'],
    startTime: ['startAt', '实际开始', '开始时间', '时间'],
    endTime: ['endAt', '实际结束', '结束时间', '结束'],
    duration: ['expectedDurationMinutes', '预计时长（分钟）', '时长（分钟）', '预计时长', '时长'],
    date: ['date', '日期'],
    goalPath: ['goalPath', '目标'],
  };
  const candidates = [field.key, field.label, ...(semanticKeys[semantic] || [])]
    .map((key) => String(key || '').trim())
    .filter(Boolean);
  for (const key of [...new Set(candidates)]) {
    if (Object.prototype.hasOwnProperty.call(context, key)) return context[key];
  }
  return undefined;
}

function isSameRecordValues(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (!isSameValue(left[key], right[key])) return false;
  }
  return true;
}

export function hydrateQuickInputTemplateDefaults({
  template,
  context,
  current,
  fieldSources,
  selectedGoal,
  currentGoalPath,
  currentGoalTitle,
  currentPeriod,
  timeDirection,
}: HydrateQuickInputTemplateDefaultsInput) {
  if (!template) return { changed: false, formData: current, fieldSources };

  const dataForParsing = {
    ...context,
    goal: {
      title: currentGoalTitle || '',
      path: currentGoalPath || '',
    },
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
    // Clearing a default is an explicit user override. Keep the empty value
    // instead of immediately hydrating the template default back into the field.
    const canRefresh = existingSource !== 'user'
      && (!hasMeaningfulExisting || isRefreshableSource(existingSource));

    const contextValue = resolveContextValue(field, context);
    if (contextValue !== undefined) {
      // Invocation context (for example Timeline gap suggestions) is seed data, not a lock.
      // After the user edits one member of a linked time triple, the other members may be
      // marked system_auto. Re-applying the original context here would immediately undo
      // that linked calculation and make the time inputs look uneditable.
      // A user-owned empty value also stays empty so clearing a suggested time is possible.
      if (existingSource === 'context' || (!hasMeaningfulExisting && existingSource !== 'user')) {
        assignValue(
          key,
          resolveSeedValue(field, contextValue),
          'context',
        );
      }
      return;
    }

    if (!canRefresh) return;

    if (field.defaultValue) {
      const semantic = String((field as any).semantic || (field as any).semanticType || '').trim();
      const isIconField = key === 'icon' || key === '图标' || semantic === 'icon';
      const goalIcon = resolveGoalIcon(selectedGoal);
      const defaultSource: QuickInputFieldSource = isIconField && goalIcon && String(field.defaultValue).trim() === goalIcon
        ? 'goal_context'
        : 'template_default';
      if (isSelectableField(field)) {
        const findOption = (value: string | undefined) =>
          (field.options || []).find((option) => option.label === value || option.value === value);
        let option = findOption(field.defaultValue as string);
        if (!option && field.options?.length) option = field.options[0];
        if (option) assignValue(key, { value: option.value, label: option.label || option.value }, defaultSource);
      } else {
        let value: unknown = field.defaultValue || '';
        if (typeof value === 'string') value = renderTemplate(value, dataForParsing);
        assignValue(key, resolveSeedValue(field, value), defaultSource);
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

  // Hydration is an idempotent projection, not an event log. GoalTemplate defaults may
  // temporarily disagree with authoritative invocation context (for example Timeline
  // start/end imply 40 minutes while a Goal default says 15). The linked-time finalizer
  // can neutralize that temporary write. Dispatch only when the FINAL form/source state
  // is actually different, otherwise the editor effect would loop forever on a no-op.
  const finalChanged = !isSameRecordValues(current, next)
    || !isSameRecordValues(fieldSources, nextSources);
  if (!finalChanged) return { changed: false, formData: current, fieldSources };

  return { changed: true, formData: next, fieldSources: nextSources };
}
