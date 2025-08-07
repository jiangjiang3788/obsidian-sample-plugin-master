// data/store.ts - 数据存储与查询，实现扫描 Vault、维护 Item 列表、提供查询接口 

import { App, TFile, TFolder, HeadingCache } from 'obsidian';
import { Item, FilterRule, SortRule, readField } from '@core/domain/schema';
import { parseTaskLine, parseBlockContent } from '@core/utils/parser';
import { throttle } from '@core/utils/timing';
import { TaskService } from '@core/services/taskService';

export class DataStore {
  static instance: DataStore;

  private app: App;
  private items: Item[] = [];
  private fileIndex: Map<string, Item[]> = new Map();
  private changeListeners: Set<() => void> = new Set();

  constructor(app: App) {
    this.app = app;
    DataStore.instance = this;
  }

  /* ---------- 扫描 ---------- */

  /** 初次扫描所有 Markdown 文件（新） */
  async scanAll() {
    this.items = [];
    this.fileIndex.clear();
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) await this.scanFile(file);
  }

  /** 兼容旧调用名 */
  async initialScan() {
    return this.scanAll();
  }

  /** 扫描并解析单个文件，将该文件的 Items 更新至存储 */
  async scanFile(file: TFile): Promise<Item[]> {
    try {
      const content = await this.app.vault.read(file);
      const lines = content.split(/\r?\n/);
      const filePath = file.path;
      const parentFolder = file.parent?.name || '';
      const fileItems: Item[] = [];

      const cache = this.app.metadataCache.getFileCache(file);
      const headingsList: HeadingCache[] = cache?.headings || [];
      let nextHeadingIndex = 0;
      let currentSectionTags: string[] = [];
      let currentHeader: string = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 标题切换
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
              blockItem.created  = file.stat.ctime;
              blockItem.modified = file.stat.mtime;
              if (currentHeader) blockItem.header = currentHeader;
              blockItem.tags = Array.from(new Set([...currentSectionTags, ...blockItem.tags]));

              let name = file.name.toLowerCase().endsWith('.md') ? file.name.slice(0, -3) : file.name;
              blockItem.filename = name;
              fileItems.push(blockItem);
            }
            i = endIdx;
            continue;
          }
        }

        // 任务
        const taskItem = parseTaskLine(filePath, line, i + 1, parentFolder);
        if (taskItem) {
          taskItem.tags     = Array.from(new Set([...currentSectionTags, ...taskItem.tags]));
          taskItem.created  = file.stat.ctime;
          taskItem.modified = file.stat.mtime;
          if (currentHeader) taskItem.header = currentHeader;

          let name = file.name.toLowerCase().endsWith('.md') ? file.name.slice(0, -3) : file.name;
          taskItem.filename = name;
          fileItems.push(taskItem);
        }
      }

      // 替换旧索引
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

  /** 从存储中移除指定文件的 Items */
  removeFileItems(filePath: string) {
    if (this.fileIndex.has(filePath)) {
      this.fileIndex.delete(filePath);
      this.items = this.items.filter(it => !it.id.startsWith(filePath + '#'));
    }
  }

  /** 兼容旧调用名 */
  removeFile(path: string) {
    this.removeFileItems(path);
  }

  /* ---------- 查询 ---------- */

  queryItems(filters: FilterRule[] = [], sortRules: SortRule[] = []): Item[] {
    let results = this.items.filter(item =>
      (filters || []).every(rule => this._matchItem(item, rule))
    );

    if (sortRules.length > 0) {
      results.sort((a, b) => {
        for (const rule of sortRules) {
          const aVal = readField(a, rule.field);
          const bVal = readField(b, rule.field);
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return rule.dir === 'asc' ? 1 : -1;
          if (bVal == null) return rule.dir === 'asc' ? -1 : 1;

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal !== bVal) return rule.dir === 'asc' ? aVal - bVal : bVal - aVal;
          } else {
            const aStr = String(aVal);
            const bStr = String(bVal);
            if (aStr !== bStr) return rule.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
          }
        }
        return 0;
      });
    }
    return results;
  }

  /** 兼容旧调用名 */
  query(filters: FilterRule[] = [], sortRules: SortRule[] = []) {
    return this.queryItems(filters, sortRules);
  }

  /* ---------- 标记任务完成（统一调用 Service） ---------- */
  async markItemDone(itemId: string): Promise<void> {
    await TaskService.completeTask(itemId);
  }

  /* ---------- 订阅 ---------- */

  private _emitChange() {
    this.changeListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('ThinkPlugin: 数据变化通知错误', e); }
    });
  }
  private _emitThrottled = throttle(() => this._emitChange(), 250);

  subscribe(listener: () => void) { this.changeListeners.add(listener); }
  unsubscribe(listener: () => void) { this.changeListeners.delete(listener); }
  notifyChange() { this._emitThrottled(); }

  /* ---------- 过滤匹配 ---------- */
  private _matchItem(item: Item, rule: FilterRule): boolean {
    const fieldVal = readField(item, rule.field);
    const cmpVal   = rule.value;

    if (rule.op === '=' || rule.op === '!=') {
      const isEqual = fieldVal != null && cmpVal != null && String(fieldVal) === String(cmpVal);
      return rule.op === '=' ? isEqual : !isEqual;
    }
    if (rule.op === 'includes') {
      if (fieldVal == null) return false;
      if (Array.isArray(fieldVal)) return fieldVal.some(v => String(v).includes(String(cmpVal)));
      return String(fieldVal).includes(String(cmpVal));
    }
    if (rule.op === 'regex') {
      if (fieldVal == null) return false;
      try {
        const regex = new RegExp(String(cmpVal));
        if (Array.isArray(fieldVal)) return fieldVal.some(v => regex.test(String(v)));
        return regex.test(String(fieldVal));
      } catch {
        console.warn('ThinkPlugin: 无效的正则表达式', cmpVal);
        return false;
      }
    }
    if (rule.op === '>' || rule.op === '<') {
      if (fieldVal == null) return false;

      const itemNum = Number(fieldVal);
      const cmpNum  = Number(cmpVal);
      if (!isNaN(itemNum) && !isNaN(cmpNum)) return rule.op === '>' ? itemNum > cmpNum : itemNum < cmpNum;

      const itemTime = Date.parse(String(fieldVal));
      const cmpTime  = Date.parse(String(cmpVal));
      if (!isNaN(itemTime) && !isNaN(cmpTime)) return rule.op === '>' ? itemTime > cmpTime : itemTime < cmpTime;

      const aStr = String(fieldVal);
      const bStr = String(cmpVal);
      return rule.op === '>' ? aStr > bStr : aStr < bStr;
    }
    return false;
  }
}