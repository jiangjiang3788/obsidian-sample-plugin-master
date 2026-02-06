// src/platform/ObsidianVaultPort.ts
// ---------------------------------------------------------------------------
// Phase2: platform adapter for VaultPort
// ---------------------------------------------------------------------------
// This is the ONLY layer that touches Obsidian's Vault API for core storage.
// Core code should depend on the `VaultPort` interface (in src/core/ports).

import { singleton, inject } from 'tsyringe';
import { App, TFile, TFolder } from 'obsidian';
import { AppToken, devError } from '@core/public';
import type { VaultPort } from '@core/public';

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

  async readFile(path: string): Promise<string | null> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!af) return null;
    if (af instanceof TFile) {
      return await this.app.vault.read(af);
    }
    // Folder or unsupported type
    return null;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureFolderFor(path);

    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.modify(af, content);
      return;
    }

    if (af instanceof TFolder) {
      throw new Error(`路径冲突："${path}" 是文件夹，无法写入文件。`);
    }

    await this.app.vault.create(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.vault.delete(af);
    }
  }

  // ------------------------------
  // Helpers
  // ------------------------------

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
          // 再次确认是否已存在。
          const recheck = this.app.vault.getAbstractFileByPath(cur);
          if (!recheck) {
            devError(`[ObsidianVaultPort] createFolder failed: ${cur}`, e);
            throw e;
          }
        }
      } else if (af instanceof TFile) {
        throw new Error(`路径冲突："${cur}" 是文件，无法作为文件夹。`);
      }
    }
  }
}
