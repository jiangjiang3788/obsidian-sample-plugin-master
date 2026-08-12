import { ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { GoalTemplateResolver } from '@core/recordInput/public';
import type { ThinkSettings } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';

export interface ResolveQuickInputRecordTypeRuntimeInput {
  settings: ThinkSettings;
  isEnergyDirect: boolean;
  currentBlockId: string;
  selectedGoal: GoalDefinition | null;
  selectedGoalId: string | null;
  selectedThemeId: string | null;
  selectedTemplateVariantId: string | null;
}

export function resolveQuickInputRecordTypeRuntime(input: ResolveQuickInputRecordTypeRuntimeInput) {
  if (input.isEnergyDirect) {
    return {
      template: null,
      theme: null,
      goal: input.selectedGoal,
      templateId: null,
      templateSourceType: null,
      effectiveBlockId: ENERGY_RECORD_TYPE_ID,
      templateVariantId: null,
    };
  }

  return GoalTemplateResolver.resolve({
    settings: input.settings,
    blockId: input.currentBlockId,
    goalId: input.selectedGoal?.id || input.selectedGoalId,
    themeId: input.selectedThemeId || undefined,
    templateVariantId: input.selectedTemplateVariantId || undefined,
  });
}
