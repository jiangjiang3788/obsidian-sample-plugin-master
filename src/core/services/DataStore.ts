import { singleton, inject } from 'tsyringe';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import { toRecordViewItem, type RecordEntity } from '@/core/records/RecordEntity';
import { throttle } from '@core/utils/timing';
import type { IThemeMatcher } from '@core/types/theme';
import { THEME_MATCHER_TOKEN } from '@core/types/theme';
import type { IPluginStorage } from '@core/services/StorageService';
import { STORAGE_TOKEN } from '@core/services/StorageService';
import { devWarn, devError } from '../utils/devLogger';
// NOTE: core 内部禁止依赖 @core/public（对外门面）。
// 否则会形成循环依赖：core/services -> core/public -> core/services...
import { VAULT_PORT_TOKEN, type VaultPort } from '@core/ports/VaultPort';
import { METADATA_PORT_TOKEN, type MetadataPort } from '@core/ports/MetadataPort';
import { FILESTAT_PORT_TOKEN, type FileStatPort } from '@core/ports/FileStatPort';
import { DataStoreCache } from '@core/services/dataStore/DataStoreCache';
import { DataStoreFileScanner } from '@core/services/dataStore/DataStoreFileScanner';
import { DataStoreIndex } from '@core/services/dataStore/DataStoreIndex';
import { buildWarmStartPlan } from '@core/services/dataStore/WarmStartPlanner';
import type { FilePathInput } from '@core/services/dataStore/pathUtils';
import type { RecordIntegrityIssue } from '@/core/records/RecordIndex';

@singleton()
export class DataStore {
  private readonly index = new DataStoreIndex();
  private readonly cacheStore: DataStoreCache;
  private readonly fileScanner: DataStoreFileScanner;
  private readonly scannerIssuesByFile = new Map<string, RecordIntegrityIssue[]>();
  private readonly runtimeIntegrityIssues: RecordIntegrityIssue[] = [];

