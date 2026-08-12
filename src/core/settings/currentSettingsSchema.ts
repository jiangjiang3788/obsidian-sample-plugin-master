import { DEFAULT_SETTINGS, THINK_SETTINGS_SCHEMA_VERSION } from '@/core/settings/ThinkSettings';
import type { InputSettings } from '@/core/recordInput/CaptureTemplate';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy';
import { assertCanonicalGoalSettings } from '@/core/goal';
import { getEffectiveCoreBlocks } from '@/core/blocks';

export const THINK_SETTINGS_SCHEMA_POLICY = 'current-only' as const;

export interface CurrentSettingsSchemaStatus {
  readonly schemaVersion: number;
  readonly policy: typeof THINK_SETTINGS_SCHEMA_POLICY;
  readonly supportsLegacyMigration: false;
}

export const CURRENT_THINK_SETTINGS_SCHEMA: CurrentSettingsSchemaStatus = {
  schemaVersion: THINK_SETTINGS_SCHEMA_VERSION,
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
    // Settings Compact V5: blocks are runtime projections of canonical CoreBlock definitions, never persisted user data.
    blocks: [],
    themes: Array.isArray(raw.themes) ? raw.themes as InputSettings['themes'] : [],
  };
}


function assertCurrentSchemaVersion(raw: Record<string, unknown>): void {
  if (Object.keys(raw).length === 0) return;
  if (raw.schemaVersion === THINK_SETTINGS_SCHEMA_VERSION) return;

  throw new Error(
    `Think OS settings schema mismatch: expected current schemaVersion ${THINK_SETTINGS_SCHEMA_VERSION}. ` +
    'This single-user build does not run legacy settings migrations. Update data.json to the current shape or remove it to start fresh.'
  );
}

/**
 * Current-only settings loader.
 *
 * This deliberately does not migrate old data.json shapes. Empty storage starts
 * from DEFAULT_SETTINGS; existing local data must already declare the current
 * schemaVersion. The function still fills missing current-version arrays with
 * safe defaults so a partially edited local data.json cannot crash startup.
 */
export function toCurrentThinkSettings(rawValue: unknown): ThinkSettings {
  const raw = isRecord(rawValue) ? rawValue : {};
  assertCurrentSchemaVersion(raw);

  const partial = raw as Partial<ThinkSettings>;
  assertCanonicalGoalSettings(partial.goalSettings);
  const current: ThinkSettings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    schemaVersion: THINK_SETTINGS_SCHEMA_VERSION,
    groups: Array.isArray(partial.groups) ? partial.groups : [],
    viewInstances: Array.isArray(partial.viewInstances) ? partial.viewInstances : [],
    layouts: Array.isArray(partial.layouts) ? partial.layouts : [],
    inputSettings: normalizeInputSettings(partial.inputSettings),
    energySettings: { ...DEFAULT_ENERGY_SETTINGS, ...(isRecord(partial.energySettings) ? partial.energySettings : {}) },
    activeThemePaths: Array.isArray(partial.activeThemePaths) ? partial.activeThemePaths : [],
  };
  current.inputSettings.blocks = getEffectiveCoreBlocks(current);
  return current;
}

export function isCurrentThinkSettings(value: unknown): value is ThinkSettings {
  return isRecord(value) && value.schemaVersion === THINK_SETTINGS_SCHEMA_VERSION;
}

/**
 * Settings Compact V5 persistence DTO. Runtime inputSettings.blocks is a computed
 * CoreBlock projection and must never be written to data.json. GoalTemplate
 * defaultValues persist canonical keys only; Chinese labels belong to Markdown/UI.
 */
export function toPersistedThinkSettings(settings: ThinkSettings): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, any>;
  if (isRecord(out.inputSettings)) delete out.inputSettings.blocks;

  const templates = out.goalSettings?.goalTemplates;
  if (Array.isArray(templates)) {
    for (const template of templates) {
      if (!isRecord(template) || !isRecord(template.defaultValues)) continue;
      const defaults = template.defaultValues as Record<string, unknown>;
      if (defaults.themePath === undefined && defaults['主题'] !== undefined) defaults.themePath = defaults['主题'];
      if (defaults.icon === undefined && defaults['图标'] !== undefined) defaults.icon = defaults['图标'];
      delete defaults['主题'];
      delete defaults['图标'];
      if (Object.keys(defaults).length === 0) delete template.defaultValues;
    }
  }
  return out;
}
