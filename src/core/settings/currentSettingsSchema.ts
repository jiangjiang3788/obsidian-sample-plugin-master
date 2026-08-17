import { DEFAULT_SETTINGS } from '@/core/settings/ThinkSettings';
import type { InputSettings } from '@/core/recordInput/CaptureTemplate';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy';
import { assertCanonicalGoalSettings, getGoalTemplateId, normalizeGoalPath } from '@/core/goal';
import { getEffectiveCoreBlocks } from '@/core/blocks';
import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow } from '@/core/goal';

/**
 * Goal-only single-user settings policy.
 *
 * Persisted data.json has no data-version field and no legacy migration matrix.
 * The file is always interpreted as the current Goal-only shape.
 */
export const THINK_SETTINGS_SCHEMA_POLICY = 'current-only' as const;

export interface CurrentSettingsSchemaStatus {
  readonly policy: typeof THINK_SETTINGS_SCHEMA_POLICY;
  readonly supportsLegacyMigration: false;
}

export const CURRENT_THINK_SETTINGS_SCHEMA: CurrentSettingsSchemaStatus = {
  policy: THINK_SETTINGS_SCHEMA_POLICY,
  supportsLegacyMigration: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInputSettings(value: unknown): InputSettings {
  const raw = isRecord(value) ? value : {};
  return {
    ...DEFAULT_SETTINGS.inputSettings,
    ...(raw as Partial<InputSettings>),
    // Core blocks are runtime projections. Goal is the only classification dimension.
    blocks: [],
  };
}

/** Hydrate compact persisted Goal rows into the existing runtime domain shape. */
function hydrateGoalOnlySettings(value: unknown): GoalSettings {
  const raw = isRecord(value) ? value : {};
  const rawGoals = Array.isArray(raw.goals) ? raw.goals : [];
  const goals: GoalDefinition[] = rawGoals.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid Goal row: expected object.');
    const path = normalizeGoalPath(String(entry.path ?? ''));
    if (!path) throw new Error('Invalid Goal row: path is required.');
    return {
      path,
      description: typeof entry.description === 'string' ? entry.description : undefined,
      status: ['active', 'paused', 'completed', 'archived'].includes(String(entry.status))
        ? entry.status as GoalDefinition['status']
        : 'active',
      metrics: Array.isArray(entry.metrics) ? entry.metrics as GoalDefinition['metrics'] : [],
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
      ...(typeof entry.icon === 'string' ? { icon: entry.icon } : null),
      ...(typeof entry.color === 'string' ? { color: entry.color } : null),
      ...(typeof entry.sortOrder === 'number' ? { sortOrder: entry.sortOrder } : null),
    } as GoalDefinition;
  });
  const goalPaths = new Set(goals.map((goal) => goal.path));

  const rawTemplates = Array.isArray(raw.goalTemplates) ? raw.goalTemplates : [];
  const goalTemplates: GoalTemplateStorageRow[] = rawTemplates.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid GoalTemplate row: expected object.');
    const goalPath = normalizeGoalPath(String(entry.goalPath ?? ''));
    const coreBlockId = String(entry.coreBlockId ?? '').trim();
    if (!goalPath || !goalPaths.has(goalPath)) throw new Error(`GoalTemplate references missing Goal path (${goalPath || '<empty>'}).`);
    if (!coreBlockId) throw new Error(`GoalTemplate ${goalPath} is missing coreBlockId.`);
    const fields = Array.isArray(entry.fields)
      ? entry.fields.filter((field) => {
          if (!isRecord(field)) return false;
          return field.semantic !== 'goalPath' && field.key !== 'goalPath' && field.key !== '目标';
        }) as GoalTemplateStorageRow['fields']
      : undefined;
    const defaults = isRecord(entry.defaultValues) ? { ...entry.defaultValues } : undefined;
    if (defaults) {
      delete defaults.goalPath;
      delete defaults['目标'];
    }
    return {
      goalPath,
      coreBlockId,
      description: typeof entry.description === 'string' ? entry.description : undefined,
      enabled: entry.enabled !== false,
      periodPolicy: isRecord(entry.periodPolicy) ? entry.periodPolicy as GoalTemplateStorageRow['periodPolicy'] : undefined,
      fields,
      targetFile: typeof entry.targetFile === 'string' ? entry.targetFile : undefined,
      appendUnderHeader: typeof entry.appendUnderHeader === 'string' ? entry.appendUnderHeader : undefined,
      defaultValues: defaults && Object.keys(defaults).length ? defaults : undefined,
      requiredFields: Array.isArray(entry.requiredFields) ? entry.requiredFields.map(String) : undefined,
    };
  });

  const hydrated = { goals, goalTemplates };
  assertCanonicalGoalSettings(hydrated);
  return hydrated;
}

