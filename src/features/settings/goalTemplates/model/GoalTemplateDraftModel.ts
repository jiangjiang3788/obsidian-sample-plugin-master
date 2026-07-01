import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField, ThemeDefinition } from '@core/types/public';
import {
  getGoalTemplateDisplayName,
  isGeneratedGoalTemplateName,
  isPeriodAwareCoreBlock,
  normalizePeriodPolicyGranularity,
} from '@core/goal/public';
import type { GoalTemplateDraftState } from './GoalTemplateEditorTypes';
import { cloneValue, compactText, ensureThemeField, mergeDefaultValues, normalizeThemePath, readThemePathFromFields, readThemePathFromTemplate, themeLeafLabel } from './GoalTemplateThemeModel';
import { deriveRequiredFields } from './GoalTemplateFieldModel';

export function makeVariantId(label: string): string {
  const text = compactText(label);
  if (!text) return `variant-${Date.now()}`;
  return text.replace(/\s+/g, '-').replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-').replace(/^-+|-+$/g, '') || `variant-${Date.now()}`;
}

export function isGeneratedPresetName(value: unknown): boolean {
  return isGeneratedGoalTemplateName(value);
}

export function inferTemplateDisplayName(template: GoalTemplate | null | undefined, themePath = ''): string {
  const displayName = getGoalTemplateDisplayName(template, null, '记录预设');
  if (displayName && !isGeneratedPresetName(displayName)) return displayName;
  return themeLeafLabel(themePath, displayName || '记录预设');
}

export function readPeriodGranularity(
  template: GoalTemplate | null | undefined,
  block: CoreBlockDefinition | null | undefined,
): GoalTemplateDraftState['granularity'] {
  return normalizePeriodPolicyGranularity(
    template?.periodPolicy?.granularity
    || block?.periodPolicy?.granularity
    || 'week',
  );
}

export function buildDraftPeriodPolicy(
  block: CoreBlockDefinition | null | undefined,
  draft: Pick<GoalTemplateDraftState, 'granularity'>,
) {
  if (!block || !isPeriodAwareCoreBlock(block.id)) return undefined;
  return { enabled: true, granularity: normalizePeriodPolicyGranularity(draft.granularity) };
}

export function makeDraftFromTemplate(
  template: GoalTemplate | null,
  block: CoreBlockDefinition | null,
  variants: GoalTemplate[],
): GoalTemplateDraftState {
  const variantId = template?.variantId || 'default';
  const index = Math.max(0, variants.findIndex((item) => (item.variantId || 'default') === variantId));
  const themePath = readThemePathFromTemplate(template) || readThemePathFromFields(block?.fields as TemplateField[] | undefined);
  const fields = ensureThemeField(cloneValue(template?.fields || block?.fields || []), themePath);
  return {
    variantId,
    name: inferTemplateDisplayName(template, themePath),
    description: template?.description || '',
    granularity: readPeriodGranularity(template, block),
    sortOrder: template?.sortOrder ?? index * 10,
    fields,
    outputTemplate: template?.outputTemplate || block?.outputTemplate || '',
    targetFile: template?.targetFile || block?.targetFile || '',
    appendUnderHeader: template?.appendUnderHeader || block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: cloneValue(template?.requiredFields || []),
    defaultValues: cloneValue(template?.defaultValues || {}),
    themePath,
  };
}

export function makeNewDraft(
  goal: GoalDefinition | null,
  block: CoreBlockDefinition | null,
  variants: GoalTemplate[],
  themes: ThemeDefinition[],
): GoalTemplateDraftState {
  const base = makeDraftFromTemplate(null, block, variants);
  const usedVariantIds = new Set(variants.map((item) => String(item.variantId || 'default')));
  const usedThemePaths = new Set(variants.map((item) => normalizeThemePath(readThemePathFromTemplate(item))).filter(Boolean));
  const preferredTheme = normalizeThemePath(goal?.themePath) || normalizeThemePath(base.themePath);
  const firstUnusedTheme = themes.map((theme) => normalizeThemePath(theme.path)).find((path) => path && !usedThemePaths.has(path));
  const themePath = preferredTheme && !usedThemePaths.has(preferredTheme) ? preferredTheme : (firstUnusedTheme || preferredTheme || '');
  const label = themeLeafLabel(themePath, block?.name || '记录预设');
  let variantId = makeVariantId(label || `preset-${variants.length + 1}`);
  if (usedVariantIds.has(variantId)) {
    let index = 2;
    while (usedVariantIds.has(`${variantId}-${index}`)) index += 1;
    variantId = `${variantId}-${index}`;
  }
  const fields = ensureThemeField(base.fields || [], themePath);
  return {
    ...base,
    variantId,
    name: label || '记录预设',
    sortOrder: variants.length * 10,
    themePath,
    fields,
    defaultValues: mergeDefaultValues(
      { ...base, themePath, fields, name: label || '记录预设', variantId } as GoalTemplateDraftState,
      themes.find((theme) => normalizeThemePath(theme.path) === themePath)?.icon,
    ),
  };
}

export function buildInheritedDraft(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const baseFields = ensureThemeField(cloneValue(block?.fields || []), previous.themePath);
  const requiredFields = deriveRequiredFields(baseFields);
  return {
    ...previous,
    fields: baseFields,
    outputTemplate: block?.outputTemplate || '',
    targetFile: block?.targetFile || '',
    appendUnderHeader: block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields,
    defaultValues: mergeDefaultValues({ ...previous, fields: baseFields } as GoalTemplateDraftState),
  };
}

export function switchDraftToOverride(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const base = buildInheritedDraft(previous, block);
  return {
    ...previous,
    fields: previous.fields?.length ? previous.fields : base.fields,
    outputTemplate: previous.outputTemplate || base.outputTemplate,
    targetFile: previous.targetFile || base.targetFile,
    appendUnderHeader: previous.appendUnderHeader || base.appendUnderHeader,
    requiredFields: previous.requiredFields?.length ? previous.requiredFields : base.requiredFields,
  };
}
