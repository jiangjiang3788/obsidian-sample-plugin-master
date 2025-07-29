// scr/data/mark.ts
// 任务状态切换与周期任务工具函数（已整合 markTaskDone 高层封装）

import { EMOJI } from '../config/constants';
import { DATE_YMD_RE } from '../utils/regex';
import { normalizeDateStr } from '../utils/date';

export interface RecurrenceInfo {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  whenDone: boolean;
}

/* ---------- 单行任务完成 ---------- */

/** 把待办行切换为已完成，并写入 ✅ 日期与 (时间::hh:mm) */
export function toggleToDone(
  rawLine: string,
  todayISO: string,
  nowTime: string
): string {
  let line = rawLine;

  // 确保 (时长::x) 在括号里，同时插入时间 (时间::hh:mm)
  line = line.replace(/(\s|^)(时长::[^\s()]+)/g, (m, pre, content) =>
    m.includes('(') ? m : `${pre}(${content})`
  );

  if (/\(时长::[^\)]+\)/.test(line)) {
    line = line.replace(/\((时长::[^\)]+)\)/, `(时间::${nowTime}) ($1)`);
  } else if (/时长::[^\s]+/.test(line)) {
    line = line.replace(/(时长::[^\s]+)/, `(时间::${nowTime}) ($1)`);
  } else if (line.includes(EMOJI.repeat)) {
    line = line.replace(EMOJI.repeat, `(时间::${nowTime}) ${EMOJI.repeat}`);
  } else {
    line = `${line} (时间::${nowTime})`;
  }

  // 方框 → [x]，若原行缺失前缀则补全
  line = line.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[x]');
  if (!/^-\s*\[x\]/.test(line)) {
    line = `- [x] ${line.replace(/^-\s*\[.\]/, '').replace(/^-\s*/, '')}`;
  }

  // 清理旧 ✓ 日期并写入新的
  line = line.replace(
    new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}$`),
    ''
  );
  return `${line.trim()} ${EMOJI.done} ${todayISO}`;
}

/* ---------- 周期任务 ---------- */

export function parseRecurrence(rawTask: string): RecurrenceInfo | null {
  const m = rawTask.match(
    /🔁\s*every\s+(\d+)?\s*(day|week|month|year)s?\s*(when done)?/i
  );
  if (!m) return null;
  const interval = m[1] ? parseInt(m[1], 10) : 1;
  let unit = m[2].toLowerCase() as RecurrenceInfo['unit'];
  if (unit.endsWith('s')) unit = unit.slice(0, -1) as any;
  const whenDone = Boolean(m[3]);
  return { interval, unit, whenDone };
}

export function findBaseDateForRecurring(
  rawTask: string,
  whenDone: boolean,
  todayISO: string
): string {
  const m = (window as any).moment;
  if (whenDone) return todayISO;

  const pick = (emoji: string) => {
    const r = new RegExp(`${emoji}\\s*(${DATE_YMD_RE.source})`);
    const mt = rawTask.match(r);
    return mt ? normalizeDateStr(mt[1]) : null;
  };
  return (
    pick(EMOJI.due) ||
    pick(EMOJI.scheduled) ||
    pick(EMOJI.start) ||
    todayISO
  );
}

export function generateNextRecurringTask(
  rawTask: string,
  baseDateISO: string
): string {
  let next = rawTask
    .replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[ ]') // 复原为待办
    .replace(new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}`), '')
    .replace(/\(时间::\d{2}:\d{2}\)/, '');

  const rec = parseRecurrence(rawTask);
  if (!rec) return next.trim();

  const m = (window as any).moment;
  const base = m(baseDateISO, ['YYYY-MM-DD', 'YYYY/MM/DD']);
  const nextDate = base
    .clone()
    .add(rec.interval, rec.unit + (rec.interval > 1 ? 's' : ''));
  const nextStr = nextDate.format('YYYY-MM-DD');

  const replaceIf = (emoji: string) => {
    const re = new RegExp(`${emoji}\\s*${DATE_YMD_RE.source}`);
    if (re.test(next)) next = next.replace(re, `${emoji} ${nextStr}`);
  };
  replaceIf(EMOJI.due);
  replaceIf(EMOJI.scheduled);
  replaceIf(EMOJI.start);

  return next.trim();
}

/* ---------- 高层 API：一次性完成标记 + 生成下一条 ---------- */

/** 
 * 将 `rawLine` 标记为完成，返回新的行文本和（若为周期任务时）下一条任务行。
 */
export function markTaskDone(
  rawLine: string,
  todayISO: string,
  nowTime: string
): { completedLine: string; nextTaskLine?: string } {
  const completedLine = toggleToDone(rawLine, todayISO, nowTime);
  const rec = parseRecurrence(rawLine);
  if (!rec) return { completedLine };

  const baseISO = findBaseDateForRecurring(rawLine, rec.whenDone, todayISO);
  const nextTaskLine = generateNextRecurringTask(rawLine, baseISO);
  return { completedLine, nextTaskLine };
}