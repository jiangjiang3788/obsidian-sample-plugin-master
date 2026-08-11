import type { FilterRule, Item, SortRule } from '@/core/types/schema';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { RecordIndex, type RecordIntegrityIssue, type RecordLocation } from '@/core/records/RecordIndex';

export class DataStoreIndex {
  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private queryCache: Map<string, Item[]> = new Map();
  private dataVersion = 0;
  private readonly recordIndex = new RecordIndex();

  dispose(): void { this.clear(); }

  clear(): void {
    this.items = [];
    this.fileIndex.clear();
    this.queryCache.clear();
    this.recordIndex.clear();
  }

  clearQueryCache(): void { this.queryCache.clear(); }

  hydrateFileItems(filePath: string, items: Item[], opts: { rebuild?: boolean } = {}): void {
    this.fileIndex.set(filePath, items);
    if (opts.rebuild !== false) this.rebuildIdentityIndex();
  }

  stageFileItems(filePath: string, items: Item[]): void {
    this.fileIndex.set(filePath, items);
  }

  rebuild(opts: { bumpVersion?: boolean } = {}): void {
    this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
  }

  replaceFileItems(filePath: string, items: Item[], opts: { bumpVersion?: boolean } = {}): void {
    this.fileIndex.set(filePath, items);
    this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
  }

  removeFileItems(filePath: string, opts: { bumpVersion?: boolean } = {}): boolean {
    const hadItems = this.fileIndex.delete(filePath);
    if (hadItems) this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
    return hadItems;
  }

  getById(recordId: string): Item | null { return this.recordIndex.getById(recordId); }
  getLocation(recordId: string): RecordLocation | null { return this.recordIndex.getLocation(recordId); }
  getLocations(recordId: string): RecordLocation[] { return this.recordIndex.getLocations(recordId); }
  getIntegrityIssues(): RecordIntegrityIssue[] { return this.recordIndex.getIssues(); }

  /** All valid Record v2 entities, including internal task-series/task-session records. */
  queryRecords(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const key = `records:${this.makeQueryKey(filters, sortRules)}`;
    const cached = this.queryCache.get(key);
    if (cached) return cached;
    const filtered = filterByRules(this.items, filters);
    const result = sortItems(filtered, sortRules);
    this.queryCache.set(key, result);
    return result;
  }

  /** User-visible records only. Internal Series/Session entities stay behind the application boundary. */
  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const key = this.makeQueryKey(filters, sortRules);
    const cached = this.queryCache.get(key);
    if (cached) return cached;
    const userVisibleItems = this.items.filter(item => item.coreBlock !== 'task-series' && item.coreBlock !== 'task-session');
    const filtered = filterByRules(userVisibleItems, filters);
    const result = sortItems(filtered, sortRules);
    this.queryCache.set(key, result);
    return result;
  }

  bumpVersion(): void { this.dataVersion++; this.queryCache.clear(); }

  private rebuildIdentityIndex(): void {
    this.items = this.recordIndex.rebuild(this.fileIndex);
    this.queryCache.clear();
  }

  private makeQueryKey(filters: FilterRule[] = [], sortRules: SortRule[] = []): string {
    return JSON.stringify({ f: filters, s: sortRules, v: this.dataVersion });
  }
}
