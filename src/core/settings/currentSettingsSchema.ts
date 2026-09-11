import { DEFAULT_SETTINGS } from '@/core/settings/ThinkSettings';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy';
import { assertCanonicalGoalSettings, normalizeGoalPath, stripGoalTemplateIconDefaults, stripGoalTemplateIconFieldDefaults } from '@/core/goal';
import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow, GoalTimePresetRevision, GoalTimePresetSnapshotEntry } from '@/core/goal';

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

function readLegacyTemplateIcon(entry: Record<string, unknown>): string {
  const defaults = isRecord(entry.defaultValues) ? entry.defaultValues : {};
  const direct = String(defaults.icon ?? defaults['图标'] ?? '').trim();
  if (direct) return direct;
  const fields = Array.isArray(entry.fields) ? entry.fields : [];
  for (const rawField of fields) {
    if (!isRecord(rawField)) continue;
    const key = String(rawField.key ?? rawField.label ?? '').trim();
    const semantic = String(rawField.semantic ?? rawField.semanticType ?? '').trim();
    if (key !== 'icon' && key !== '图标' && semantic !== 'icon') continue;
    const value = String(rawField.defaultValue ?? '').trim();
    if (value) return value;
  }
  return '';
}

function backfillGoalIconsFromLegacyTemplates(goals: GoalDefinition[], rawTemplates: unknown[]): void {
  const candidates = new Map<string, Set<string>>();
  for (const rawEntry of rawTemplates) {
    if (!isRecord(rawEntry)) continue;
    const goalPath = normalizeGoalPath(String(rawEntry.goalPath ?? ''));
    const icon = readLegacyTemplateIcon(rawEntry);
    if (!goalPath || !icon) continue;
    const set = candidates.get(goalPath) || new Set<string>();
    set.add(icon);
    candidates.set(goalPath, set);
  }
  for (const goal of goals) {
    if (String(goal.icon || '').trim()) continue;
    const icons = Array.from(candidates.get(goal.path) || []);
    if (icons.length === 1) goal.icon = icons[0];
  }
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
      ...(typeof entry.timePresetPercent === 'number' ? { timePresetPercent: entry.timePresetPercent } : null),
      ...(typeof entry.weeklyTargetMinutes === 'number' ? { weeklyTargetMinutes: entry.weeklyTargetMinutes } : null),
    } as GoalDefinition;
  });
  const goalPaths = new Set(goals.map((goal) => goal.path));

  const rawTemplates = Array.isArray(raw.goalTemplates) ? raw.goalTemplates : [];
  backfillGoalIconsFromLegacyTemplates(goals, rawTemplates);
  const goalTemplates: GoalTemplateStorageRow[] = rawTemplates.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid GoalTemplate row: expected object.');
    const goalPath = normalizeGoalPath(String(entry.goalPath ?? ''));
    const recordTypeId = String(entry.recordTypeId ?? '').trim();
    if (!goalPath || !goalPaths.has(goalPath)) throw new Error(`GoalTemplate references missing Goal path (${goalPath || '<empty>'}).`);
    if (!recordTypeId) throw new Error(`GoalTemplate ${goalPath} is missing recordTypeId.`);
    const fields = stripGoalTemplateIconFieldDefaults(Array.isArray(entry.fields)
      ? entry.fields.filter((field) => {
          if (!isRecord(field)) return false;
          return field.semantic !== 'goalPath' && field.key !== 'goalPath' && field.key !== '目标';
        }) as GoalTemplateStorageRow['fields']
      : undefined);
    const defaults = stripGoalTemplateIconDefaults(isRecord(entry.defaultValues) ? { ...entry.defaultValues } : undefined);
    if (defaults) {
      delete defaults.goalPath;
      delete defaults['目标'];
    }
    return {
      goalPath,
      recordTypeId,
      description: typeof entry.description === 'string' ? entry.description : undefined,
      enabled: entry.enabled !== false,
      periodPolicy: isRecord(entry.periodPolicy) ? entry.periodPolicy as unknown as GoalTemplateStorageRow['periodPolicy'] : undefined,
      fields,
      targetFile: typeof entry.targetFile === 'string' ? entry.targetFile : undefined,
      appendUnderHeader: typeof entry.appendUnderHeader === 'string' ? entry.appendUnderHeader : undefined,
      defaultValues: defaults && Object.keys(defaults).length ? defaults : undefined,
      requiredFields: Array.isArray(entry.requiredFields) ? entry.requiredFields.map(String) : undefined,
    };
  });

  const rawRevisions = Array.isArray(raw.timePresetRevisions) ? raw.timePresetRevisions : [];
  const timePresetRevisions: GoalTimePresetRevision[] = rawRevisions.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid timePresetRevision: expected object.');
    const effectiveWeekStart = String(entry.effectiveWeekStart ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveWeekStart)) throw new Error('Invalid timePresetRevision effectiveWeekStart.');
    const rawPresets = isRecord(entry.presets) ? entry.presets : {};
    const presets: Record<string, GoalTimePresetSnapshotEntry> = {};
    for (const [rawPath, rawPreset] of Object.entries(rawPresets)) {
      const path = normalizeGoalPath(rawPath);
      if (!path || !isRecord(rawPreset)) continue;
      const preset: GoalTimePresetSnapshotEntry = {};
      if (typeof rawPreset.timePresetPercent === 'number') preset.timePresetPercent = rawPreset.timePresetPercent;
      if (typeof rawPreset.weeklyTargetMinutes === 'number') preset.weeklyTargetMinutes = rawPreset.weeklyTargetMinutes;
      if (Object.keys(preset).length) presets[path] = preset;
    }
    return { effectiveWeekStart, presets };
  }).sort((a, b) => a.effectiveWeekStart.localeCompare(b.effectiveWeekStart));

  const hydrated = { goals, goalTemplates, timePresetRevisions };
  assertCanonicalGoalSettings(hydrated);
  return hydrated;
}



