// src/core/services/StorageService.ts
import { singleton, inject } from 'tsyringe';
import type { InjectionToken } from 'tsyringe';
import { devWarn } from '@core/utils/devLogger';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';

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
 * 基于 Obsidian Vault 的文件存储（默认实现）
 * - 默认在 Vault 根目录下进行读写，推荐使用 "Think/" 作为子目录
 */
@singleton()
export class VaultFileStorage implements IPluginStorage {
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {}

  async readJSON<T = any>(path: string): Promise<T | null> {
    const text = await this.vault.readFile(path);
    if (text == null) return null;
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      devWarn(`ThinkPlugin: 读取 JSON 失败 (${path})`, e);
      return null;
    }
  }

  async writeJSON(path: string, data: any): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await this.vault.writeFile(path, json);
  }

  async remove(path: string): Promise<void> {
    await this.vault.deleteFile(path);
  }
}
