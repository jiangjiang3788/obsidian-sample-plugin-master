import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { RecordEntity } from '@/core/records/RecordEntity';
import { toRecordViewItem } from '@/core/records/RecordEntity';
import { queryRecordItems } from '@/core/query/RecordQuery';
import { RecordIndex, type RecordIntegrityIssue, type RecordLocation } from '@/core/records/RecordIndex';

export class DataStoreIndex {
  private records: RecordEntity[] = [];
  private fileIndex: Map<string, RecordEntity[]> = new Map();
  private queryCache: Map<string, RecordViewItem[]> = new Map();
  private dataVersion = 0;
  private readonly recordIndex = new RecordIndex();

  dispose(): void { this.clear(); }

  clear(): void {
    this.records = [];
    this.fileIndex.clear();
    this.queryCache.clear();
    this.recordIndex.clear();
  }

  clearQueryCache(): void { this.queryCache.clear(); }

  hydrateFileItems(filePath: string, records: RecordEntity[], opts: { rebuild?: boolean } = {}): void {
    this.fileIndex.set(filePath, records);
    if (opts.rebuild !== false) this.rebuildIdentityIndex();
  }

  stageFileItems(filePath: string, records: RecordEntity[]): void {
    this.fileIndex.set(filePath, records);
  }

  rebuild(opts: { bumpVersion?: boolean } = {}): void {
    this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
  }

  replaceFileItems(filePath: string, records: RecordEntity[], opts: { bumpVersion?: boolean } = {}): void {
    this.fileIndex.set(filePath, records);
    this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
  }

  removeFileItems(filePath: string, opts: { bumpVersion?: boolean } = {}): boolean {
    const hadItems = this.fileIndex.delete(filePath);
    if (hadItems) this.rebuildIdentityIndex();
    if (opts.bumpVersion !== false) this.bumpVersion();
    return hadItems;
  }

  getById(recordId: string): RecordEntity | null { return this.recordIndex.getById(recordId); }
  getLocation(recordId: string): RecordLocation | null { return this.recordIndex.getLocation(recordId); }
  getLocations(recordId: string): RecordLocation[] { return this.recordIndex.getLocations(recordId); }
  getIntegrityIssues(): RecordIntegrityIssue[] { return this.recordIndex.getIssues(); }

  /** Canonical entity access for domain/repository code. No view projection is implied. */
  getRecordEntities(): RecordEntity[] {
    return [...this.records];
  }

  /**
   * All valid Record v2 entities projected for existing query/view consumers.
   * Internal task-series/task-session records are included.
   */
  queryRecords(filters: FilterRule[] = [], sortRules: SortRule[] = []): RecordViewItem[] {
    const key = `records:${this.makeQueryKey(filters, sortRules)}`;
    const cached = this.queryCache.get(key);
    if (cached) return cached;
    const projected = this.records.map(toRecordViewItem);
    const result = queryRecordItems(projected, { filterGroups: [filters], sort: sortRules });
    this.queryCache.set(key, result);
    return result;
  }

  /** User-visible records only. Internal Series/Session entities stay behind the application boundary. */
  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): RecordViewItem[] {
    const key = this.makeQueryKey(filters, sortRules);
    const cached = this.queryCache.get(key);
    if (cached) return cached;
    const userVisibleItems = this.records
      .filter(record => record.coreBlock !== 'task-series' && record.coreBlock !== 'task-session')
      .map(toRecordViewItem);
    const result = queryRecordItems(userVisibleItems, { filterGroups: [filters], sort: sortRules });
    this.queryCache.set(key, result);
    return result;
  }

  bumpVersion(): void { this.dataVersion++; this.queryCache.clear(); }

  private rebuildIdentityIndex(): void {
    this.records = this.recordIndex.rebuild(this.fileIndex);
    this.queryCache.clear();
  }

  private makeQueryKey(filters: FilterRule[] = [], sortRules: SortRule[] = []): string {
    return JSON.stringify({ f: filters, s: sortRules, v: this.dataVersion });
  }
}
