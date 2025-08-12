// src/core/services/dataStore.ts
import { HeadingCache, TFile, TFolder } from 'obsidian';
import { Item, FilterRule, SortRule } from '@core/domain/schema';
import { parseTaskLine, parseBlockContent } from '@core/utils/parser';
import { throttle } from '@core/utils/timing';
import { TaskService } from '@core/services/taskService'; // 导入 TaskService
import { ObsidianPlatform } from '@platform/obsidian';
import { normalizeItemDates } from '@core/utils/normalize';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { todayISO } from '@core/utils/date';
import { parseRecurrence } from '@core/utils/mark';

export class DataStore {
  static instance: DataStore;
  public platform: ObsidianPlatform; // 改为 public，TaskService 需要访问
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
    // ... 此处 scanFile 的其余代码保持不变 ...
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
        const taskItem = parseTaskLine(filePath, line, i + 1, parentFolder);
        if (taskItem) {
          taskItem.tags = Array.from(new Set([...currentSectionTags, ...taskItem.tags]));
          taskItem.created = file.stat.ctime;
          taskItem.modified = file.stat.mtime;
          if (currentHeader) taskItem.header = currentHeader;
          taskItem.filename = fileName;
          taskItem.fileName = fileName;
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
      this.items = this.items.filter(it => it.id && !it.id.startsWith(filePath + '#'));
    }
  }

  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    const filtered = filterByRules(this.items, filters);
    return sortItems(filtered, sortRules);
  }

  // ========== 修改后的代码块开始 ==========
  /**
   * 标记任务完成。
   * 此函数现在将所有操作委托给 TaskService。TaskService 负责：
   * 1. 修改 .md 文件（将任务标记为完成，并创建新的重复任务行）。
   * 2. 调用 DataStore.scanFile() 来重新解析已修改的文件。
   * 3. 调用 DataStore.notifyChange() 来通知 UI 更新。
   * 这种方法确保了数据流的单一性和一致性，修复了因乐观更新和完全重扫之间冲突而导致的 UI 同步问题。
   */
  async markItemDone(itemId: string): Promise<void> {
    await TaskService.completeTask(itemId);
  }
  // ========== 修改后的代码块结束 ==========

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