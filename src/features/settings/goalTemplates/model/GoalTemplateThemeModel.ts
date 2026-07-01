import type { GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { asUnknownRecord } from '@core/utils/public';
import { readGoalTemplateThemePath } from '@core/goal/public';
import type { GoalTemplateDraftState } from './GoalTemplateEditorTypes';

export function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readOptionText(value: unknown): string {
  if (value === undefined || value === null) return '';
  const record = asUnknownRecord(value);
  if (record && 'value' in record) return compactText(record.value);
  return compactText(value);
}

function cleanPathSegment(value: unknown): string {
  return compactText(value).replace(/^[#＃]+\s*/, '').trim();
}

export function normalizeThemePath(path?: unknown): string {
  return compactText(path)
    .split('/')
    .map(cleanPathSegment)
    .filter(Boolean)
    .join('/');
}

export function cleanDisplayThemePath(path?: unknown): string {
  return normalizeThemePath(path) || compactText(path);
}

export function themeLeafLabel(path?: unknown, fallback = ''): string {
  const normalized = normalizeThemePath(path);
  return normalized.split('/').filter(Boolean).pop() || fallback;
}

function getFieldSemantic(field: TemplateField): string {
  return compactText(field.semantic || field.semanticType).toLowerCase();
}

function isThemeField(field: TemplateField): boolean {
  const key = compactText(field.key).toLowerCase();
  const label = compactText(field.label);
  const semantic = getFieldSemantic(field);
  return key === 'themepath' || key === '主题' || label === '主题' || semantic.includes('themepath') || semantic === 'theme';
}

function isIconField(field: TemplateField): boolean {
  const key = compactText(field.key).toLowerCase();
  const label = compactText(field.label);
  const semantic = getFieldSemantic(field);
  return key === 'icon' || key === '图标' || label === '图标' || semantic === 'icon';
}

export function readThemePathFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isThemeField(field)) continue;
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
    if (!isThemeField(field)) return field;
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
    result['主题'] = themePath;
  }
  const icon = compactText(themeIcon) || readIconFromFields(draft.fields);
  if (icon) {
    result.icon = icon;
    result['图标'] = icon;
  }
  return result;
}

function readIconFromFields(fields: TemplateField[] | undefined): string {
  for (const field of fields || []) {
    if (!isIconField(field)) continue;
    const value = readOptionText(field.defaultValue);
    if (value && value !== '{{theme.icon}}') return value;
  }
  return '';
}
