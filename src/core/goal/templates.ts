import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { GoalTemplateStorageRow, GoalDefinition, GoalSettings, PeriodPolicy } from './types';
import { getGoalPathCandidates, normalizeGoalPath, splitGoalPath } from './path';
import { isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity } from './period';

/** One Goal path × one CoreBlock template. */
export interface GoalTemplate {
  /** Runtime-only stable key; never persisted. */
  id: string;
  /** Canonical human-readable Goal path and the only Goal identity on a template. */
  goalPath: string;
  coreBlockId: string;
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

function normalizeTemplatePeriodPolicy(coreBlockId: string, raw: any): PeriodPolicy | undefined {
  if (!isPeriodAwareCoreBlock(coreBlockId)) return undefined;
  const policy = raw?.periodPolicy;
  if (policy && policy.enabled !== false) {
    return { enabled: true, granularity: normalizePeriodPolicyGranularity(policy.granularity) };
  }
  return { enabled: true, granularity: 'week' };
}

export function getGoalTemplateId(goalPath: string, coreBlockId: string): string {
  return `goal-template.${safeIdPart(canonicalGoalPath(goalPath))}.${safeIdPart(coreBlockId)}`;
}

export function normalizeGoalTemplateStorageRow(row: GoalTemplateStorageRow): GoalTemplate {
  const goalPath = canonicalGoalPath(row.goalPath);
  return {
    id: getGoalTemplateId(goalPath, row.coreBlockId),
    goalPath,
    coreBlockId: row.coreBlockId,
    description: row.description,
    periodPolicy: normalizeTemplatePeriodPolicy(row.coreBlockId, row),
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
    coreBlockId: template.coreBlockId,
    description: template.description || undefined,
    periodPolicy: normalizeTemplatePeriodPolicy(template.coreBlockId, template),
    enabled: template.enabled !== false,
    fields: template.fields?.length ? template.fields : undefined,
    targetFile: template.targetFile || undefined,
    appendUnderHeader: template.appendUnderHeader || undefined,
    defaultValues: template.defaultValues && Object.keys(template.defaultValues).length ? template.defaultValues : undefined,
    requiredFields: template.requiredFields?.length ? template.requiredFields : undefined,
  };
}

function goalTemplateIdentityKey(template: Pick<GoalTemplate, 'goalPath' | 'coreBlockId'>): string {
  return `${canonicalGoalPath(template.goalPath)}::${template.coreBlockId}`;
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
      // Current-only invariant: one Goal path × CoreBlock. Latest row wins if
      // malformed duplicate storage is encountered during cleanup.
      result[existingIndex] = template;
    }
  }
  return result;
}

export function getGoalTemplateCandidateGoalPaths(goal: GoalDefinition | null): string[] {
  if (!goal) return [];
  const path = splitGoalPath(goal.path).goalPath;
  return getGoalPathCandidates(path);
}

/** Resolve the nearest enabled template, walking from leaf Goal to its parents. */
export function findGoalTemplate(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null, coreBlockId: string): GoalTemplate | null {
  const candidates = getGoalTemplateCandidateGoalPaths(goal);
  if (!candidates.length) return null;
  const byIdentity = new Map(
    getGoalTemplates(goalSettings)
      .filter((template) => template.enabled !== false && template.coreBlockId === coreBlockId)
      .map((template) => [canonicalGoalPath(template.goalPath), template] as const),
  );
  for (const path of candidates) {
    const template = byIdentity.get(path);
    if (template) return template;
  }
  return null;
}

/** Direct template lookup used by the settings matrix. No ancestor fallback. */
export function findDirectGoalTemplate(goalSettings: GoalSettings | undefined, goalPath: string, coreBlockId: string): GoalTemplate | null {
  const path = canonicalGoalPath(goalPath);
  return getGoalTemplates(goalSettings).find((template) => template.goalPath === path && template.coreBlockId === coreBlockId) || null;
}

export function upsertGoalTemplateInSettings(goalSettings: GoalSettings, template: GoalTemplate): GoalSettings {
  const path = canonicalGoalPath(template.goalPath);
  if (!path) throw new Error('GoalTemplate requires a canonical Goal path.');
  const next = toGoalTemplateStorageRow({ ...template, goalPath: path, id: getGoalTemplateId(path, template.coreBlockId) });
  const rows = [...(goalSettings.goalTemplates || [])];
  const index = rows.findIndex((row) => canonicalGoalPath(row.goalPath) === path && row.coreBlockId === template.coreBlockId);
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  return { ...goalSettings, goalTemplates: rows };
}

export function removeGoalTemplateFromSettings(goalSettings: GoalSettings, goalPath: string, coreBlockId: string): GoalSettings {
  const path = canonicalGoalPath(goalPath);
  return {
    ...goalSettings,
    goalTemplates: (goalSettings.goalTemplates || []).filter((template) => !(canonicalGoalPath(template.goalPath) === path && template.coreBlockId === coreBlockId)),
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
