import type { GoalDefinition } from '@core/goal/public';
import type { ThemeDefinition } from '@core/types/public';

import { buildFieldSourceSummary } from '../quickInputFieldSourceModel';
import { splitThemePathParts } from '../quickInputPathModel';
import type {
  QuickInputEditorState,
  QuickInputFieldSourceMap,
  QuickInputFormData,
  QuickInputPeriodLike,
  QuickInputTemplateLike,
  TimeDirection,
} from './types';

export interface BuildQuickInputEditorStateInput {
  blockId: string;
  effectiveBlockId?: string | null;
  selectedGoal?: GoalDefinition | null;
  selectedGoalId?: string | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  currentGoalParts: { root?: string | null; leaf?: string | null };
  currentPeriod?: QuickInputPeriodLike | null;
  selectedThemeId: string | null;
  themeIdMap: Map<string, ThemeDefinition>;
  theme?: ThemeDefinition | null;
  formData: QuickInputFormData;
  currentPeriodFields: QuickInputFormData;
  timeDirection: TimeDirection;
  template: QuickInputTemplateLike | null;
  templateId: string | null;
  resolvedTemplateVariantId?: string | null;
  selectedTemplateVariantId?: string | null;
  templateSourceType: 'core-block' | 'goal-template' | null;
  fieldSources: QuickInputFieldSourceMap;
}

export function buildQuickInputEditorState(input: BuildQuickInputEditorStateInput): QuickInputEditorState {
  const currentTheme = input.selectedThemeId
    ? (input.themeIdMap.get(input.selectedThemeId) ?? input.theme ?? null)
    : (input.theme ?? null);
  const effectiveThemePath = String(
    input.formData.themePath ??
      input.formData['主题'] ??
      currentTheme?.path ??
      input.selectedGoal?.themePath ??
      '',
  ).trim();
  const themeParts = splitThemePathParts(effectiveThemePath || null);
  const templateVariantId = input.resolvedTemplateVariantId || input.selectedTemplateVariantId || null;
  return {
    blockId: input.blockId,
    coreBlockId: input.effectiveBlockId,
    goalId: input.selectedGoal?.id || input.selectedGoalId,
    goalPath: input.currentGoalPath,
    goalTitle: input.currentGoalTitle,
    rootGoal: input.currentGoalParts.root,
    leafGoal: input.currentGoalParts.leaf,
    cycleId: input.currentPeriod?.id || null,
    themeId: input.selectedThemeId,
    formData: {
      ...input.formData,
      templateId: input.templateId || undefined,
      goalTemplateId: input.templateId || undefined,
      templateVariantId: templateVariantId || undefined,
      goalTemplateVariantId: templateVariantId || undefined,
      ...input.currentPeriodFields,
      __timeDirection: input.timeDirection,
    },
    meta: { timeDirection: input.timeDirection },
    template: input.template,
    theme: currentTheme,
    templateId: input.templateId,
    templateVariantId,
    templateSourceType: input.templateSourceType,
    fieldSources: input.fieldSources,
    ...themeParts,
    fieldSourceSummary: buildFieldSourceSummary(input.fieldSources),
  };
}
