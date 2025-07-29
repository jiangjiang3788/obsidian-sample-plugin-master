// data/parser.ts
// 统一后的任务/块解析器（去掉重复正则与日期处理，全部从 utils 与 constants 引用）
import { Item } from '../config/schema';
import {
  TAG_RE,
  KV_IN_PAREN,
  DATE_YMD_RE,
  RE_TASK_PREFIX,
  RE_DONE_BOX,
  RE_CANCEL_BOX,
} from '../utils/regex';
import { normalizeDateStr } from '../utils/date';
import { EMOJI } from '../config/constants';
import { cleanTaskText } from '../utils/text';

// 优先级
function pickPriority(line: string): Item['priority'] | undefined {
  if (line.includes('🔺')) return 'highest';
  if (line.includes('⏫')) return 'high';
  if (line.includes('🔼')) return 'medium';
  if (line.includes('🔽')) return 'low';
  if (line.includes('⏬')) return 'lowest';
  return undefined;
}

/** 解析任务行 (以 "- [ ]" 或 "- [x]" 开头) 为 Item */
export function parseTaskLine(
  filePath: string,
  rawLine: string,
  lineNo: number,
  parentFolder: string
): Item | null {
  const lineText = rawLine;
  if (!RE_TASK_PREFIX.test(lineText)) return null;

  // 状态
  let status: Item['status'] = 'open';
  if (RE_DONE_BOX.test(lineText)) status = 'done';
  else if (RE_CANCEL_BOX.test(lineText)) status = 'cancelled';

  // 行内标签
  const tagMatches = lineText.match(TAG_RE) || [];
  const tags = tagMatches.map(t => t.replace('#', ''));

  // 重复性
  let recurrence = 'none';
  const recMatch = lineText.match(/🔁\s*([^\n📅⏳🛫➕✅❌]*)/);
  if (recMatch && recMatch[1]) recurrence = recMatch[1].trim();

  // 括号 meta
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
      if (value !== '' && !isNaN(num)) parsed = num;
      else if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
      extra[key] = parsed;
    }
  }

  // 日期/emoji
  const pickDate = (emoji: string): string | undefined => {
    const mt = lineText.match(new RegExp(`${emoji}\\s*(${DATE_YMD_RE.source})`));
    return mt ? normalizeDateStr(mt[1]) : undefined;
  };
  const doneDate       = pickDate(EMOJI.done);
  const cancelledDate  = pickDate(EMOJI.cancelled);
  const dueDate        = pickDate(EMOJI.due);
  const scheduledDate  = pickDate(EMOJI.scheduled);
  const startDate      = pickDate(EMOJI.start);
  const createdDate    = pickDate(EMOJI.created);

  const priority = pickPriority(lineText);

  // 图标: 第一个 emoji
  let icon: string | undefined;
  const afterPrefix = lineText.replace(RE_TASK_PREFIX, '').trim();
  const iconMatch = afterPrefix.match(/^(\p{Extended_Pictographic}\uFE0F?)/u);
  let titleSrc = afterPrefix;
  if (iconMatch) {
    icon = iconMatch[1];
    titleSrc = titleSrc.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '');
  }

  // 使用统一 cleanTaskText
  titleSrc = cleanTaskText(titleSrc);

  const item: Item = {
    id: `${filePath}#${lineNo}`,
    title: titleSrc || '',
    content: lineText.trim(),
    type: 'task',
    status,
    category: '任务',
    tags: Array.from(new Set(tags)),
    recurrence,
    date: undefined,
    created: 0,
    modified: 0,
    extra: {},
  };

  if (icon) {
    item.icon = icon;
    extra['图标'] = icon;
  }
  if (priority) item.priority = priority;

  if (createdDate) item.createdDate = createdDate;
  if (scheduledDate) item.scheduledDate = scheduledDate;
  if (startDate) item.startDate = startDate;
  if (dueDate) item.dueDate = dueDate;
  if (doneDate) {
    item.doneDate = doneDate;
    if (status === 'done') item.date = doneDate;
  }
  if (cancelledDate) {
    item.cancelledDate = cancelledDate;
    if (status === 'cancelled') item.date = cancelledDate;
  }

  if (status === 'open') {
    item.date = dueDate || scheduledDate || startDate || createdDate;
  }

  item.extra = extra;
  return item;
}

/** 解析块内容 (<!-- start --> ... <!-- end -->) 为 Item */
export function parseBlockContent(
  filePath: string,
  lines: string[],
  startIdx: number,
  endIdx: number,
  parentFolder: string
): Item | null {
  const contentLines = lines.slice(startIdx + 1, endIdx);
  let title = '';
  let category: string | null = null;
  let status: string | undefined;
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
        if (['分类', '类别', 'category'].includes(lower)) {
          category = value.trim();
        } else if (['主题', '标签', 'tag', 'tags'].includes(lower)) {
          themeValue = value.trim();
        } else if (['状态', 'status'].includes(lower)) {
          status = value.trim();
        } else if (['日期', 'date'].includes(lower)) {
          date = normalizeDateStr(value.trim());
        } else if (['内容', 'content'].includes(lower)) {
          contentStarted = true;
          contentText = value;
        } else if (['图标', 'icon'].includes(lower)) {
          iconVal = value.trim();
          extra['图标'] = iconVal;
        } else {
          const num = Number(value.trim());
          let parsed: any = value.trim();
          if (parsed !== '' && !isNaN(num)) parsed = num;
          else if (/^(true|false)$/i.test(parsed)) parsed = parsed.toLowerCase() === 'true';
          extra[key] = parsed;
        }
      } else {
        contentStarted = true;
        contentText = rawLine;
      }
    } else {
      contentText += (contentText ? '\n' : '') + rawLine;
    }
  }

  if (themeValue) {
    themeValue
      .split(/[,，]/)
      .map(p => p.trim())
      .filter(Boolean)
      .forEach(t => tags.push(t.replace(/^#/, '')));
  }

  if (contentText.trim() !== '') {
    title = contentText.trim().split(/\r?\n/)[0];
  } else if (themeValue) {
    title = themeValue.split(/[,，]/).map(p => p.trim()).filter(Boolean).join(', ');
  }
  title = title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim();
  if (title) title = title.slice(0, 10);

  if (!category) category = parentFolder || '';

  const item: Item = {
    id: `${filePath}#${startIdx + 1}`,
    title: title || '',
    content: contentText.trim(),
    type: 'block',
    status,
    category,
    tags: Array.from(new Set(tags)),
    recurrence: 'none',
    date,
    created: 0,
    modified: 0,
    extra,
  };
  if (iconVal) item.icon = iconVal;
  return item;
}