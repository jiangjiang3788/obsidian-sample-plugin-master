// src/core/goal/types.ts
import type { PeriodGranularity, PeriodPolicy } from '@/core/period/PeriodPolicy';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CycleGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type { PeriodGranularity, PeriodPolicy };

export type GoalMetricDirection = 'increase' | 'decrease' | 'maintain' | 'boolean';

export interface GoalMetricContract {
  key: string;
  label: string;
  direction: GoalMetricDirection;
  targetValue?: number;
  unit?: string;
}

/**
 * Canonical single-user Goal shape.
 *
 * `path` is both identity and human-readable hierarchy. There is no opaque ID,
 * duplicate goalPath/title snapshot, or persisted parent pointer. Parent/leaf/root
 * are derived from the slash path when needed.
 */
export interface GoalDefinition {
  path: string;
  description?: string;
  status: GoalStatus;
  metrics?: GoalMetricContract[];
  createdAt: string;
  updatedAt: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  /** Root Goal share of a natural 168-hour week. Root presets may leave reserve time. */
  timePresetPercent?: number;
  /** Optional stable weekly target for non-root Goals. Missing means actual-only, no preset. */
  weeklyTargetMinutes?: number;
}

/**
 * Current GoalTemplate storage contract.
 * One Goal path × one RecordType can have at most one row.
 * There is no variant identity, Theme context, preset name, or per-cell ordering.
 */
export interface GoalTemplateStorageRow {
  goalPath: string;
  recordTypeId: string;
  description?: string;
  enabled: boolean;
  periodPolicy?: PeriodPolicy;
  fields?: TemplateField[];
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
}

export interface GoalTimePresetSnapshotEntry {
  timePresetPercent?: number;
  weeklyTargetMinutes?: number;
}

/**
 * Weekly-effective preset snapshot. A revision is rewritten within the same ISO week,
 * so Timeline history reflects the preset that governed that week without keeping
 * noisy per-keystroke audit history.
 */
export interface GoalTimePresetRevision {
  /** Local-calendar Monday in YYYY-MM-DD form. */
  effectiveWeekStart: string;
  /** Full configured snapshot at that week; missing paths fall back to current preset. */
  presets: Record<string, GoalTimePresetSnapshotEntry>;
}

export interface GoalSettings {
  goals: GoalDefinition[];
  goalTemplates: GoalTemplateStorageRow[];
  timePresetRevisions?: GoalTimePresetRevision[];
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  goals: [],
  goalTemplates: [],
  timePresetRevisions: [],
};
