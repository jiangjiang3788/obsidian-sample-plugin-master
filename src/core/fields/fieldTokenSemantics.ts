import type { TemplateField } from '@/core/types/schema';
import { compactText, normalizeTextToken } from '@/core/semantics/text';

type TemplateFieldLike = Partial<TemplateField> & { role?: unknown };

function templateFieldTokenSources(field: TemplateFieldLike | null | undefined): unknown[] {
  if (!field) return [];
  return [field.key, field.label, field.semantic, field.semanticType, field.role];
}

/** Lowercase field lookup token used for key / semantic / English aliases. */
export function normalizeFieldToken(value: unknown): string {
  return normalizeTextToken(value);
}

/** Trimmed field label token used for exact Chinese label aliases. */
export function normalizeFieldLabelToken(value: unknown): string {
  return compactText(value);
}

export function getTemplateFieldLookupTokens(field: TemplateFieldLike | null | undefined): string[] {
  return templateFieldTokenSources(field)
    .map(normalizeFieldToken)
    .filter(Boolean);
}

export function getTemplateFieldLabelTokens(field: TemplateFieldLike | null | undefined): string[] {
  return templateFieldTokenSources(field)
    .map(normalizeFieldLabelToken)
    .filter(Boolean);
}

export function templateFieldMatchesAliases(field: TemplateFieldLike | null | undefined, aliases: string[]): boolean {
  const lowerTokens = getTemplateFieldLookupTokens(field);
  const labelTokens = getTemplateFieldLabelTokens(field);
  const lowerAliases = aliases.map(normalizeFieldToken);
  return lowerTokens.some(token => lowerAliases.includes(token)) || labelTokens.some(token => aliases.includes(token));
}

function templateFieldSemanticToken(field: TemplateFieldLike | null | undefined): string {
  return normalizeFieldToken(field?.semantic || field?.semanticType);
}

export function isThemeTemplateField(field: TemplateFieldLike | null | undefined): boolean {
  const key = normalizeFieldToken(field?.key);
  const label = normalizeFieldLabelToken(field?.label);
  const semantic = templateFieldSemanticToken(field);
  return key === 'themepath'
    || key === '主题'
    || label === '主题'
    || semantic.includes('themepath')
    || semantic === 'theme';
}

export function isIconTemplateField(field: TemplateFieldLike | null | undefined): boolean {
  const key = normalizeFieldToken(field?.key);
  const label = normalizeFieldLabelToken(field?.label);
  const semantic = templateFieldSemanticToken(field);
  return key === 'icon' || key === '图标' || label === '图标' || semantic === 'icon';
}

export function isGoalPathTemplateField(field: TemplateFieldLike | null | undefined): boolean {
  const key = normalizeFieldToken(field?.key);
  const label = normalizeFieldLabelToken(field?.label);
  const semantic = templateFieldSemanticToken(field);
  return key === 'goalpath'
    || key === '目标'
    || label === '目标'
    || label === '目标路径'
    || semantic.includes('goalpath');
}
