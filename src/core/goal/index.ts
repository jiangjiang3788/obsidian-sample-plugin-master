// src/core/goal/index.ts
export type {
  GoalId,
  CycleId,
  PlanId,
  TaskId,
  RecordId,
  ReviewId,
  GoalStatus,
  CycleStatus,
  CycleGranularity,
  GoalMetricDirection,
  GoalMetricContract,
  GoalDefinition,
  CycleDefinition,
  GoalRecordRelationType,
  GoalRecordRelation,
  PlanTaskRelation,
  GoalReviewSnapshot,
  GoalRelationHint,
  GoalBlockBinding,
  GoalSettings,
} from './types';
export { DEFAULT_GOAL_SETTINGS } from './types';
export { normalizeGoalPath, splitGoalPath } from './path';
export type { GoalPathParts } from './path';

export { inferGoalCandidatesFromItems, buildGoalRelationsFromItems, buildGoalOverviewModel, buildGoalMarkdownBackfillPreview, buildGoalMarkdownBackfillDiffPreview, makeStableGoalIdFromPath } from './overview';
export type { GoalMigrationCandidate, GoalOverviewModel, GoalOverviewRow, GoalOverviewMetricProgress, GoalOverviewCycleSummary, GoalMarkdownBackfillPreview, GoalMarkdownBackfillPreviewItem, GoalMarkdownBackfillDiffPreview, GoalMarkdownBackfillDiffItem } from './overview';
