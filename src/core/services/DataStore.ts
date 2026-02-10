import { singleton, inject } from 'tsyringe';
import type { Item, FilterRule, SortRule } from '@/core/types/schema';
import { parseTaskLine, parseBlockContent } from '@core/utils/parser';
import { throttle } from '@core/utils/timing';
import { normalizeItemDates } from '@core/utils/normalize';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { parseRecurrence } from '@core/utils/mark';
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
import {
    CacheV1,
    CURRENT_CACHE_SCHEMA_VERSION,
    toCachedItem,
    fromCachedItem,
} from '@/core/types/cache';

@singleton()
export class DataStore {
  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(METADATA_PORT_TOKEN) private metadata: MetadataPort,
    @inject(FILESTAT_PORT_TOKEN) private fileStat: FileStatPort,
    @inject(THEME_MATCHER_TOKEN) private themeMatcher: IThemeMatcher,
    @inject(STORAGE_TOKEN) private storage: IPluginStorage
  ) {}

  private _pathBasename(path: string) {
    return path.split('/').pop() || path;
  }

  private _pathParentName(path: string) {
    const parts = path.split('/');
    if (parts.length <= 1) return '';
    return parts[parts.length - 2] || '';
  }

  private _basenameNoExt(filename: string) {
    return filename.toLowerCase().endsWith('.md') ? filename.slice(0, -3) : filename;
  }

