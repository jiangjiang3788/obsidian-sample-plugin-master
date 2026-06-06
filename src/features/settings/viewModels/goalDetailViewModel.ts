import type { CycleDefinition, GoalDefinition, Item, ViewInstance } from '@core/public';
import { buildGoalOverviewModel } from '@core/public';

export interface GoalDetailViewModelInput {
  items: Item[];
  module: ViewInstance;
  goals?: GoalDefinition[];
  cycles?: CycleDefinition[];
}

export function buildGoalDetailViewModel({ items, module, goals = [], cycles = [] }: GoalDetailViewModelInput) {
  const config = module.viewConfig?.goalDetail || module.viewConfig?.goalOverview || module.viewConfig || {};
  return buildGoalOverviewModel({
    items,
    goals,
    cycles,
    selectedGoalPath: config.goalPath || null,
    limit: 1,
  });
}
