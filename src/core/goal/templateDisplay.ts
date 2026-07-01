import type { TemplateField } from '@/core/types/schema';
import type { GoalDefinition } from './types';
import type { GoalTemplate } from './templates';
import { DEFAULT_TEMPLATE_VARIANT_ID, normalizeTemplateVariantId } from './templateVariant';
import { getHierarchyPathLeaf, normalizeHierarchyPathValue } from '@/core/semantics/path';
import { readOptionText as readOptionTextParts } from '@/core/semantics/option';

export interface GoalTemplateDisplayInfo {
  name: string;
  themePath: string;
  icon: string;
  variantId: string;
  isGeneratedName: boolean;
}

function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizePath(value?: unknown): string {
  return normalizeHierarchyPathValue(value, { stripLeadingHashes: true }) || '';
}

function readOptionText(value: unknown): string {
  return readOptionTextParts(value).value;
}

function leafPath(value: unknown): string {
  const text = normalizePath(value);
  return getHierarchyPathLeaf(text) || text;
}

export function isGeneratedGoalTemplateName(value: unknown): boolean {
  const text = compactText(value);
  return !text
    || /^预设\s*\d+$/i.test(text)
    || /^preset[-_\s]*\d+$/i.test(text)
    || text === '记录预设'
    || text === '默认预设'
    || text === '默认模板'
    || text === '未命名预设';
}

function isThemeField(field: TemplateField): boolean {
  const anyField = field as any;
  const key = compactText(anyField.key).toLowerCase();
  const label = compactText(anyField.label);
  const semantic = compactText(anyField.semantic || anyField.semanticType).toLowerCase();
  return key === 'themepath' || key === '主题' || label === '主题' || semantic.includes('themepath');
}

function isIconField(field: TemplateField): boolean {
  const anyField = field as any;
  const key = compactText(anyField.key).toLowerCase();
  const label = compactText(anyField.label);
  const semantic = compactText(anyField.semantic || anyField.semanticType).toLowerCase();
  return key === 'icon' || key === '图标' || label === '图标' || semantic === 'icon';
}

function readFieldDefault(fields: TemplateField[] | undefined, predicate: (field: TemplateField) => boolean): string {
  for (const field of fields || []) {
    if (!predicate(field)) continue;
    const value = readOptionText((field as any).defaultValue);
    if (value && value !== '{{goal.themePath}}') return value;
  }
  return '';
}

export function readGoalTemplateThemePath(template?: Partial<GoalTemplate> | null, goal?: Pick<GoalDefinition, 'themePath'> | null): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return normalizePath(
    readOptionText(values.themePath)
    || readOptionText(values['主题'])
    || readFieldDefault(template?.fields as TemplateField[] | undefined, isThemeField)
    || readOptionText(goal?.themePath)
  );
}

export function readGoalTemplateIcon(template?: Partial<GoalTemplate> | null, fallbackIcon?: string): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return compactText(
    readOptionText(values.icon)
    || readOptionText(values['图标'])
    || readOptionText(values['theme.icon'])
    || readFieldDefault(template?.fields as TemplateField[] | undefined, isIconField)
    || fallbackIcon
  );
}

export function getGoalTemplateDisplayName(
  template?: Partial<Pick<GoalTemplate, 'name' | 'variantId' | 'defaultValues' | 'fields'>> | null,
  goal?: Pick<GoalDefinition, 'themePath'> | null,
  fallback = '记录预设',
): string {
  const rawName = compactText(template?.name);
  if (rawName && !isGeneratedGoalTemplateName(rawName)) return rawName;

  const themeLabel = leafPath(readGoalTemplateThemePath(template as Partial<GoalTemplate> | null, goal));
  if (themeLabel) return themeLabel;

  const variantId = normalizeTemplateVariantId(compactText(template?.variantId));
  const variantText = variantId.replace(/^legacy-/, '');
  if (variantText && variantText !== DEFAULT_TEMPLATE_VARIANT_ID && !isGeneratedGoalTemplateName(variantText)) return variantText;

  return fallback;
}

export function getGoalTemplateDisplayInfo(
  template?: Partial<GoalTemplate> | null,
  goal?: Pick<GoalDefinition, 'themePath'> | null,
  fallbackIcon?: string,
): GoalTemplateDisplayInfo {
  const rawName = compactText(template?.name);
  const themePath = readGoalTemplateThemePath(template, goal);
  const name = getGoalTemplateDisplayName(template, goal);
  return {
    name,
    themePath,
    icon: readGoalTemplateIcon(template, fallbackIcon),
    variantId: normalizeTemplateVariantId(template?.variantId),
    isGeneratedName: !rawName || isGeneratedGoalTemplateName(rawName),
  };
}
