// src/core/services/dataStore.ts
// 与 Vault 交互的核心数据层（已移除 status/category 依赖，用 categoryKey）
import { HeadingCache, TFile, TFolder } from 'obsidian';
import { Item, FilterRule, SortRule } from '@core/domain/schema';
import { parseTaskLine, parseBlockContent } from '@core/utils/parser';
import { throttle } from '@core/utils/timing';
import { TaskService } from '@core/services/taskService';
import { ObsidianPlatform } from '@platform/obsidian';
import { normalizeItemDates } from '@core/utils/normalize';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { todayISO } from '@core/utils/date';
import { parseRecurrence } from '@core/utils/mark';

export class DataStore {
  static instance: DataStore;
  private platform: ObsidianPlatform;
  get app() { return this.platform.app; }

  constructor(platform: ObsidianPlatform) {
    this.platform = platform;
    DataStore.instance = this;
  }

  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private changeListeners: Set<() => void> = new Set();

  async scanAll() {
    this.items = [];
    this.fileIndex.clear();
    const files = this.platform.getMarkdownFiles();
    for (const file of files) await this.scanFile(file);
  }
  async initialScan() { return this.scanAll(); }

  async scanFile(file: TFile): Promise<Item[]> {
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
      const fileName = file.name.toLowerCase().endsWith('.md')
                ? file.name.slice(0, -3) : file.name;


      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 标题
        if (
          nextHeadingIndex < headingsList.length &&
          headingsList[nextHeadingIndex].position.start.line === i
        ) {
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

        // 块
        if (line.trim() === '<!-- start -->') {
          const endIdx = lines.indexOf('<!-- end -->', i + 1);
          if (endIdx !== -1) {
            const blockItem = parseBlockContent(filePath, lines, i, endIdx, parentFolder);
            if (blockItem) {
              blockItem.created = file.stat.ctime;
              blockItem.modified = file.stat.mtime;
              if (currentHeader) blockItem.header = currentHeader;
              blockItem.tags = Array.from(new Set([...currentSectionTags, ...blockItem.tags]));
              blockItem.filename = fileName; // 使用统一的 fileName
              blockItem.fileName = fileName; // 再次确保 Item.fileName 被设置
              normalizeItemDates(blockItem);
              const hashIdx = blockItem.id.lastIndexOf('#');
              const lineNo = hashIdx >= 0 ? Number(blockItem.id.slice(hashIdx + 1)) : undefined;
              (blockItem as any).file = { path: filePath, line: lineNo, basename: fileName };
              fileItems.push(blockItem);
            }
            i = endIdx;
            continue;
          }
        }

        // 任务
        const taskItem = parseTaskLine(filePath, line, i + 1, parentFolder);
        if (taskItem) {
          taskItem.tags = Array.from(new Set([...currentSectionTags, ...taskItem.tags]));
          taskItem.created = file.stat.ctime;
          taskItem.modified = file.stat.mtime;
          if (currentHeader) taskItem.header = currentHeader;
          taskItem.filename = fileName; // 使用统一的 fileName
          taskItem.fileName = fileName; // 再次确保 Item.fileName 被设置
          normalizeItemDates(taskItem);
          (taskItem as any).file = { path: filePath, line: i + 1, basename: fileName };
          (taskItem as any).recurrenceInfo = parseRecurrence(taskItem.content) || undefined;
          fileItems.push(taskItem);
        }
      }

      if (this.fileIndex.has(filePath)) {
        this.items = this.items.filter(it => it.id && !it.id.startsWith(filePath + '#'));
      }
      this.fileIndex.set(filePath, fileItems);
      this.items.push(...fileItems);
      return fileItems;
    } catch (err) {
      console.error('ThinkPlugin: 扫描文件失败', file.path, err);
      return [];
    }
  }

  removeFileItems(filePath: string) {
    if (this.fileIndex.has(filePath)) {
      this.fileIndex.delete(filePath);
      this.items = this.items.filter(it => !it.id.startsWith(filePath + '#'));
    }
  }
  removeFile(path: string) { this.removeFileItems(path); }

  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const filtered = filterByRules(this.items, filters);
    return sortItems(filtered, sortRules);
  }
  query(filters: FilterRule[] = [], sortRules: SortRule[] = []) { return this.queryItems(filters, sortRules); }

  /* 标记完成：直接改 categoryKey → 任务/done */
  async markItemDone(itemId: string): Promise<void> {
    const it = this.items.find(x => x.id === itemId);
    const isClosed = (k?: string) => /\/(done|cancelled)$/i.test(k || '');
    if (it && it.type === 'task' && !isClosed(it.categoryKey)) {
      const today = todayISO();
      it.doneDate = today;
      it.date = it.date || today;
      it.dateSource = it.dateSource || 'done';
      const t = Date.parse(today);
      if (!isNaN(t)) {
        it.dateMs = it.dateMs ?? t;
        it.endMs  = it.endMs  ?? t;
      }
      it.endISO = it.endISO || today;

      // 更新 categoryKey
      if (/^任务\/open$/i.test(it.categoryKey)) it.categoryKey = '任务/done';
      else it.categoryKey = '任务/done';

      this.notifyChange();
    }

    await TaskService.completeTask(itemId);
  }

  private _emitChange() {
    this.changeListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('ThinkPlugin: 数据变化通知错误', e); }
    });
  }
  private _emitThrottled = throttle(() => this._emitChange(), 250);

  subscribe(listener: () => void) { this.changeListeners.add(listener); }
  unsubscribe(listener: () => void) { this.changeListeners.delete(listener); }
  notifyChange() { this._emitThrottled(); }
}