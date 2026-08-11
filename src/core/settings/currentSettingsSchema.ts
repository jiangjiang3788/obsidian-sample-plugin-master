import {
  DEFAULT_SETTINGS,
  THINK_SETTINGS_SCHEMA_VERSION,
  type InputSettings,
  type ThinkSettings,
} from '@/core/types/schema';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy';

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
    blocks: Array.isArray(raw.blocks) ? raw.blocks as InputSettings['blocks'] : [],
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
  return {
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
}

export function isCurrentThinkSettings(value: unknown): value is ThinkSettings {
  return isRecord(value) && value.schemaVersion === THINK_SETTINGS_SCHEMA_VERSION;
}
