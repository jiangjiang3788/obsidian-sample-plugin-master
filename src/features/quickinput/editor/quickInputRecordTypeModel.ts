import { ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { GoalTemplateResolver } from '@core/recordInput/public';
import type { RecordInputSessionMode } from '@core/recordInput/public';
import type { ThinkSettings } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';

export interface ResolveQuickInputRecordTypeRuntimeInput {
  settings: ThinkSettings;
  isEnergyDirect: boolean;
  currentRecordTypeId: string;
  selectedGoal: GoalDefinition | null;
  selectedGoalPath: string | null;
  requireDirectGoalTemplate?: boolean;
}


export function shouldRequireDirectGoalTemplateForQuickInput(
  mode: RecordInputSessionMode,
  isEnergyDirect: boolean,
): boolean {
  return mode === 'create' && !isEnergyDirect;
}

export function resolveQuickInputRecordTypeRuntime(input: ResolveQuickInputRecordTypeRuntimeInput) {
  if (input.isEnergyDirect) {
    return {
      template: null,
      goal: input.selectedGoal,
      templateId: null,
      templateSourceType: null,
      effectiveRecordTypeId: ENERGY_RECORD_TYPE_ID,
    };
  }

  return GoalTemplateResolver.resolve({
    settings: input.settings,
    recordTypeId: input.currentRecordTypeId,
    goalPath: input.selectedGoal?.path || input.selectedGoalPath,
    requireDirectGoalTemplate: input.requireDirectGoalTemplate === true,
  });
}