export function hasRetiredAssociationViewState(rawValue: unknown): boolean {
  if (!isRecord(rawValue)) return false;
  const rawViews = Array.isArray(rawValue.viewInstances) ? rawValue.viewInstances : [];
  return rawViews.some((entry) => isRecord(entry) && String(entry.viewType ?? '') === 'AssociationView');
}

function sanitizeViewState(raw: Record<string, unknown>): Pick<ThinkSettings, 'viewInstances' | 'layouts'> {
  const rawViews = Array.isArray(raw.viewInstances) ? raw.viewInstances : [];
  const retiredIds = new Set(
    rawViews
      .filter((entry) => isRecord(entry) && String(entry.viewType ?? '') === 'AssociationView' && typeof entry.id === 'string')
      .map((entry) => String((entry as Record<string, unknown>).id)),
  );
  const viewInstances = rawViews.filter(
    (entry) => !(isRecord(entry) && String(entry.viewType ?? '') === 'AssociationView'),
  ) as ThinkSettings['viewInstances'];

  const rawLayouts = Array.isArray(raw.layouts) ? raw.layouts : [];
  const layouts = rawLayouts.map((entry) => {
    if (!isRecord(entry)) return entry;
    const viewInstanceIds = (Array.isArray(entry.viewInstanceIds) ? entry.viewInstanceIds : [])
      .map((id) => String(id))
      .filter((id) => !retiredIds.has(id));
    const rawPlacements = isRecord(entry.viewPlacements) ? entry.viewPlacements : undefined;
    const viewPlacements = rawPlacements
      ? Object.fromEntries(Object.entries(rawPlacements).filter(([id]) => !retiredIds.has(id)))
      : undefined;
    return {
      ...entry,
      viewInstanceIds,
      ...(viewPlacements ? { viewPlacements } : {}),
    };
  }) as ThinkSettings['layouts'];

  return { viewInstances, layouts };
}

/** Current-only settings loader. Existing local data must already be Goal-only. */
export function toCurrentThinkSettings(rawValue: unknown): ThinkSettings {
  const raw = isRecord(rawValue) ? rawValue : {};
  const partial = raw as Partial<ThinkSettings>;
  const sanitizedViews = sanitizeViewState(raw);
  const current: ThinkSettings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    groups: Array.isArray(partial.groups) ? partial.groups : [],
    viewInstances: sanitizedViews.viewInstances,
    layouts: sanitizedViews.layouts,
    goalSettings: hydrateGoalOnlySettings(raw.goalSettings),
    energySettings: { ...DEFAULT_ENERGY_SETTINGS, ...(isRecord(partial.energySettings) ? partial.energySettings : {}) },
  };
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
  const runtime = settings.goalSettings || { goals: [], goalTemplates: [], timePresetRevisions: [] };
  const goals = (runtime.goals || []).map((goal) => {
    const path = normalizeGoalPath(goal.path);
    if (!path) throw new Error('Cannot persist Goal without canonical path.');
    const source = goal as GoalDefinition & { icon?: string; color?: string; sortOrder?: number; timePresetPercent?: number; weeklyTargetMinutes?: number };
    return {
      path,
      status: goal.status,
      ...(goal.description ? { description: goal.description } : null),
      ...(source.icon ? { icon: source.icon } : null),
      ...(source.color ? { color: source.color } : null),
      ...(typeof source.sortOrder === 'number' ? { sortOrder: source.sortOrder } : null),
      ...(typeof source.timePresetPercent === 'number' ? { timePresetPercent: source.timePresetPercent } : null),
      ...(typeof source.weeklyTargetMinutes === 'number' ? { weeklyTargetMinutes: source.weeklyTargetMinutes } : null),
      ...(goal.metrics?.length ? { metrics: goal.metrics } : null),
    };
  });

  const goalTemplates = (runtime.goalTemplates || []).map((template) => {
    const path = normalizeGoalPath(template.goalPath);
    if (!path) throw new Error('Cannot persist GoalTemplate without canonical Goal path.');
    const fields = stripGoalTemplateIconFieldDefaults((template.fields || []).filter((field) => {
      const record = field as unknown as Record<string, unknown>;
      return record.semantic !== 'goalPath' && record.key !== 'goalPath' && record.key !== '目标';
    })) || [];
    const defaults = { ...(stripGoalTemplateIconDefaults(template.defaultValues) || {}) } as Record<string, unknown>;
    for (const key of ['goalPath', '目标']) delete defaults[key];
    return {
      goalPath: path,
      recordTypeId: template.recordTypeId,
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
  const timePresetRevisions = (runtime.timePresetRevisions || []).map((revision) => ({
    effectiveWeekStart: revision.effectiveWeekStart,
    presets: Object.fromEntries(Object.entries(revision.presets || {}).map(([path, preset]) => [normalizeGoalPath(path), {
      ...(typeof preset.timePresetPercent === 'number' ? { timePresetPercent: preset.timePresetPercent } : null),
      ...(typeof preset.weeklyTargetMinutes === 'number' ? { weeklyTargetMinutes: preset.weeklyTargetMinutes } : null),
    }]).filter(([path]) => !!path)),
  }));
  return { goals, goalTemplates, timePresetRevisions };
}

/** Persist only the current Goal-only data shape. */
export function toPersistedThinkSettings(settings: ThinkSettings): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, any>;
  // RecordType definitions are code-registered and never persisted in data.json.
  delete out.inputSettings;
  delete out.coreBlockSettings;
  delete out.recordTypeSettings;

  out.goalSettings = persistGoalOnlySettings(settings);
  return out;
}
