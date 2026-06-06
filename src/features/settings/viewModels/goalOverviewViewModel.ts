import type { CycleDefinition, GoalDefinition, Item, ViewInstance } from '@core/public';
import { buildGoalOverviewModel } from '@core/public';

export interface GoalOverviewViewModelInput {
  items: Item[];
  module: ViewInstance;
  goals?: GoalDefinition[];
  cycles?: CycleDefinition[];
}

export function buildGoalOverviewViewModel({ items, module, goals = [], cycles = [] }: GoalOverviewViewModelInput) {
  const config = module.viewConfig?.goalOverview || module.viewConfig || {};
  return buildGoalOverviewModel({
    items,
    goals,
    cycles,
    selectedGoalPath: config.goalPath || null,
    limit: config.limit || 20,
  });
}
