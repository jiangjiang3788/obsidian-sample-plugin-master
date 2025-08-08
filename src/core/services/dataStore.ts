// dataStore.ts —— 与 Vault 交互的核心数据层
import { HeadingCache, TFile, TFolder } from 'obsidian';
import {
  Item,
  FilterRule,
  SortRule,
  readField,
} from '@core/domain/schema';
import {
  parseTaskLine,
  parseBlockContent,
} from '@core/utils/parser';
import { throttle } from '@core/utils/timing';
import { TaskService } from '@core/services/taskService';
import {
  ObsidianPlatform,
  TAbstractFile,
} from '@platform/obsidian';

// ✅ 引入统一的过滤/排序工具，避免两套实现打架
import {
  filterByRules,
  sortItems,
} from '@core/utils/itemFilter';

export class DataStore {
  /* ---------------- 单例 ---------------- */
  static instance: DataStore;

  /* ---------------- 构造 ---------------- */
  private platform: ObsidianPlatform;
  /** 兼容旧代码：临时暴露 app，让旧逻辑继续工作 */
  get app() {
    return this.platform.app;
  }

  constructor(platform: ObsidianPlatform) {
    this.platform = platform;
    DataStore.instance = this;
  }

  /* ---------------- 私有数据 ---------------- */
  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private changeListeners: Set<() => void> = new Set();

  /* ====================================================================== */
  /*                                扫描                                    */
  /* ====================================================================== */

  /** 首次扫描全库 */
  async scanAll() {
    this.items = [];
    this.fileIndex.clear();
    const files = this.platform.getMarkdownFiles();
    for (const file of files) await this.scanFile(file);
  }

  /** 向后兼容旧 API 名 */
  async initialScan() {
    return this.scanAll();
  }

  /** 扫描单文件并更新缓存 */
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

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        /* --------------- 标题 ---------------- */
        if (
          nextHeadingIndex < headingsList.length &&
          headingsList[nextHeadingIndex].position.start.line === i
        ) {
          const headingEntry = headingsList[nextHeadingIndex];
          const headingText = headingEntry.heading;
          const headingTags =
            headingText.match(/#([\p{L}\p{N}_\/-]+)/gu) || [];
          currentSectionTags = headingTags
            .map(t => t.replace('#', ''))
            .filter(Boolean);
          let cleanText = headingText;
          for (const tag of headingTags)
            cleanText = cleanText.replace(tag, '').trim();
          currentHeader = cleanText || '';
          nextHeadingIndex++;
          continue;
        }

        /* --------------- 块 ---------------- */
        if (line.trim() === '<!-- start -->') {
          const endIdx = lines.indexOf('<!-- end -->', i + 1);
          if (endIdx !== -1) {
            const blockItem = parseBlockContent(
              filePath,
              lines,
              i,
              endIdx,
              parentFolder,
            );
            if (blockItem) {
              blockItem.created = file.stat.ctime;
              blockItem.modified = file.stat.mtime;
              if (currentHeader) blockItem.header = currentHeader;
              blockItem.tags = Array.from(
                new Set([...currentSectionTags, ...blockItem.tags]),
              );

              const name = file.name.toLowerCase().endsWith('.md')
                ? file.name.slice(0, -3)
                : file.name;
              blockItem.filename = name;
              fileItems.push(blockItem);
            }
            i = endIdx;
            continue;
          }
        }

        /* --------------- 任务 ---------------- */
        const taskItem = parseTaskLine(
          filePath,
          line,
          i + 1,
          parentFolder,
        );
        if (taskItem) {
          taskItem.tags = Array.from(
            new Set([...currentSectionTags, ...taskItem.tags]),
          );
          taskItem.created = file.stat.ctime;
          taskItem.modified = file.stat.mtime;
          if (currentHeader) taskItem.header = currentHeader;

          const name = file.name.toLowerCase().endsWith('.md')
            ? file.name.slice(0, -3)
            : file.name;
          taskItem.filename = name;
          fileItems.push(taskItem);
        }
      }

      /* ---------- 替换旧索引 ---------- */
      if (this.fileIndex.has(filePath)) {
        this.items = this.items.filter(
          it => it.id && !it.id.startsWith(filePath + '#'),
        );
      }
      this.fileIndex.set(filePath, fileItems);
      this.items.push(...fileItems);
      return fileItems;
    } catch (err) {
      console.error('ThinkPlugin: 扫描文件失败', file.path, err);
      return [];
    }
  }

  /** 删除某文件的全部 Items */
  removeFileItems(filePath: string) {
    if (this.fileIndex.has(filePath)) {
      this.fileIndex.delete(filePath);
      this.items = this.items.filter(
        it => !it.id.startsWith(filePath + '#'),
      );
    }
  }
  /** 旧名字兼容 */
  removeFile(path: string) {
    this.removeFileItems(path);
  }

  /* ====================================================================== */
  /*                                查询                                    */
  /* ====================================================================== */

  queryItems(
    filters: FilterRule[] = [],
    sortRules: SortRule[] = [],
  ): Item[] {
    // ✅ 用统一工具实现过滤/排序，避免与 itemFilter 逻辑分叉
    const filtered = filterByRules(this.items, filters);
    return sortItems(filtered, sortRules);
  }
  /** 旧 API */
  query(filters: FilterRule[] = [], sortRules: SortRule[] = []) {
    return this.queryItems(filters, sortRules);
  }

  /* ---------- 标记完成 ---------- */
  async markItemDone(itemId: string): Promise<void> {
    await TaskService.completeTask(itemId);
  }

  /* ====================================================================== */
  /*                               事件派发                                 */
  /* ====================================================================== */
  private _emitChange() {
    this.changeListeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('ThinkPlugin: 数据变化通知错误', e);
      }
    });
  }
  private _emitThrottled = throttle(
    () => this._emitChange(),
    250,
  );

  subscribe(listener: () => void) {
    this.changeListeners.add(listener);
  }
  unsubscribe(listener: () => void) {
    this.changeListeners.delete(listener);
  }
  notifyChange() {
    this._emitThrottled();
  }
}
