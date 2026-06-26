import type { FilterRule, Item, SortRule } from '@/core/types/schema';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { itemBelongsToFileId } from './pathUtils';

export class DataStoreIndex {
  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private queryCache: Map<string, Item[]> = new Map();
  private dataVersion = 0;

  dispose(): void {
    this.queryCache.clear();
    this.fileIndex.clear();
    this.items = [];
  }

  clear(): void {
    this.items = [];
    this.fileIndex.clear();
    this.queryCache.clear();
  }

  clearQueryCache(): void {
    this.queryCache.clear();
  }

  hydrateFileItems(filePath: string, items: Item[]): void {
    this.fileIndex.set(filePath, items);
    this.items.push(...items);
  }

  replaceFileItems(filePath: string, items: Item[], opts: { bumpVersion?: boolean } = {}): void {
    if (this.fileIndex.has(filePath)) {
      this.items = this.items.filter((it) => !itemBelongsToFileId(it.id, filePath));
    }
    this.fileIndex.set(filePath, items);
    this.items.push(...items);

    if (opts.bumpVersion !== false) {
      this.bumpVersion();
    }
  }

  removeFileItems(filePath: string, opts: { bumpVersion?: boolean } = {}): boolean {
    const hadItems = this.fileIndex.delete(filePath);
    if (hadItems) {
      this.items = this.items.filter((it) => !itemBelongsToFileId(it.id, filePath));
    }

    if (opts.bumpVersion !== false) {
      this.bumpVersion();
    }

    return hadItems;
  }

  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const key = this.makeQueryKey(filters, sortRules);
    const cached = this.queryCache.get(key);
    if (cached) return cached;

    const filtered = filterByRules(this.items, filters);
    const result = sortItems(filtered, sortRules);
    this.queryCache.set(key, result);
    return result;
  }

  bumpVersion(): void {
    this.dataVersion++;
    this.queryCache.clear();
  }

  private makeQueryKey(filters: FilterRule[] = [], sortRules: SortRule[] = []): string {
    return JSON.stringify({ f: filters, s: sortRules, v: this.dataVersion });
  }
}
