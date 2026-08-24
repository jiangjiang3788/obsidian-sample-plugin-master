import type { GoalDefinition } from '@core/goal/public';
import { buildFieldSourceSummary } from '../quickInputFieldSourceModel';
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
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  currentGoalParts: { root?: string | null; leaf?: string | null };
  currentPeriod?: QuickInputPeriodLike | null;
  formData: QuickInputFormData;
  currentPeriodFields: QuickInputFormData;
  timeDirection: TimeDirection;
  template: QuickInputTemplateLike | null;
  templateId: string | null;
  templateSourceType: 'record-type' | 'goal-template' | null;
  fieldSources: QuickInputFieldSourceMap;
}

export function buildQuickInputEditorState(input: BuildQuickInputEditorStateInput): QuickInputEditorState {
  return {
    blockId: input.blockId,
    recordTypeId: input.effectiveBlockId,
    goalPath: input.currentGoalPath,
    goalTitle: input.currentGoalTitle,
    rootGoal: input.currentGoalParts.root,
    leafGoal: input.currentGoalParts.leaf,
    cycleId: input.currentPeriod?.id || null,
    formData: {
      ...input.formData,
      templateId: input.templateId || undefined,
      goalTemplateId: input.templateId || undefined,
      ...input.currentPeriodFields,
      __timeDirection: input.timeDirection,
    },
    meta: { timeDirection: input.timeDirection },
    template: input.template,
    templateId: input.templateId,
    templateSourceType: input.templateSourceType,
    fieldSources: input.fieldSources,
    fieldSourceSummary: buildFieldSourceSummary(input.fieldSources),
  };
}
