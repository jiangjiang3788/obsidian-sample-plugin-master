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
export { resolveDerivedPeriod, normalizePeriodGranularity } from './period';
export { getGoalTemplates, getGoalTemplateId, getGoalTemplateCandidateGoalIds, getGoalTemplateVariants, findGoalTemplate, fromLegacyGoalTemplateStorage, toLegacyGoalTemplateStorage, upsertGoalTemplateInSettings, removeGoalTemplateFromSettings, removeGoalTemplatesForGoal } from './templates';
export type { GoalTemplate } from './templates';
export { buildThemeOverrideGoalMigrationPlan, buildGoalDefinitionFromThemeMigration, buildGoalTemplateFromThemeMigration, normalizeGoalSettingsForMigration, validateThemeOverrideGoalMigration, buildLegacyOverrideTemplateTargets, buildThemeOverrideRecordMigrationPreview, buildThemeOverrideMigrationAudit, buildThemeOverrideRecordDeepScan, buildThemeOverrideMigrationRegressionReport, buildThemeOverrideMigrationSummaryReport } from './themeOverrideMigration';
export type { ThemeOverrideGoalMigrationCandidate, ThemeOverrideGoalMigrationPlan, BuildThemeOverrideGoalMigrationPlanOptions, ThemeOverrideGoalMigrationValidationIssue, ThemeOverrideGoalMigrationValidationReport, LegacyOverrideRecordTarget, ThemeOverrideRecordMigrationPreview, ThemeOverrideRecordMigrationPreviewItem, ThemeOverrideMigrationAudit, ThemeOverrideMigrationAuditRow, ThemeOverrideMigrationAuditThemeRow, ThemeOverrideMigrationAuditBlockRow, ThemeOverrideRecordDeepScanReport, ThemeOverrideRecordDeepScanSample, ThemeOverrideRecordDeepScanOverrideRow, ThemeOverrideRecordShape, ThemeOverrideMigrationRegressionReport, ThemeOverrideMigrationBlockRegressionRow, ThemeOverrideMigrationRegressionStatus } from './themeOverrideMigration';
export type { DerivedPeriod } from './period';

export { inferGoalCandidatesFromItems, buildGoalRelationsFromItems, buildGoalOverviewModel, buildGoalMarkdownBackfillPreview, buildGoalMarkdownBackfillDiffPreview, makeStableGoalIdFromPath } from './overview';
export type { GoalMigrationCandidate, GoalOverviewModel, GoalOverviewRow, GoalOverviewMetricProgress, GoalOverviewCycleSummary, GoalMarkdownBackfillPreview, GoalMarkdownBackfillPreviewItem, GoalMarkdownBackfillDiffPreview, GoalMarkdownBackfillDiffItem } from './overview';

export { UNASSIGNED_GOAL_KEY, getItemGoalKey, getItemGoalLabel, getItemThemeKey, getItemThemeLabel, buildGoalThemeBreakdown, buildGoalBuckets } from './itemGoalGrouping';
export type { GoalBucket, GoalThemeBreakdownRow } from './itemGoalGrouping';
