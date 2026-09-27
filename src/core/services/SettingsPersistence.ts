import { inject, singleton } from 'tsyringe';

import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { devWarn } from '@/core/utils/devLogger';

import {
  STORAGE_TOKEN,
  THINK_STORAGE_PATHS,
  type IPluginStorage,
} from './StorageService';

/**
 * Settings persistence contract.
 *
 * The repository owns settings semantics; this boundary only owns durable IO.
 * It intentionally does not expose Obsidian Plugin.loadData/saveData concepts.
 */
export interface ISettingsPersistence {
  load(): Promise<unknown>;
  save(settings: ThinkSettings): Promise<void>;
}

export const SETTINGS_PERSISTENCE_TOKEN = 'SettingsPersistence';

/**
 * Build the durable settings payload without mutating the runtime snapshot.
 * API keys are only persisted when the user explicitly opts in.
 */
export function toSafePersistedThinkSettings(settings: ThinkSettings): Record<string, unknown> {
  const persisted = toPersistedThinkSettings(settings) as Record<string, any>;
  const aiSettings = persisted.aiSettings;

  if (aiSettings && typeof aiSettings === 'object' && aiSettings.persistApiKey !== true) {
    if (aiSettings.apiKey) {
      devWarn('[SettingsPersistence] persistApiKey 未显式开启，apiKey 将被剥离后保存');
    }
    aiSettings.apiKey = '';
  }

  return persisted;
}

/**
 * Vault-backed settings persistence.
 *
 * All settings now live with the rest of plugin-owned state under Think/.
 * Changing the physical location only requires updating THINK_STORAGE_PATHS.
 */
@singleton()
export class VaultSettingsPersistence implements ISettingsPersistence {
  constructor(@inject(STORAGE_TOKEN) private readonly storage: IPluginStorage) {}

  async load(): Promise<unknown> {
    return await this.storage.readJSON(THINK_STORAGE_PATHS.settings);
  }

  async save(settings: ThinkSettings): Promise<void> {
    await this.storage.writeJSON(
      THINK_STORAGE_PATHS.settings,
      toSafePersistedThinkSettings(settings),
    );
  }
}
