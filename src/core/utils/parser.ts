// src/core/utils/parser.ts
// 解析任务与块，直接生成 categoryKey（不再生成 status/category）
import { Item } from '@core/domain/schema';
import {
  TAG_RE, KV_IN_PAREN, DATE_YMD_RE, RE_TASK_PREFIX,
  RE_DONE_BOX, RE_CANCEL_BOX
} from '@core/utils/regex';
import { normalizeDateStr, extractDate } from '@core/utils/date';
import { EMOJI } from '@core/domain/constants';
import { cleanTaskText } from '@core/utils/text';

/* ---------- 工具 ---------- */
function pick(line: string, emoji: string) { return extractDate(line, emoji); }
const isDoneLine = (line: string) => RE_DONE_BOX.test(line);
const isCancelledLine = (line: string) => RE_CANCEL_BOX.test(line);

/** 解析任务行 */
export function parseTaskLine(
  filePath: string, rawLine: string, lineNo: number, parentFolder: string
): Item | null {
  const lineText = rawLine;
  if (!RE_TASK_PREFIX.test(lineText)) return null;

  

  /* ---- 状态 → categoryKey ---- */
  const status = isDoneLine(lineText) ? 'done' : isCancelledLine(lineText) ? 'cancelled' : 'open';
  const categoryKey = `任务/${status}`;

  /* ---- 标签 ---- */
  const tagMatches = lineText.match(TAG_RE) || [];
  const tags = tagMatches.map(t => t.replace('#', ''));

  /* ---- 重复性 ---- */
  let recurrence = 'none';
  const recMatch = lineText.match(/🔁\s*([^\n📅⏳🛫➕✅❌]*)/);
  if (recMatch && recMatch[1]) recurrence = recMatch[1].trim();

  /* ---- 括号 meta ---- */
  const extra: Record<string, string | number | boolean> = {};
  let m: RegExpExecArray | null;
  while ((m = KV_IN_PAREN.exec(lineText)) !== null) {
    const key = m[1].trim();
    const value = m[2].trim();
    const lowerKey = key.toLowerCase();
    if (['主题', '标签', 'tag', 'tags'].includes(lowerKey)) {
      value.split(/[,，]/).forEach(v => {
        const t = v.trim().replace(/^#/, '');
        if (t) tags.push(t);
      });
    } else {
      const num = Number(value);
      let parsed: any = value;
      if (value !== '' && !isNaN(num))      parsed = num;
      else if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
      extra[key] = parsed;
    }
  }

  /* ---- 日期 ---- */
  const doneDate      = pick(lineText, EMOJI.done);
  const cancelledDate = pick(lineText, EMOJI.cancelled);
  const dueDate       = pick(lineText, EMOJI.due);
  const scheduledDate = pick(lineText, EMOJI.scheduled);
  const startDate     = pick(lineText, EMOJI.start);
  const createdDate   = pick(lineText, EMOJI.created);

  /* ---- 优先级 / 图标 / 标题 ---- */
  const pickPriority = (line: string): Item['priority'] | undefined => {
    if (line.includes('🔺')) return 'highest';
    if (line.includes('⏫')) return 'high';
    if (line.includes('🔼')) return 'medium';
    if (line.includes('⏽')) return 'low';
    if (line.includes('⏬')) return 'lowest';
    if (line.includes('🔽')) return 'low';
    return undefined;
  };

  let icon: string | undefined;
  const afterPrefix = lineText.replace(RE_TASK_PREFIX, '').trim();
  const iconMatch = afterPrefix.match(/^(\p{Extended_Pictographic}\uFE0F?)/u);
  let titleSrc = afterPrefix;
  if (iconMatch) {
    icon = iconMatch[1];
    titleSrc = titleSrc.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '');
  }
  titleSrc = cleanTaskText(titleSrc);

  const priority = pickPriority(lineText);

  /* ---- Item ---- */
  const item: Item = {
    id: `${filePath}#${lineNo}`,
    title: titleSrc || '',
    content: lineText.trim(),
    type: 'task',
    tags: Array.from(new Set(tags)),
    recurrence,
    created: 0,
    modified: 0,
    extra,
    categoryKey,
  };

  if (icon) item.icon = icon;
  if (priority) item.priority = priority;

  // 兼容日期字段（供 normalize 使用）
  if (createdDate)   item.createdDate = createdDate;
  if (scheduledDate) item.scheduledDate = scheduledDate;
  if (startDate)     item.startDate = startDate;
  if (dueDate)       item.dueDate = dueDate;
  if (doneDate)      item.doneDate = doneDate;
  if (cancelledDate) item.cancelledDate = cancelledDate;

  /* timeline Start/End */
  item.startISO = startDate || scheduledDate || dueDate || createdDate;
  item.endISO   = doneDate || cancelledDate || dueDate;
  if (!item.startISO && status === 'open') {
    item.startISO = item.date = item.dueDate || item.scheduledDate || item.startDate || item.createdDate;
  }
  if (!item.endISO) item.endISO = item.startISO;

  if (item.startISO) item.startMs = Date.parse(item.startISO);
  if (item.endISO)   item.endMs   = Date.parse(item.endISO);

  return item;
}

