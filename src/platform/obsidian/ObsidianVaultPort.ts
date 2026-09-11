// src/platform/ObsidianVaultPort.ts
// ---------------------------------------------------------------------------
// Phase2: platform adapter for VaultPort
// ---------------------------------------------------------------------------
// This is the ONLY layer that touches Obsidian's Vault API for core storage.
// Core code should depend on the `VaultPort` interface (in src/core/ports).

import { singleton, inject } from 'tsyringe';
import { App, TFile, TFolder } from 'obsidian';
import { AppToken } from '@core/services/public';
import { devError, devWarn } from '@core/utils/public';
import { isDisposed } from '@/app/runtime/lifecycleState';
import type { VaultPort } from '@core/ports/public';

/**
 * ObsidianVaultPort
 *
 * - Path-based API (string)
 * - Handles folder creation & path conflicts
 * - Keeps `TFile/TFolder` out of core
 */
@singleton()
export class ObsidianVaultPort implements VaultPort {
  constructor(@inject(AppToken) private app: App) {}

  listMarkdownFilePaths(): string[] {
    return this.app.vault.getMarkdownFiles().map((f) => f.path);
  }

  async readFile(path: string): Promise<string | null> {
    this.assertActive('readFile', path);
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      return await this.app.vault.read(af);
    }
    if (af instanceof TFolder) {
      return null;
    }

    // During Obsidian startup the Vault file tree can lag behind the underlying adapter.
    // A cache miss must not be treated as "file does not exist" until the adapter agrees,
    // otherwise stores may initialize empty and later overwrite durable user data.
    const existsOnDisk = await this.app.vault.adapter.exists(path);
    if (!existsOnDisk) return null;
    return await this.app.vault.adapter.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.assertActive('writeFile', path);
    await this.ensureFolderFor(path);

    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.modify(af, content);
      return;
    }

    if (af instanceof TFolder) {
      throw new Error(`路径冲突："${path}" 是文件夹，无法写入文件。`);
    }

    // File may exist on disk before Obsidian's abstract-file cache sees it.
    // In that case update through the adapter instead of trying to create a duplicate path.
    if (await this.app.vault.adapter.exists(path)) {
      await this.app.vault.adapter.write(path, content);
      return;
    }

    try {
      await this.app.vault.create(path, content);
    } catch (e) {
      // 竞争条件：并发创建同一路径时，Obsidian 可能抛错。
      // 再次确认是否已存在，如果已存在则改为覆盖写入。
      const recheck = this.app.vault.getAbstractFileByPath(path);
      if (recheck instanceof TFile) {
        await this.app.vault.modify(recheck, content);
        return;
      }
      if (recheck instanceof TFolder) {
        throw new Error(`路径冲突："${path}" 是文件夹，无法写入文件。`);
      }
      devError(`[ObsidianVaultPort] create file failed: ${path}`, e);
      throw e;
    }
  }

  async deleteFile(path: string): Promise<void> {
    this.assertActive('deleteFile', path);
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.delete(af);
    }
  }

  // ------------------------------
  // Helpers
  // ------------------------------

  private assertActive(operation: string, path: string): void {
    if (!isDisposed()) return;
    const message = `[ObsidianVaultPort] ${operation} blocked after dispose: ${path}`;
    devWarn(message);
    throw new Error(message);
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
        try {
          await this.app.vault.createFolder(cur);
        } catch (e) {
          // 竞争条件：并发创建同一路径时，Obsidian 可能抛错。
          // Obsidian 有时会在 getAbstractFileByPath 尚未刷新时抛 Folder already exists，
          // 这种情况应视为创建成功，而不是污染调试日志或中断性能报告写入。
          const recheck = this.app.vault.getAbstractFileByPath(cur);
          const message = e instanceof Error ? e.message : String(e);
          if (recheck instanceof TFolder || message.includes('Folder already exists')) {
            continue;
          }
          if (recheck instanceof TFile) {
            throw new Error(`路径冲突："${cur}" 是文件，无法作为文件夹。`);
          }
          devError(`[ObsidianVaultPort] createFolder failed: ${cur}`, e);
          throw e;
        }
      } else if (af instanceof TFile) {
        throw new Error(`路径冲突："${cur}" 是文件，无法作为文件夹。`);
      }
    }
  }
}
