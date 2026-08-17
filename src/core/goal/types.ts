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
}

/**
 * Current GoalTemplate storage contract.
 * One Goal path × one CoreBlock can have at most one row.
 * There is no variant identity, Theme context, preset name, or per-cell ordering.
 */
export interface GoalTemplateStorageRow {
  goalPath: string;
  coreBlockId: string;
  description?: string;
  enabled: boolean;
  periodPolicy?: PeriodPolicy;
  fields?: TemplateField[];
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
}

export interface GoalSettings {
  goals: GoalDefinition[];
  goalTemplates: GoalTemplateStorageRow[];
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  goals: [],
  goalTemplates: [],
};