/** 解析块内容（categoryKey = 原来的 “分类/类别/category” 或父文件夹名） */
export function parseBlockContent(
  filePath: string, lines: string[], startIdx: number, endIdx: number, parentFolder: string
): Item | null {
  const contentLines = lines.slice(startIdx + 1, endIdx);
  let title = '';
  let categoryKey: string | null = null;
  let statusIgnored: string | undefined; // 兼容旧“状态”字段，但不再使用
  let date: string | undefined;
  const tags: string[] = [];
  const extra: Record<string, string | number | boolean> = {};
  let themeValue: string | null = null;
  let contentText = '';
  let contentStarted = false;
  let iconVal: string | null = null;

  for (let i = 0; i < contentLines.length; i++) {
    const rawLine = contentLines[i];
    const line = rawLine.trim();
    if (!contentStarted) {
      if (line === '') continue;
      const kv = line.match(/^([^:：]{1,20})::\s*(.*)$/);
      if (kv) {
        const key = kv[1].trim();
        const value = kv[2] || '';
        const lower = key.toLowerCase();
        if (['分类', '类别', 'category'].includes(lower))       categoryKey = value.trim();
        else if (['主题', '标签', 'tag', 'tags'].includes(lower)) themeValue = value.trim();
        else if (['状态', 'status'].includes(lower))            statusIgnored = value.trim();
        else if (['日期', 'date'].includes(lower))              date = normalizeDateStr(value.trim());
        else if (['内容', 'content'].includes(lower)) {
          contentStarted = true; contentText = value;
        } else if (['图标', 'icon'].includes(lower)) {
          iconVal = value.trim(); extra['图标'] = iconVal;
        } else {
          const num = Number(value.trim());
          let parsed: any = value.trim();
          if (parsed !== '' && !isNaN(num)) parsed = num;
          else if (/^(true|false)$/i.test(parsed)) parsed = parsed.toLowerCase() === 'true';
          extra[key] = parsed;
        }
      } else { contentStarted = true; contentText = rawLine; }
    } else { contentText += (contentText ? '\n' : '') + rawLine; }
  }

  if (themeValue) {
    themeValue.split(/[,，]/).map(p => p.trim()).filter(Boolean)
      .forEach(t => tags.push(t.replace(/^#/, '')));
  }

  if (contentText.trim() !== '')      title = contentText.trim().split(/\r?\n/)[0];
  else if (themeValue)                title = themeValue.split(/[,，]/).map(p => p.trim()).filter(Boolean).join(', ');
  title = title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim();
  if (title) title = title.slice(0, 10);

  // 默认使用父文件夹作为类别
  if (!categoryKey) categoryKey = parentFolder || '';

  const item: Item = {
    id: `${filePath}#${startIdx + 1}`,
    title: title || '',
    content: contentText.trim(),
    type: 'block',
    tags: Array.from(new Set(tags)),
    recurrence: 'none',
    created: 0,
    modified: 0,
    extra,
    categoryKey,
  };
  if (iconVal) item.icon = iconVal;

  /* timeline fields */
  item.startISO = date;
  item.endISO   = date;
  if (item.startISO) item.startMs = Date.parse(item.startISO);
  if (item.endISO)   item.endMs   = item.startMs;

  item.date = date;
  return item;
}