// 内存数据
  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private changeListeners: Set<() => void> = new Set();
  private queryCache: Map<string, Item[]> = new Map();

  // 缓存/性能
  private cache: CacheV1 | null = null;
  private dataVersion = 0;
  private _cacheSaveTimer: any = null;
  private _perf = { start: 0, end: 0, scannedFiles: 0, scannedItems: 0 };

  private _disposed = false;

  /**
   * Lifecycle: release timers/listeners to avoid writing after unload.
   */
  dispose(): void {
    this._disposed = true;
    try { clearTimeout(this._cacheSaveTimer); } catch {}
    this._cacheSaveTimer = null;
    this.changeListeners.clear();
    this.queryCache.clear();
  }

  private _assertNotDisposed(): boolean {
    return !this._disposed;
  }

  /* ---------------- 启动扫描 ---------------- */

  // 兼容保留（可能被其他位置直接调用）
  async scanAll() {
    if (!this._assertNotDisposed()) return;
    this.items = [];
    this.fileIndex.clear();
    const paths = this.vault.listMarkdownFilePaths();
    for (const path of paths) {
      if (!this._assertNotDisposed()) break;
      const scanned = await this.scanFile(path);
      this._perf.scannedFiles += 1;
      this._perf.scannedItems += scanned.length;
    }
    this.bumpVersion();
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
    // 1) 清空内存
    this.items = [];
    this.fileIndex.clear();
    this.queryCache.clear();
    this.cache = null;

    // 2) 删除缓存文件（忽略不存在的情况）
    try {
      await this.storage.remove('Think/cache.json');
    } catch (e) {
      devWarn('ThinkPlugin: 删除缓存文件失败（可忽略）', e);
    }

    // 3) 重新扫描
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

    // 1) 加载缓存（版本不符视为空）
    let cache = await this.storage.readJSON<CacheV1>('Think/cache.json');
    if (!cache || cache.schemaVersion !== CURRENT_CACHE_SCHEMA_VERSION) {
      cache = { schemaVersion: CURRENT_CACHE_SCHEMA_VERSION, files: {} };
    }
    this.cache = cache;

    // 2) 列出所有 Markdown 文件
    const paths = this.vault.listMarkdownFilePaths();

    // 3) 对比缓存
    const seen = new Set<string>();
    const unchangedEntries: Array<{ path: string; cached: { mtime: number; size: number; items: any[] } }> = [];
    const changedFiles: string[] = [];

    for (const path of paths) {
      seen.add(path);
      const st = await this.fileStat.stat(path);
      if (!st) {
        // 文件不存在或非 markdown file（极少）
        continue;
      }
      const cached = cache.files[path];
      if (cached && cached.mtime === st.mtime && cached.size === st.size) {
        unchangedEntries.push({ path, cached });
      } else {
        changedFiles.push(path);
      }
    }

    // 4) 用缓存复原内存
    this.items = [];
    this.fileIndex.clear();

    for (const { path, cached } of unchangedEntries) {
      const restored = cached.items.map(fromCachedItem);
      this.fileIndex.set(path, restored);
      this.items.push(...restored);
    }

    // 5) 仅扫描变更文件
    for (const pth of changedFiles) {
      const scanned = await this.scanFile(pth, { bumpVersion: false });
      this._perf.scannedFiles += 1;
      this._perf.scannedItems += scanned.length;
      // 扫描完成时 scanFile 会同步更新 cache.files[path]
    }

    // 6) 移除已删除文件
    for (const cachedPath of Object.keys(cache.files)) {
      if (!seen.has(cachedPath)) {
        delete cache.files[cachedPath];
      }
    }

    // 7) 合并、保存与通知
    this.bumpVersion();
    this._perf.end = Date.now();
    this._scheduleCacheSave();
    this.notifyChange();
  }

  /* ---------------- 单文件扫描 ---------------- */

  /**
   * Phase2 迁移辅助：按路径扫描文件。
   * 目的：让 core 其它服务（如 ItemService）不需要依赖 Obsidian 的 TFile 类型。
   */
  async scanFileByPath(filePath: string, opts: { bumpVersion?: boolean } = {}): Promise<Item[]> {
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
  async scanFile(filePathOrFile: string | { path: string }, opts: { bumpVersion?: boolean } = {}): Promise<Item[]> {
    if (!this._assertNotDisposed()) return [];
    try {
      const filePath = typeof filePathOrFile === 'string'
        ? filePathOrFile
        : (filePathOrFile && typeof filePathOrFile.path === 'string' ? filePathOrFile.path : '');

      if (!filePath) {
        devWarn('ThinkPlugin: scanFile 入参非法（缺少 path）', filePathOrFile);
        return [];
      }

      const content = await this.vault.readFile(filePath);
      if (content == null) {
        devWarn('ThinkPlugin: scanFile 文件不存在或不可读', filePath);
        return [];
      }
      const lines = content.split(/\r?\n/);
      const parentFolder = this._pathParentName(filePath);
      const fileItems: Item[] = [];

      const headingsList = await this.metadata.getHeadings(filePath);
      const stat = await this.fileStat.stat(filePath);
      if (!stat) {
        devWarn('ThinkPlugin: scanFile 获取 stat 失败', filePath);
        return [];
      }
      let nextHeadingIndex = 0;
      let currentSectionTags: string[] = [];
      let currentHeader = '';
      const fileName = this._basenameNoExt(this._pathBasename(filePath));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 命中标题：记录当前节的 header/tags
        if (nextHeadingIndex < headingsList.length && headingsList[nextHeadingIndex].line === i) {
          const headingEntry = headingsList[nextHeadingIndex];
          const headingText = headingEntry.heading;
          const headingTags = headingText.match(/#([\p{L}\p{N}_\/-]+)/gu) || [];
          currentSectionTags = headingTags.map(t => t.replace('#', '')).filter(Boolean);
          let cleanText = headingText;
          for (const tag of headingTags) cleanText = cleanText.replace(tag, '').trim();
          currentHeader = cleanText || '';
          nextHeadingIndex++;
          continue;
        }

        // 解析 block 区域
        if (line.trim() === '<!-- start -->') {
          const endIdx = lines.indexOf('<!-- end -->', i + 1);
          if (endIdx !== -1) {
            const blockItem = parseBlockContent(filePath, lines, i, endIdx, parentFolder);
            if (blockItem) {
              blockItem.created = stat.ctime;
              blockItem.modified = stat.mtime;
              if (currentHeader) blockItem.header = currentHeader;
              blockItem.tags = Array.from(new Set([...currentSectionTags, ...blockItem.tags]));
              blockItem.filename = fileName;
              blockItem.fileName = fileName;
              normalizeItemDates(blockItem);
              const hashIdx = blockItem.id.lastIndexOf('#');
              const lineNo = hashIdx >= 0 ? Number(blockItem.id.slice(hashIdx + 1)) : undefined;
              (blockItem as any).file = { path: filePath, line: lineNo, basename: fileName };
              if (currentHeader) {
                const matchedTheme = this.themeMatcher.findThemeByPartialMatch(currentHeader);
                (blockItem as any).theme = matchedTheme || currentHeader;
              }
              (blockItem as any).titleLower = (blockItem.title || '').toLowerCase();
              (blockItem as any).contentLower = (blockItem.content || '').toLowerCase();
              (blockItem as any).tagsLower = (blockItem.tags || []).map(t => t.toLowerCase());
              (blockItem as any).themePathNormalized = (blockItem as any).theme || undefined;
              fileItems.push(blockItem);
            }
            i = endIdx;
            continue;
          }
        }

        // 解析 task 行
        const taskItem = parseTaskLine(filePath, line, i + 1, parentFolder);
        if (taskItem) {
          taskItem.tags = Array.from(new Set([...currentSectionTags, ...taskItem.tags]));
          taskItem.created = stat.ctime;
          taskItem.modified = stat.mtime;
          if (currentHeader) {
            taskItem.header = currentHeader;
            // 使用智能匹配获取完整主题路径
            const matchedTheme = this.themeMatcher.findThemeByPartialMatch(currentHeader);
            taskItem.theme = matchedTheme || currentHeader;
          }
          taskItem.filename = fileName;
          taskItem.fileName = fileName;
          normalizeItemDates(taskItem);
          (taskItem as any).file = { path: filePath, line: i + 1, basename: fileName };
          (taskItem as any).recurrenceInfo = parseRecurrence(taskItem.content) || undefined;
          (taskItem as any).titleLower = (taskItem.title || '').toLowerCase();
          (taskItem as any).contentLower = (taskItem.content || '').toLowerCase();
          (taskItem as any).tagsLower = (taskItem.tags || []).map(t => t.toLowerCase());
          (taskItem as any).themePathNormalized = taskItem.theme || undefined;
          fileItems.push(taskItem);
        }
      }

      // 覆盖旧索引并合并内存
      if (this.fileIndex.has(filePath)) {
        this.items = this.items.filter(it => it.id && !it.id.startsWith(filePath + '#'));
      }
      this.fileIndex.set(filePath, fileItems);
      this.items.push(...fileItems);

      // 更新缓存分片（若缓存尚未初始化则初始化一个空壳）
      if (!this.cache) {
        this.cache = { schemaVersion: CURRENT_CACHE_SCHEMA_VERSION, files: {} };
      }
      this.cache.files[filePath] = {
        mtime: stat.mtime,
        size: stat.size,
        items: fileItems.map(toCachedItem)
      };
      this._scheduleCacheSave();

      if (opts.bumpVersion !== false) {
        this.bumpVersion();
      }

      return fileItems;
    } catch (err) {
      devError('ThinkPlugin: 扫描文件失败', filePath, err);
      return [];
    }
  }

  removeFileItems(filePath: string) {
    if (this.fileIndex.has(filePath)) {
      this.fileIndex.delete(filePath);
      this.items = this.items.filter(it => it.id && !it.id.startsWith(filePath + '#'));
    }
    if (this.cache && this.cache.files[filePath]) {
      delete this.cache.files[filePath];
      this._scheduleCacheSave();
    }
    this.bumpVersion();
  }

  /* ---------------- 查询 ---------------- */

  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const key = this._makeQueryKey(filters, sortRules);
    const cached = this.queryCache.get(key);
    if (cached) return cached;

    const filtered = filterByRules(this.items, filters);
    const result = sortItems(filtered, sortRules);
    this.queryCache.set(key, result);
    return result;
  }

  private _makeQueryKey(filters: FilterRule[] = [], sortRules: SortRule[] = []): string {
    return JSON.stringify({ f: filters, s: sortRules, v: this.dataVersion });
  }
  private bumpVersion() {
    this.dataVersion++;
    this.queryCache.clear();
  }

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

  /* ---------------- 辅助：缓存保存与性能报告 ---------------- */

  private _scheduleCacheSave(delay = 1500) {
    if (!this._assertNotDisposed()) return;
    clearTimeout(this._cacheSaveTimer);
    this._cacheSaveTimer = setTimeout(async () => {
      if (!this._assertNotDisposed()) return;
      try {
        if (this.cache) {
          await this.storage.writeJSON('Think/cache.json', this.cache);
        }
      } catch (e) {
        devWarn('ThinkPlugin: 写入缓存失败', e);
      }
    }, delay);
  }

  /**
   * 将本次扫描埋点写入 Vault/Think/performance-report.json（数组追加）
   */
  async writePerformanceReport(stage: string, extra: Record<string, any> = {}): Promise<void> {
    if (!this._assertNotDisposed()) return;
    try {
      const path = 'Think/performance-report.json';
      const history = (await this.storage.readJSON<any[]>(path)) || [];
      const record = {
        ts: Date.now(),
        stage,
        scannedFiles: this._perf.scannedFiles,
        scannedItems: this._perf.scannedItems,
        durationMs: Math.max(0, this._perf.end - this._perf.start),
        ...extra
      };
      history.push(record);
      if (!this._assertNotDisposed()) return;
      await this.storage.writeJSON(path, history);
    } catch (e) {
      devWarn('ThinkPlugin: 写入性能报告失败', e);
    }
  }
}