  private changeListeners: Set<() => void> = new Set();
  private _perf = { start: 0, end: 0, scannedFiles: 0, scannedItems: 0 };
  private _disposed = false;

  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(METADATA_PORT_TOKEN) private metadata: MetadataPort,
    @inject(FILESTAT_PORT_TOKEN) private fileStat: FileStatPort,
    @inject(THEME_MATCHER_TOKEN) private themeMatcher: IThemeMatcher,
    @inject(STORAGE_TOKEN) private storage: IPluginStorage
  ) {
    this.cacheStore = new DataStoreCache(this.storage, () => this._assertNotDisposed());
    this.fileScanner = new DataStoreFileScanner(this.vault, this.metadata, this.fileStat, this.themeMatcher);
  }

  /**
   * Lifecycle: release timers/listeners to avoid writing after unload.
   */
  dispose(): void {
    this._disposed = true;
    this.cacheStore.dispose();
    this.index.dispose();
    this.scannerIssuesByFile.clear();
    this.runtimeIntegrityIssues.length = 0;
    this.changeListeners.clear();
  }

  private _assertNotDisposed(): boolean {
    return !this._disposed;
  }

  /* ---------------- 启动扫描 ---------------- */

  // 兼容保留（可能被其他位置直接调用）
  async scanAll() {
    if (!this._assertNotDisposed()) return;
    this.index.clear();
    this.scannerIssuesByFile.clear();
    this.runtimeIntegrityIssues.length = 0;
    const paths = this.vault.listMarkdownFilePaths();
    for (const path of paths) {
      if (!this._assertNotDisposed()) break;
      const scanned = await this.scanFile(path, { bumpVersion: false, deferIndexRebuild: true, deferCacheSave: true });
      this._perf.scannedFiles += 1;
      this._perf.scannedItems += scanned.length;
    }
    this.index.rebuild();
    this.cacheStore.scheduleSave();
  }

  // [主流程] 初始扫描（代理到暖启动）
  async initialScan() {
    if (!this._assertNotDisposed()) return;
    return this.warmStart();
  }

  /**
   * 手动恢复：清空缓存并重新扫描。
   *
   * 用途：
   * - 修复缓存文件写入异常导致的“items=0”
   * - 版本迁移时用户本地残留旧 cache
   *
   * 说明：不会触碰用户笔记内容，只重建 Think/cache.json。
   */
  async clearCacheAndRescan(mode: 'warm' | 'full' = 'warm'): Promise<void> {
    this.index.clear();
    this.cacheStore.clearMemory();

    try {
      await this.cacheStore.removePersisted();
    } catch (e) {
      devWarn('ThinkPlugin: 删除缓存文件失败（可忽略）', e);
    }

    if (mode === 'full') {
      await this.scanAll();
    } else {
      await this.warmStart();
    }

    this.notifyChange();
  }

  // [主流程] 暖启动：加载缓存 → 目录 stat → 仅扫描变更 → 合并内存 → 防抖保存
  async warmStart(): Promise<void> {
    if (!this._assertNotDisposed()) return;
    this._perf = { start: Date.now(), end: 0, scannedFiles: 0, scannedItems: 0 };

    const cache = await this.cacheStore.load();
    const paths = this.vault.listMarkdownFilePaths();
    const plan = await buildWarmStartPlan(paths, cache, this.fileStat);

    this.index.clear();
    this.scannerIssuesByFile.clear();
    this.runtimeIntegrityIssues.length = 0;

    for (const { path, cached } of plan.unchangedEntries) {
      this.index.stageFileItems(path, this.cacheStore.restoreItems(cached));
      this.scannerIssuesByFile.set(path, (cached.integrityIssues || []).map(issue => ({ ...issue, code: issue.code as RecordIntegrityIssue['code'] })));
    }

    for (const pth of plan.changedFiles) {
      const scanned = await this.scanFile(pth, { bumpVersion: false, deferIndexRebuild: true, deferCacheSave: true });
      this._perf.scannedFiles += 1;
      this._perf.scannedItems += scanned.length;
    }

    this.cacheStore.removeMissingFiles(plan.seen);
    this.index.rebuild();
    this._perf.end = Date.now();
    this.cacheStore.scheduleSave();
    this.notifyChange();
  }

  /* ---------------- 单文件扫描 ---------------- */

  /**
   * Phase2 迁移辅助：按路径扫描文件。
   * 目的：让 core 其它服务（如 ItemService）不需要依赖 Obsidian 的 TFile 类型。
   */
  async scanFileByPath(filePath: string, opts: { bumpVersion?: boolean; deferIndexRebuild?: boolean; deferCacheSave?: boolean; throwOnError?: boolean } = {}): Promise<RecordEntity[]> {
    if (!this._assertNotDisposed()) return [];
    return await this.scanFile(filePath, opts);
  }

  /**
   * 扫描单个文件。
   *
   * Phase2 之后 core 不能 import 'obsidian'，但外层（feature / platform）
   * 仍可能传入 TFile。
   *
   * 为了避免“升级后类型/运行时断裂”，这里接受两类入参：
   * - string: file path
   * - { path: string }: 结构化对象（兼容 TFile）
   */
  async scanFile(filePathOrFile: FilePathInput, opts: { bumpVersion?: boolean; deferIndexRebuild?: boolean; deferCacheSave?: boolean; throwOnError?: boolean } = {}): Promise<RecordEntity[]> {
    if (!this._assertNotDisposed()) return [];
    try {
      const scanned = await this.fileScanner.scan(filePathOrFile);
      if (!scanned) {
        const filePath = typeof filePathOrFile === 'string' ? filePathOrFile : filePathOrFile?.path || '';
        const error = new Error(`record_scan_unavailable:${filePath || '<unknown>'}`);
        const issue: RecordIntegrityIssue = {
          code: 'record_scan_failed',
          path: filePath || undefined,
          message: error.message,
        };
        if (filePath) this.scannerIssuesByFile.set(filePath, [issue]);
        if (opts.throwOnError) throw error;
        return [];
      }

      this.scannerIssuesByFile.set(scanned.filePath, scanned.integrityIssues);
      if (opts.deferIndexRebuild) this.index.stageFileItems(scanned.filePath, scanned.items);
      else this.index.replaceFileItems(scanned.filePath, scanned.items, { bumpVersion: opts.bumpVersion });
      this.cacheStore.upsertFile(scanned.filePath, scanned.stat, scanned.items, scanned.integrityIssues);
      if (!opts.deferCacheSave) this.cacheStore.scheduleSave();

      return scanned.items;
    } catch (err) {
      const filePath = typeof filePathOrFile === 'string' ? filePathOrFile : filePathOrFile?.path || '';
      const issue: RecordIntegrityIssue = {
        code: 'record_scan_failed',
        path: filePath || undefined,
        message: `Record scan failed for ${filePath || '<unknown>'}: ${err instanceof Error ? err.message : String(err)}`,
      };
      if (filePath) this.scannerIssuesByFile.set(filePath, [issue]);
      devError('ThinkPlugin: 扫描文件失败', filePath, err);
      if (opts.throwOnError) throw err;
      return [];
    }
  }

  removeFileItems(filePath: string) {
    this.scannerIssuesByFile.delete(filePath);
    this.index.removeFileItems(filePath);
    if (this.cacheStore.removeFile(filePath)) {
      this.cacheStore.scheduleSave();
    }
  }

  /* ---------------- 查询 ---------------- */

  queryRecords(filters: FilterRule[] = [], sortRules: SortRule[] = []): RecordViewItem[] { return this.index.queryRecords(filters, sortRules); }
  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): RecordViewItem[] { return this.index.queryItems(filters, sortRules); }

  /** Canonical entity lookup for repository/domain code; getRecordById is the consumer projection. */
  getRecordEntityById(recordId: string): RecordEntity | null { return this.index.getById(recordId); }
  getRecordById(recordId: string): RecordViewItem | null {
    const record = this.index.getById(recordId);
    return record ? toRecordViewItem(record) : null;
  }
  getRecordLocation(recordId: string) { return this.index.getLocation(recordId); }
  getRecordLocations(recordId: string) { return this.index.getLocations(recordId); }

  getRecordIntegrityIssues() {
    return [
      ...Array.from(this.scannerIssuesByFile.values()).flat(),
      ...this.index.getIntegrityIssues(),
      ...this.runtimeIntegrityIssues.map(issue => ({ ...issue })),
    ];
  }

  reportRecordIntegrityIssue(issue: RecordIntegrityIssue): void {
    this.runtimeIntegrityIssues.push({ ...issue });
  }

  clearRuntimeIntegrityIssues(): void { this.runtimeIntegrityIssues.length = 0; }

  /* ---------------- 变更通知 ---------------- */

  private _emitChange() {
    this.changeListeners.forEach(fn => {
      try { fn(); } catch (e) { devError('ThinkPlugin: 数据变化通知错误', e); }
    });
  }
  private _emitThrottled = throttle(() => this._emitChange(), 250);
  subscribe(listener: () => void) { if (this._assertNotDisposed()) this.changeListeners.add(listener); }
  unsubscribe(listener: () => void) { this.changeListeners.delete(listener); }
  notifyChange() { if (this._assertNotDisposed()) this._emitThrottled(); }
}
