import type { Item } from '@/core/types/schema';
import type { IPluginStorage } from '@core/services/StorageService';
import type { FileStat } from '@core/ports/FileStatPort';
import type { RecordIntegrityIssue } from '@/core/records/RecordIndex';
import { devWarn } from '@core/utils/devLogger';
import {
  type CacheV1,
  CURRENT_CACHE_SCHEMA_VERSION,
  fromCachedItem,
  toCachedItem,
} from '@/core/types/cache';

export const DATASTORE_CACHE_PATH = 'Think/cache.json';
export type CachedFileEntry = CacheV1['files'][string];

export class DataStoreCache {
  private cache: CacheV1 | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private storage: IPluginStorage,
    private isActive: () => boolean
  ) {}

  dispose(): void {
    this.clearSaveTimer();
    this.cache = null;
  }

  get current(): CacheV1 | null {
    return this.cache;
  }

  clearMemory(): void {
    this.clearSaveTimer();
    this.cache = null;
  }

  async removePersisted(): Promise<void> {
    await this.storage.remove(DATASTORE_CACHE_PATH);
  }

  async load(): Promise<CacheV1> {
    let cache = await this.storage.readJSON<CacheV1>(DATASTORE_CACHE_PATH);
    if (!cache || cache.schemaVersion !== CURRENT_CACHE_SCHEMA_VERSION) {
      cache = this.createEmptyCache();
    }
    this.cache = cache;
    return cache;
  }

  ensure(): CacheV1 {
    if (!this.cache) {
      this.cache = this.createEmptyCache();
    }
    return this.cache;
  }

  restoreItems(entry: CachedFileEntry): Item[] {
    return entry.items.map(fromCachedItem);
  }

  upsertFile(filePath: string, stat: FileStat, items: Item[], integrityIssues: RecordIntegrityIssue[] = []): void {
    const cache = this.ensure();
    cache.files[filePath] = {
      mtime: stat.mtime,
      size: stat.size,
      items: items.map(toCachedItem),
      integrityIssues: integrityIssues.map(issue => ({ ...issue })),
    };
  }

  removeFile(filePath: string): boolean {
    if (!this.cache || !this.cache.files[filePath]) return false;
    delete this.cache.files[filePath];
    return true;
  }

  removeMissingFiles(seen: Set<string>): number {
    if (!this.cache) return 0;
    let removed = 0;
    for (const cachedPath of Object.keys(this.cache.files)) {
      if (!seen.has(cachedPath)) {
        delete this.cache.files[cachedPath];
        removed++;
      }
    }
    return removed;
  }

  scheduleSave(delay = 1500): void {
    if (!this.isActive()) return;
    this.clearSaveTimer();
    this.saveTimer = setTimeout(async () => {
      if (!this.isActive()) return;
      try {
        if (this.cache) {
          await this.storage.writeJSON(DATASTORE_CACHE_PATH, this.cache);
        }
      } catch (e) {
        devWarn('ThinkPlugin: 写入缓存失败', e);
      }
    }, delay);
  }

  private clearSaveTimer(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = null;
  }

  private createEmptyCache(): CacheV1 {
    return { schemaVersion: CURRENT_CACHE_SCHEMA_VERSION, files: {} };
  }
}
