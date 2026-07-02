// src/platform/ObsidianFileStatPort.ts
// ---------------------------------------------------------------------------
// Platform adapter: FileStatPort (Obsidian TFile.stat)
// ---------------------------------------------------------------------------

import { singleton, inject } from 'tsyringe';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import { AppToken } from '@core/services/public';
import type { FileStat, FileStatPort } from '@core/ports/public';

@singleton()
export class ObsidianFileStatPort implements FileStatPort {
  constructor(@inject(AppToken) private app: App) {}

  async stat(path: string): Promise<FileStat | null> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!(af instanceof TFile)) return null;
    return {
      ctime: af.stat.ctime,
      mtime: af.stat.mtime,
      size: af.stat.size,
    };
  }
}
