// src/platform/ObsidianMetadataPort.ts
// ---------------------------------------------------------------------------
// Platform adapter: MetadataPort (Obsidian metadataCache)
// ---------------------------------------------------------------------------

import { singleton, inject } from 'tsyringe';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import { AppToken } from '@core/services/types';
import type { HeadingInfo, MetadataPort } from '@core/ports/MetadataPort';

@singleton()
export class ObsidianMetadataPort implements MetadataPort {
  constructor(@inject(AppToken) private app: App) {}

  async getHeadings(path: string): Promise<HeadingInfo[]> {
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!(af instanceof TFile)) return [];

    const cache = this.app.metadataCache.getFileCache(af);
    const headings = cache?.headings ?? [];

    return headings
      .map((h) => ({
        line: h.position.start.line,
        heading: h.heading,
      }))
      .sort((a, b) => a.line - b.line);
  }
}
