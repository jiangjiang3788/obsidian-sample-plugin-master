// src/core/goal/index.ts
export type {
  GoalId,
  GoalStatus,
  CycleGranularity,
  PeriodGranularity,
  PeriodPolicy,
  GoalMetricDirection,
  GoalMetricContract,
  GoalDefinition,
  GoalTemplateStorageRow,
  GoalSettings,
} from './types';
export { DEFAULT_GOAL_SETTINGS } from './types';
export { assertCanonicalGoalSettings } from './invariants';
export { getGoalPathCandidates, makeStableGoalIdFromPath, normalizeGoalPath, requireGoalPath, splitGoalPath } from './path';
export { getGoalOrderPath, getGoalOrderLabel, createGoalOrderIndex, sortGoalsBySettingsOrder, compareGoalPathsBySettingsOrder, sortGoalPathsBySettingsOrder, sortGoalTemplatesBySettingsOrder } from './order';
export type { GoalOrderIndex } from './order';
export type { GoalPathParts } from './path';
export { resolveDerivedPeriod, normalizePeriodGranularity, isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity, resolveTemplatePeriodPolicy } from './period';
export { DEFAULT_TEMPLATE_VARIANT_ID, SYSTEM_RECORD_CONTEXT_FIELD_KEYS, isSystemRecordContextField, normalizeTemplateVariantId, isDefaultTemplateVariant } from './templateVariant';
export { getGoalTemplates, getGoalTemplateId, getGoalTemplateCandidateGoalIds, getGoalTemplateVariants, findGoalTemplate, normalizeGoalTemplateStorageRow, toGoalTemplateStorageRow, upsertGoalTemplateInSettings, removeGoalTemplateFromSettings, removeGoalTemplatesForGoal, cleanupGoalTemplateStorage } from './templates';
export { getGoalTemplateDisplayInfo, getGoalTemplateDisplayName, isGeneratedGoalTemplateName, readGoalTemplateIcon, readGoalTemplateThemePath } from './templateDisplay';
export type { GoalTemplateDisplayInfo } from './templateDisplay';
export { goalTemplateHasCustomOverrides, inferGoalTemplateEditMode } from './templateMode';
export type { GoalTemplateEditMode } from './templateMode';
export type { GoalTemplate } from './templates';
export type { DerivedPeriod } from './period';
export type { TemplateVariantId, TemplateVariantIdentity } from './templateVariant';
export { compactGoalTemplateForStorage, describeGoalTemplateStorageDiff } from './templateVariantDiff';
export type { CompactGoalTemplateOptions } from './templateVariantDiff';


export { UNASSIGNED_GOAL_KEY, getItemGoalKey, getItemGoalLabel, getItemThemeKey, getItemThemeLabel, buildGoalThemeBreakdown, buildGoalBuckets } from './itemGoalGrouping';
export type { GoalBucket, GoalThemeBreakdownRow } from './itemGoalGrouping';
