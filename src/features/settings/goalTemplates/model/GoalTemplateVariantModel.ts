import type { GoalTemplate } from '@core/goal/public';
import type { ThemeDefinition } from '@core/types/public';
import type { GoalTemplateDraftState, GoalTemplateThemeOption } from './GoalTemplateEditorTypes';
import { cleanDisplayThemePath, ensureThemeField, mergeDefaultValues, normalizeThemePath } from './GoalTemplateThemeModel';

export function nextCopyVariantId(existing: GoalTemplate[], sourceVariantId: string): string {
  const base = `${sourceVariantId || 'default'}-copy`;
  const used = new Set(existing.map((item) => String(item.variantId || 'default')));
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function sortGoalTemplateVariants(variants: GoalTemplate[]): GoalTemplate[] {
  return variants
    .map((template, index) => ({ template, index }))
    .sort((left, right) => {
      const bySort = (left.template.sortOrder ?? 9999) - (right.template.sortOrder ?? 9999);
      if (bySort !== 0) return bySort;
      return left.index - right.index;
    })
    .map(({ template }) => template);
}

export function buildThemeOptions(themes: ThemeDefinition[]): GoalTemplateThemeOption[] {
  return [
    { value: '', label: '不指定主题' },
    ...(themes || []).map((theme) => ({
      value: theme.path,
      label: `${theme.icon ? `${theme.icon} ` : ''}${cleanDisplayThemePath(theme.path)}`,
    })),
  ];
}

export function buildThemeByPath(themes: ThemeDefinition[]): Map<string, ThemeDefinition> {
  return new Map((themes || []).map((theme) => [String(theme.path || ''), theme]));
}

export function applyThemePathToDraft(
  draft: GoalTemplateDraftState,
  themePath: string,
  themeIcon?: string,
): GoalTemplateDraftState {
  const normalizedThemePath = normalizeThemePath(themePath);
  const fields = ensureThemeField(draft.fields || [], normalizedThemePath);
  return {
    ...draft,
    themePath: normalizedThemePath,
    fields,
    defaultValues: mergeDefaultValues({ ...draft, themePath: normalizedThemePath, fields }, themeIcon),
  };
}

export function createCopiedDraft(
  currentDraft: GoalTemplateDraftState,
  selectedTemplate: GoalTemplate | null,
  sortedVariants: GoalTemplate[],
): GoalTemplateDraftState {
  const sourceVariantId = currentDraft.variantId || selectedTemplate?.variantId || 'default';
  const variantId = nextCopyVariantId(sortedVariants, sourceVariantId);
  return {
    ...currentDraft,
    variantId,
    name: `${currentDraft.name || selectedTemplate?.name || sourceVariantId} 副本`,
    sortOrder: sortedVariants.length * 10,
  };
}