/** Current-only settings loader. Existing local data must already be Goal-only. */
export function toCurrentThinkSettings(rawValue: unknown): ThinkSettings {
  const raw = isRecord(rawValue) ? rawValue : {};
  const partial = raw as Partial<ThinkSettings>;
  const current: ThinkSettings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    // Kept runtime-only because a few infrastructure APIs still expose the
    // historical property. It is deliberately omitted by persistence.
      groups: Array.isArray(partial.groups) ? partial.groups : [],
    viewInstances: Array.isArray(partial.viewInstances) ? partial.viewInstances : [],
    layouts: Array.isArray(partial.layouts) ? partial.layouts : [],
    inputSettings: normalizeInputSettings(partial.inputSettings),
    goalSettings: hydrateGoalOnlySettings(raw.goalSettings),
    energySettings: { ...DEFAULT_ENERGY_SETTINGS, ...(isRecord(partial.energySettings) ? partial.energySettings : {}) },
  };
  current.inputSettings.blocks = getEffectiveCoreBlocks(current);
  return current;
}

export function isCurrentThinkSettings(value: unknown): value is ThinkSettings {
  if (!isRecord(value)) return false;
  try {
    hydrateGoalOnlySettings(value.goalSettings);
    return true;
  } catch {
    return false;
  }
}

function persistGoalOnlySettings(settings: ThinkSettings): Record<string, unknown> {
  const runtime = settings.goalSettings || { goals: [], goalTemplates: [] };
  const goals = (runtime.goals || []).map((goal) => {
    const path = normalizeGoalPath(goal.path);
    if (!path) throw new Error('Cannot persist Goal without canonical path.');
    const source = goal as GoalDefinition & { icon?: string; color?: string; sortOrder?: number };
    return {
      path,
      status: goal.status,
      ...(goal.description ? { description: goal.description } : null),
      ...(source.icon ? { icon: source.icon } : null),
      ...(source.color ? { color: source.color } : null),
      ...(typeof source.sortOrder === 'number' ? { sortOrder: source.sortOrder } : null),
      ...(goal.metrics?.length ? { metrics: goal.metrics } : null),
    };
  });

  const goalTemplates = (runtime.goalTemplates || []).map((template) => {
    const path = normalizeGoalPath(template.goalPath);
    if (!path) throw new Error('Cannot persist GoalTemplate without canonical Goal path.');
    const fields = (template.fields || []).filter((field) => {
      const record = field as unknown as Record<string, unknown>;
      return record.semantic !== 'goalPath' && record.key !== 'goalPath' && record.key !== '目标';
    });
    const defaults = { ...(template.defaultValues || {}) } as Record<string, unknown>;
    for (const key of ['goalPath', '目标']) delete defaults[key];
    return {
      goalPath: path,
      coreBlockId: template.coreBlockId,
      ...(template.description ? { description: template.description } : null),
      enabled: template.enabled !== false,
      ...(template.periodPolicy ? { periodPolicy: template.periodPolicy } : null),
      ...(fields.length ? { fields } : null),
      ...(template.targetFile ? { targetFile: template.targetFile } : null),
      ...(template.appendUnderHeader ? { appendUnderHeader: template.appendUnderHeader } : null),
      ...(Object.keys(defaults).length ? { defaultValues: defaults } : null),
      ...(template.requiredFields?.length ? { requiredFields: template.requiredFields } : null),
    };
  });
  return { goals, goalTemplates };
}

/** Persist only the current Goal-only data shape. */
export function toPersistedThinkSettings(settings: ThinkSettings): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, any>;
  if (isRecord(out.inputSettings)) {
    delete out.inputSettings.blocks;
  }

  out.goalSettings = persistGoalOnlySettings(settings);
  return out;
}
