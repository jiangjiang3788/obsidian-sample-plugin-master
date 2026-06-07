/** DEPRECATED: GoalOverview / GoalDetail are legacy compatibility files. New views must use ProgressView / StatisticsView. */
import type { GoalDefinition, Item, ViewInstance } from '@core/public';
import { buildGoalOverviewModel } from '@core/public';

export interface GoalOverviewViewModelInput {
  items: Item[];
  module: ViewInstance;
  goals?: GoalDefinition[];
}

export function buildGoalOverviewViewModel({ items, module, goals = [] }: GoalOverviewViewModelInput) {
  const config = module.viewConfig?.goalOverview || module.viewConfig || {};
  return buildGoalOverviewModel({
    items,
    goals,
    selectedGoalPath: config.goalPath || null,
    limit: config.limit || 20,
  });
}
