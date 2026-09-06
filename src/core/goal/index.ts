// src/core/goal/index.ts
export type {
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
export { getGoalPathCandidates, normalizeGoalPath, requireGoalPath, splitGoalPath, getParentGoalPath, getGoalLeaf, isGoalPathDescendant } from './path';
export { getGoalOrderPath, getGoalOrderLabel, createGoalOrderIndex, sortGoalsBySettingsOrder, compareGoalPathsBySettingsOrder, sortGoalPathsBySettingsOrder, sortGoalTemplatesBySettingsOrder } from './order';
export type { GoalOrderIndex } from './order';
export type { GoalPathParts } from './path';
export { resolveDerivedPeriod, normalizePeriodGranularity, isPeriodAwareRecordType, normalizePeriodPolicyGranularity, resolveTemplatePeriodPolicy } from './period';
export { SYSTEM_RECORD_CONTEXT_FIELD_KEYS, isSystemRecordContextField } from './contextFields';
export { getGoalTemplates, getGoalTemplateId, findGoalTemplate, findDirectGoalTemplate, normalizeGoalTemplateStorageRow, toGoalTemplateStorageRow, upsertGoalTemplateInSettings, removeGoalTemplateFromSettings, removeGoalTemplatesForGoal, cleanupGoalTemplateStorage } from './templates';
export { getGoalTemplateDisplayInfo, getGoalTemplateDisplayName, isGeneratedGoalTemplateName, readGoalTemplateIcon } from './templateDisplay';
export type { GoalTemplateDisplayInfo } from './templateDisplay';
export { goalTemplateHasCustomOverrides, inferGoalTemplateEditMode } from './templateMode';
export type { GoalTemplateEditMode } from './templateMode';
export type { GoalTemplate } from './templates';
export type { DerivedPeriod } from './period';
export { compactGoalTemplateForStorage, describeGoalTemplateStorageDiff } from './templateOverrideDiff';
export type { CompactGoalTemplateOptions } from './templateOverrideDiff';


export { UNASSIGNED_GOAL_KEY, getItemGoalKey, getItemRootGoalKey, getItemGoalLabel, buildGoalBuckets } from './itemGoalGrouping';
export type { GoalBucket } from './itemGoalGrouping';
