import type { GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { asUnknownRecord } from '@core/utils/public';
import { readGoalTemplateThemePath } from '@core/goal/public';
import { compactText } from '@core/semantics/public';
import { getThemePathLeaf, normalizeThemePath } from '@core/theme/public';
import { isIconTemplateField, isThemeTemplateField } from '@core/fields/public';
import type { GoalTemplateDraftState } from './GoalTemplateEditorTypes';

export { compactText, normalizeThemePath };

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readOptionText(value: unknown): string {
  if (value === undefined || value === null) return '';
  const record = asUnknownRecord(value);
  if (record && 'value' in record) return compactText(record.value);
  return compactText(value);
}


export function cleanDisplayThemePath(path?: unknown): string {
  return normalizeThemePath(path) || compactText(path);
}

export function themeLeafLabel(path?: unknown, fallback = ''): string {
  return getThemePathLeaf(path) || fallback;
}

export function readThemePathFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isThemeTemplateField(field)) continue;
    const value = readOptionText(field.defaultValue);
    if (value && value !== '{{goal.themePath}}') return normalizeThemePath(value);
  }
  return '';
}

export function readThemePathFromTemplate(template: GoalTemplate | null | undefined): string {
  return normalizeThemePath(readGoalTemplateThemePath(template));
}

export function ensureThemeField(fields: TemplateField[], themePath: string): TemplateField[] {
  const normalizedThemePath = normalizeThemePath(themePath);
  let touched = false;
  const next = (fields || []).map((field) => {
    if (!isThemeTemplateField(field)) return field;
    touched = true;
    return { ...field, defaultValue: normalizedThemePath || field.defaultValue || '{{goal.themePath}}' };
  });
  if (!touched && normalizedThemePath) {
    next.push({
      id: 'themePath',
      key: 'themePath',
      label: '主题',
      type: 'path',
      semanticType: 'themePath',
      defaultValue: normalizedThemePath,
    });
  }
  return next;
}

export function mergeDefaultValues(
  draft: Pick<GoalTemplateDraftState, 'defaultValues' | 'fields' | 'themePath'>,
  themeIcon?: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(draft.defaultValues || {}) };
  const themePath = normalizeThemePath(draft.themePath) || readThemePathFromFields(draft.fields);
  if (themePath) {
    result.themePath = themePath;
  }
  const icon = compactText(themeIcon) || readIconFromFields(draft.fields);
  if (icon) {
    result.icon = icon;
  }
  return result;
}

function readIconFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isIconTemplateField(field)) continue;
    const value = readOptionText(field.defaultValue);
    if (value && value !== '{{theme.icon}}') return value;
  }
  return '';
}
