// src/core/services/StorageService.ts
import { singleton, inject } from 'tsyringe';
import type { InjectionToken } from 'tsyringe';
import { DurableJsonStore } from '@/core/storage/DurableJsonStore';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';

/**
 * Canonical location for plugin-owned internal files.
 *
 * User records remain governed by record templates/output planning. Runtime and
 * infrastructure state belongs under Think/ so the Vault root stays clean.
 * Keeping these paths together gives storage layout one owner and one reason to
 * change when the plugin's internal folder policy changes.
 */
export const THINK_STORAGE_ROOT = 'Think';

const inThinkStorage = (name: string): string => `${THINK_STORAGE_ROOT}/${name}`;

export const THINK_STORAGE_PATHS = Object.freeze({
  settings: inThinkStorage('data.json'),
  timerRuntime: inThinkStorage('timer-state.json'),
  chatSessions: inThinkStorage('chat-sessions.json'),
  dataStoreCache: inThinkStorage('cache.json'),
  whiteboards: inThinkStorage('whiteboards.json'),
  legacyAssociations: inThinkStorage('association-spaces.json'),
  debugLog: inThinkStorage('debug.log'),
  backupsRoot: inThinkStorage('Backups'),
});

/** Paths created by older builds that current stores may migrate from. */
export const LEGACY_THINK_STORAGE_PATHS = Object.freeze({
  timerRuntime: 'think-plugin-timer-state.json',
  debugLog: '.think-plugin-debug.log',
});

/**
 * 统一的插件存储接口
 * - 以 Vault 路径为命名空间，读写 JSON
 */
export interface IPluginStorage {
  readJSON<T = any>(path: string): Promise<T | null>;
  writeJSON(path: string, data: any): Promise<void>;
  remove(path: string): Promise<void>;
}

export const STORAGE_TOKEN: InjectionToken<IPluginStorage> = 'PluginStorage';


/**
 * One-time migration for plugin-owned files that older builds placed in the
 * Vault root. Keep simple path migrations here so internal storage layout has
 * one owner. Schema-aware migrations (for example timer runtime state) stay
 * with the service that understands that schema.
 *
 * This function never creates debug.log by itself; it only moves an existing
 * legacy log. That keeps Vaults clean when file diagnostics are not in use.
 */
export async function migrateLegacyThinkStorage(vault: VaultPort): Promise<void> {
  const legacyDebug = await vault.readFile(LEGACY_THINK_STORAGE_PATHS.debugLog);
  if (legacyDebug == null) return;

  const currentDebug = await vault.readFile(THINK_STORAGE_PATHS.debugLog);
  const merged = currentDebug && legacyDebug
    ? `${currentDebug.replace(/\s+$/, '')}\n\n${legacyDebug.replace(/^\s+/, '')}`
    : (currentDebug ?? legacyDebug);

  await vault.writeFile(THINK_STORAGE_PATHS.debugLog, merged);
  await vault.deleteFile(LEGACY_THINK_STORAGE_PATHS.debugLog);
}

/**
 * 基于 Obsidian Vault 的文件存储（默认实现）
 * - 插件内部文件统一位于 Think/；具体路径由 THINK_STORAGE_PATHS 管理
 */
@singleton()
export class VaultFileStorage implements IPluginStorage {
  private readonly json: DurableJsonStore;

  constructor(@inject(VAULT_PORT_TOKEN) vault: VaultPort) {
    this.json = new DurableJsonStore(vault, new Set([
      THINK_STORAGE_PATHS.settings,
      THINK_STORAGE_PATHS.chatSessions,
      THINK_STORAGE_PATHS.whiteboards,
      THINK_STORAGE_PATHS.legacyAssociations,
    ]));
  }

  readJSON<T = any>(path: string): Promise<T | null> { return this.json.readJSON<T>(path); }
  writeJSON(path: string, data: any): Promise<void> { return this.json.writeJSON(path, data); }
  remove(path: string): Promise<void> { return this.json.remove(path); }
}
