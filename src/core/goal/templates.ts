import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { GoalTemplateStorageRow, GoalDefinition, GoalSettings, PeriodPolicy } from './types';
import { normalizeGoalPath } from './path';
import { isPeriodAwareRecordType, normalizePeriodPolicyGranularity } from './period';

/** One Goal path × one RecordType template. */
export interface GoalTemplate {
  /** Runtime-only stable key; never persisted. */
  id: string;
  /** Canonical human-readable Goal path and the only Goal identity on a template. */
  goalPath: string;
  recordTypeId: string;
  description?: string;
  periodPolicy?: PeriodPolicy;
  enabled: boolean;
  fields?: TemplateField[];
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
}

function safeIdPart(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-') || 'default';
}

function canonicalGoalPath(value?: string | null): string {
  return normalizeGoalPath(value) || '';
}

function normalizeTemplatePeriodPolicy(recordTypeId: string, raw: any): PeriodPolicy | undefined {
  if (!isPeriodAwareRecordType(recordTypeId)) return undefined;
  const policy = raw?.periodPolicy;
  if (policy && policy.enabled !== false) {
    return { enabled: true, granularity: normalizePeriodPolicyGranularity(policy.granularity) };
  }
  return { enabled: true, granularity: 'week' };
}

export function getGoalTemplateId(goalPath: string, recordTypeId: string): string {
  return `goal-template.${safeIdPart(canonicalGoalPath(goalPath))}.${safeIdPart(recordTypeId)}`;
}

export function normalizeGoalTemplateStorageRow(row: GoalTemplateStorageRow): GoalTemplate {
  const goalPath = canonicalGoalPath(row.goalPath);
  return {
    id: getGoalTemplateId(goalPath, row.recordTypeId),
    goalPath,
    recordTypeId: row.recordTypeId,
    description: row.description,
    periodPolicy: normalizeTemplatePeriodPolicy(row.recordTypeId, row),
    enabled: row.enabled !== false,
    fields: row.fields,
    targetFile: row.targetFile,
    appendUnderHeader: row.appendUnderHeader,
    defaultValues: row.defaultValues || {},
    requiredFields: row.requiredFields || [],
  };
}

export function toGoalTemplateStorageRow(template: GoalTemplate): GoalTemplateStorageRow {
  return {
    goalPath: canonicalGoalPath(template.goalPath),
    recordTypeId: template.recordTypeId,
    description: template.description || undefined,
    periodPolicy: normalizeTemplatePeriodPolicy(template.recordTypeId, template),
    enabled: template.enabled !== false,
    fields: template.fields?.length ? template.fields : undefined,
    targetFile: template.targetFile || undefined,
    appendUnderHeader: template.appendUnderHeader || undefined,
    defaultValues: template.defaultValues && Object.keys(template.defaultValues).length ? template.defaultValues : undefined,
    requiredFields: template.requiredFields?.length ? template.requiredFields : undefined,
  };
}

function goalTemplateIdentityKey(template: Pick<GoalTemplate, 'goalPath' | 'recordTypeId'>): string {
  return `${canonicalGoalPath(template.goalPath)}::${template.recordTypeId}`;
}

export function getGoalTemplates(goalSettings?: Pick<GoalSettings, 'goalTemplates'> | null): GoalTemplate[] {
  const result: GoalTemplate[] = [];
  const indexByKey = new Map<string, number>();
  for (const row of goalSettings?.goalTemplates || []) {
    const template = normalizeGoalTemplateStorageRow(row);
    const key = goalTemplateIdentityKey(template);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length);
      result.push(template);
    } else {
      // Current-only invariant: one Goal path × RecordType. Latest row wins if
      // malformed duplicate storage is encountered during cleanup.
      result[existingIndex] = template;
    }
  }
  return result;
}

/** Direct Goal + RecordType lookup. Goal templates never inherit from parent Goals. */
export function findGoalTemplate(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null, recordTypeId: string): GoalTemplate | null {
  if (!goal) return null;
  const path = canonicalGoalPath(goal.path);
  if (!path) return null;
  return getGoalTemplates(goalSettings).find((template) =>
    template.enabled !== false && template.goalPath === path && template.recordTypeId === recordTypeId
  ) || null;
}

/** Direct template lookup used by the settings matrix. No ancestor fallback. */
export function findDirectGoalTemplate(goalSettings: GoalSettings | undefined, goalPath: string, recordTypeId: string): GoalTemplate | null {
  const path = canonicalGoalPath(goalPath);
  return getGoalTemplates(goalSettings).find((template) => template.goalPath === path && template.recordTypeId === recordTypeId) || null;
}

export function upsertGoalTemplateInSettings(goalSettings: GoalSettings, template: GoalTemplate): GoalSettings {
  const path = canonicalGoalPath(template.goalPath);
  if (!path) throw new Error('GoalTemplate requires a canonical Goal path.');
  const next = toGoalTemplateStorageRow({ ...template, goalPath: path, id: getGoalTemplateId(path, template.recordTypeId) });
  const rows = [...(goalSettings.goalTemplates || [])];
  const index = rows.findIndex((row) => canonicalGoalPath(row.goalPath) === path && row.recordTypeId === template.recordTypeId);
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  return { ...goalSettings, goalTemplates: rows };
}

export function removeGoalTemplateFromSettings(goalSettings: GoalSettings, goalPath: string, recordTypeId: string): GoalSettings {
  const path = canonicalGoalPath(goalPath);
  return {
    ...goalSettings,
    goalTemplates: (goalSettings.goalTemplates || []).filter((template) => !(canonicalGoalPath(template.goalPath) === path && template.recordTypeId === recordTypeId)),
  };
}

export function removeGoalTemplatesForGoal(goalSettings: GoalSettings, goalPath: string): GoalSettings {
  const path = canonicalGoalPath(goalPath);
  return {
    ...goalSettings,
    goalTemplates: (goalSettings.goalTemplates || []).filter((template) => canonicalGoalPath(template.goalPath) !== path),
  };
}

export interface GoalTemplateStorageCleanupSummary {
  beforeCount: number;
  afterCount: number;
  removedDuplicateCount: number;
  changed: boolean;
}

export function cleanupGoalTemplateStorage(goalSettings: GoalSettings): { goalSettings: GoalSettings; summary: GoalTemplateStorageCleanupSummary } {
  const beforeRows = goalSettings.goalTemplates || [];
  const afterRows = getGoalTemplates(goalSettings).map(toGoalTemplateStorageRow);
  const beforeJson = JSON.stringify(beforeRows);
  const afterJson = JSON.stringify(afterRows);
  return {
    goalSettings: { ...goalSettings, goalTemplates: afterRows },
    summary: {
      beforeCount: beforeRows.length,
      afterCount: afterRows.length,
      removedDuplicateCount: Math.max(0, beforeRows.length - afterRows.length),
      changed: beforeJson !== afterJson,
    },
  };
}
