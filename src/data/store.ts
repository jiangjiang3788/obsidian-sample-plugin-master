// src/data/store.ts - 数据存储与查询，实现扫描 Vault、维护 Item 列表、提供查询接口
import { App, TFile, TFolder, HeadingCache } from 'obsidian';
import { Item, FilterRule, SortRule, readField } from '../config/schema';
import { parseTaskLine, parseBlockContent } from './parser';
import { throttle } from '../utils/timing';

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

  /* ---------- 标记任务完成 ---------- */
  async markItemDone(itemId: string): Promise<void> {
    const parts = itemId.split('#');
    const filePath = parts[0];
    const lineNo = Number(parts[1]) || 0;
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return;
    try {
      const content = await this.app.vault.read(file);
      const lines = content.split(/\r?\n/);
      if (lineNo <= 0 || lineNo > lines.length) return;
      const rawLine = lines[lineNo - 1];
      if (!/^\s*-\s*\[ \]/.test(rawLine)) return;

      const moment = (window as any).moment;
      const today = moment().format('YYYY-MM-DD');
      const nowTime = moment().format('HH:mm');

      let completedLine = rawLine;
      completedLine = completedLine.replace(/(\s|^)(时长::[^\s\(\)]+)/g, (match, pre, content) => {
        if (match.includes('(') && match.includes(')')) return match;
        return `${pre}(${content})`;
      });
      if (/\(时长::[^\)]+\)/.test(completedLine)) {
        completedLine = completedLine.replace(
          /\((时长::[^\)]+)\)/,
          `(时间::${nowTime}) ($1)`
        );
      } else if (/时长::[^\s]+/.test(completedLine)) {
        completedLine = completedLine.replace(
          /(时长::[^\s]+)/,
          `(时间::${nowTime}) ($1)`
        );
      } else if (/🔁/.test(completedLine)) {
        completedLine = completedLine.replace(
          /(🔁)/,
          `(时间::${nowTime}) $1`
        );
      } else {
        completedLine = completedLine + ` (时间::${nowTime})`;
      }

      completedLine = completedLine.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[x]');
      if (!/^-\s*\[x\]/.test(completedLine)) {
        completedLine = '- [x] ' + completedLine.replace(/^-\s*\[.\]/, '').replace(/^-\s*/, '');
      }
      completedLine = completedLine.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}$/, '');
      completedLine = completedLine.trim() + ` ✅ ${today}`;

      const isRecurring = rawLine.includes('🔁');
      if (isRecurring) {
        const generateNextRecurringTaskText = (rawTask: string): string => {
          let nextLine = rawTask;
          nextLine = nextLine.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[ ]');
          nextLine = nextLine.replace(/\s*✅\s*\d{4}[-/]\d{2}[-/]\d{2}/, '');
          nextLine = nextLine.replace(/\(时间::\d{2}:\d{2}\)/, '');

          const recMatch = rawTask.match(/🔁\s*every\s+(\d+)?\s*(day|week|month|year)s?\s*(when done)?/);
          const moment = (window as any).moment;
          let interval = 1;
          let unit = 'day';
          let whenDone = false;
          if (recMatch) {
            if (recMatch[1]) interval = parseInt(recMatch[1]);
            unit = recMatch[2];
            if (unit.endsWith('s')) unit = unit.slice(0, -1);
            whenDone = !!recMatch[3];
          }
          const baseDate = whenDone ? moment() : (() => {
            const due = rawTask.match(/📅\s*(\d{4}[-/]\d{2}[-/]\d{2})/);
            if (due) return moment(due[1], ['YYYY-MM-DD','YYYY/MM/DD']);
            const scheduled = rawTask.match(/⏳\s*(\d{4}[-/]\d{2}[-/]\d{2})/);
            if (scheduled) return moment(scheduled[1], ['YYYY-MM-DD','YYYY/MM/DD']);
            const start = rawTask.match(/🛫\s*(\d{4}[-/]\d{2}[-/]\d{2})/);
            if (start) return moment(start[1], ['YYYY-MM-DD','YYYY/MM/DD']);
            return moment();
          })();
          const nextDate = baseDate.clone().add(interval, unit + (interval > 1 ? 's' : ''));
          const nextDateStr = nextDate.format('YYYY-MM-DD');

          if (/📅\s*\d{4}-\d{2}-\d{2}/.test(nextLine)) {
            nextLine = nextLine.replace(/📅\s*\d{4}[-/]\d{2}[-/]\d{2}/, `📅 ${nextDateStr}`);
          }
          if (/⏳\s*\d{4}-\d{2}-\d{2}/.test(nextLine)) {
            nextLine = nextLine.replace(/⏳\s*\d{4}[-/]\d{2}[-/]\d{2}/, `⏳ ${nextDateStr}`);
          }
          if (/🛫\s*\d{4}-\d{2}-\d{2}/.test(nextLine)) {
          nextLine = nextLine.replace(/🛫\s*\d{4}[-/]\d{2}[-/]\d{2}/, `🛫 ${nextDateStr}`);
          }
          nextLine = nextLine.trim();
          return nextLine;
        };
        lines[lineNo - 1] = completedLine;
        const nextTaskLine = generateNextRecurringTaskText(rawLine);
        lines.splice(lineNo, 0, nextTaskLine);
      } else {
        lines[lineNo - 1] = completedLine;
      }

      await this.app.vault.modify(file, lines.join("\n"));
      await this.scanFile(file);
      this._emitChange();
    } catch (err) {
      console.error('ThinkPlugin: 标记任务完成时发生错误', err);
    }
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
