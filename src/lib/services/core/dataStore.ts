// src/core/services/dataStore.ts
import { singleton, inject } from 'tsyringe';
import type { HeadingCache, TFile, App } from 'obsidian';
import type { Item, FilterRule, SortRule } from '@/lib/types/domain/schema';
import { parseTaskLine, parseBlockContent } from '@/lib/utils/core/parser';
import { throttle } from '@/lib/utils/core/timing';
import { ObsidianPlatform } from '@platform/obsidian';
import { normalizeItemDates } from '@/lib/utils/core/normalize';
import { filterByRules, sortItems } from '@/lib/utils/core/itemFilter';
import { parseRecurrence } from '@/lib/utils/core/mark';
// [新增] 注入令牌与服务
import { AppToken } from './types';
import { ThemeManager } from './ThemeManager';
import type { IPluginStorage } from './storage';
import { STORAGE_TOKEN } from './storage';
import {
  CacheV1,
  CURRENT_CACHE_SCHEMA_VERSION,
  toCachedItem,
  fromCachedItem
} from '@/lib/types/domain/cache';

@singleton()
export class DataStore {
  constructor(
    @inject(ObsidianPlatform) private platform: ObsidianPlatform,
    @inject(AppToken) private app: App,
    @inject(ThemeManager) private themeManager: ThemeManager,
    @inject(STORAGE_TOKEN) private storage: IPluginStorage
  ) {}

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

  /* ---------------- 启动扫描 ---------------- */

  // 兼容保留（可能被其他位置直接调用）
  async scanAll() {
    this.items = [];
    this.fileIndex.clear();
    const files = this.platform.getMarkdownFiles();
    for (const file of files) {
      const scanned = await this.scanFile(file);
      this._perf.scannedFiles += 1;
      this._perf.scannedItems += scanned.length;
    }
    this.bumpVersion();
  }

  // 初始扫描改为暖启动
  async initialScan() {
    return this.warmStart();
  }

  // 暖启动：加载缓存 → 目录 stat → 仅扫描变更 → 合并内存 → 防抖保存
  async warmStart(): Promise<void> {
    this._perf = { start: Date.now(), end: 0, scannedFiles: 0, scannedItems: 0 };

    // 1) 加载缓存（版本不符视为空）
    let cache = await this.storage.readJSON<CacheV1>('Think/cache.json');
    if (!cache || cache.schemaVersion !== CURRENT_CACHE_SCHEMA_VERSION) {
      cache = { schemaVersion: CURRENT_CACHE_SCHEMA_VERSION, files: {} };
    }
    this.cache = cache;

    // 2) 列出所有 Markdown 文件
    const files = this.platform.getMarkdownFiles();

    // 3) 对比缓存
    const seen = new Set<string>();
    const unchangedEntries: Array<{ path: string; cached: { mtime: number; size: number; items: any[] } }> = [];
    const changedFiles: TFile[] = [];

    for (const file of files) {
      const path = file.path;
      seen.add(path);
      const st = file.stat;
      const cached = cache.files[path];
      if (cached && cached.mtime === st.mtime && cached.size === st.size) {
        unchangedEntries.push({ path, cached });
      } else {
        changedFiles.push(file);
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
    for (const f of changedFiles) {
      const scanned = await this.scanFile(f, { bumpVersion: false });
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

  async scanFile(file: TFile, opts: { bumpVersion?: boolean } = {}): Promise<Item[]> {
    try {
      const content = await this.platform.readFile(file);
      const lines = content.split(/\r?\n/);
      const filePath = file.path;
      const parentFolder = file.parent?.name || '';
      const fileItems: Item[] = [];

      const cache = this.app.metadataCache.getFileCache(file);
      const headingsList: HeadingCache[] = cache?.headings || [];
      let nextHeadingIndex = 0;
      let currentSectionTags: string[] = [];
      let currentHeader = '';
      const fileName = file.name.toLowerCase().endsWith('.md') ? file.name.slice(0, -3) : file.name;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 命中标题：记录当前节的 header/tags
        if (nextHeadingIndex < headingsList.length && headingsList[nextHeadingIndex].position.start.line === i) {
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
              blockItem.created = file.stat.ctime;
              blockItem.modified = file.stat.mtime;
              if (currentHeader) blockItem.header = currentHeader;
              blockItem.tags = Array.from(new Set([...currentSectionTags, ...blockItem.tags]));
              blockItem.filename = fileName;
              blockItem.fileName = fileName;
              normalizeItemDates(blockItem);
              const hashIdx = blockItem.id.lastIndexOf('#');
              const lineNo = hashIdx >= 0 ? Number(blockItem.id.slice(hashIdx + 1)) : undefined;
              (blockItem as any).file = { path: filePath, line: lineNo, basename: fileName };
              if (currentHeader) {
                const matchedTheme = this.themeManager.findThemeByPartialMatch(currentHeader);
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
          taskItem.created = file.stat.ctime;
          taskItem.modified = file.stat.mtime;
          if (currentHeader) {
            taskItem.header = currentHeader;
            // 使用智能匹配获取完整主题路径
            const matchedTheme = this.themeManager.findThemeByPartialMatch(currentHeader);
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
        mtime: file.stat.mtime,
        size: file.stat.size,
        items: fileItems.map(toCachedItem)
      };
      this._scheduleCacheSave();

      if (opts.bumpVersion !== false) {
        this.bumpVersion();
      }

      return fileItems;
    } catch (err) {
      console.error('ThinkPlugin: 扫描文件失败', file.path, err);
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
      try { fn(); } catch (e) { console.error('ThinkPlugin: 数据变化通知错误', e); }
    });
  }
  private _emitThrottled = throttle(() => this._emitChange(), 250);
  subscribe(listener: () => void) { this.changeListeners.add(listener); }
  unsubscribe(listener: () => void) { this.changeListeners.delete(listener); }
  notifyChange() { this._emitThrottled(); }

  /* ---------------- 辅助：缓存保存与性能报告 ---------------- */

  private _scheduleCacheSave(delay = 1500) {
    clearTimeout(this._cacheSaveTimer);
    this._cacheSaveTimer = setTimeout(async () => {
      try {
        if (this.cache) {
          await this.storage.writeJSON('Think/cache.json', this.cache);
        }
      } catch (e) {
        console.warn('ThinkPlugin: 写入缓存失败', e);
      }
    }, delay);
  }

  /**
   * 将本次扫描埋点写入 Vault/Think/performance-report.json（数组追加）
   */
  async writePerformanceReport(stage: string, extra: Record<string, any> = {}): Promise<void> {
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
      await this.storage.writeJSON(path, history);
    } catch (e) {
      console.warn('ThinkPlugin: 写入性能报告失败', e);
    }
  }
}
