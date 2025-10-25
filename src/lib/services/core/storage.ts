// src/core/services/storage.ts
import { singleton, inject } from 'tsyringe';
import type { InjectionToken } from 'tsyringe';
import { App, TFile, TFolder } from 'obsidian';
import { AppToken } from './types';

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
  constructor(@inject(AppToken) private app: App) {}

  async readJSON<T = any>(path: string): Promise<T | null> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!af) return null;
    if (af instanceof TFile) {
      const text = await this.app.vault.read(af);
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        console.warn(`ThinkPlugin: 读取 JSON 失败 (${path})`, e);
        return null;
      }
    }
    console.warn(`ThinkPlugin: 读取 JSON 失败，目标不是文件 (${path})`);
    return null;
  }

  async writeJSON(path: string, data: any): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await this.ensureFolderFor(path);
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.modify(af, json);
      return;
    }
    await this.app.vault.create(path, json);
  }

  async remove(path: string): Promise<void> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.delete(af);
    }
  }

  private async ensureFolderFor(filePath: string): Promise<void> {
    const folder = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';
    if (!folder) return;
    await this.ensureFolder(folder);
  }

  private async ensureFolder(path: string): Promise<void> {
    const segs = path.split('/').filter(Boolean);
    let cur = '';
    for (const seg of segs) {
      cur = cur ? `${cur}/${seg}` : seg;
      const af = this.app.vault.getAbstractFileByPath(cur);
      if (!af) {
        await this.app.vault.createFolder(cur);
      } else if (af instanceof TFile) {
        throw new Error(`路径冲突："${cur}" 是文件，无法作为文件夹。`);
      }
    }
  }
}
