// src/data/mark.ts
// 同理，搬迁后仅改动 import 路径
import { EMOJI } from '../config/constants';
import { DATE_YMD_RE } from '../utils/regex';
import { normalizeDateStr } from '../utils/date';



export interface RecurrenceInfo {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  whenDone: boolean;
}

export function toggleToDone(rawLine: string, today: string, nowTime: string): string {
  let line = rawLine;

  // 确保 (时长::x) 在括号里，同时插入时间 (时间::hh:mm)
  line = line.replace(/(\s|^)(时长::[^\s()]+)/g, (match, pre, content) => {
    if (match.includes('(') && match.includes(')')) return match;
    return `${pre}(${content})`;
  });

  if (/\(时长::[^\)]+\)/.test(line)) {
    line = line.replace(/\((时长::[^\)]+)\)/, `(时间::${nowTime}) ($1)`);
  } else if (/时长::[^\s]+/.test(line)) {
    line = line.replace(/(时长::[^\s]+)/, `(时间::${nowTime}) ($1)`);
  } else if (line.includes(EMOJI.repeat)) {
    line = line.replace(EMOJI.repeat, `(时间::${nowTime}) ${EMOJI.repeat}`);
  } else {
    line = line + ` (时间::${nowTime})`;
  }

  line = line.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[x]');
  if (!/^-\s*\[x\]/.test(line)) {
    line = '- [x] ' + line.replace(/^-\s*\[.\]/, '').replace(/^-\s*/, '');
  }
  line = line.replace(new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}$`), '');
  line = line.trim() + ` ${EMOJI.done} ${today}`;

  return line;
}



export function parseRecurrence(rawTask: string): RecurrenceInfo | null {
  const recMatch = rawTask.match(/🔁\s*every\s+(\d+)?\s*(day|week|month|year)s?\s*(when done)?/i);
  if (!recMatch) return null;
  const interval = recMatch[1] ? parseInt(recMatch[1]) : 1;
  let unit = recMatch[2].toLowerCase() as RecurrenceInfo['unit'];
  if (unit.endsWith('s')) unit = unit.slice(0, -1) as any;
  const whenDone = !!recMatch[3];
  return { interval, unit, whenDone };
}

export function generateNextRecurringTask(rawTask: string, baseDateISO: string): string {
  // 恢复成未完成
  let nextLine = rawTask;
  nextLine = nextLine.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[ ]');
  nextLine = nextLine.replace(new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}`), '');
  nextLine = nextLine.replace(/\(时间::\d{2}:\d{2}\)/, '');

  // 计算下一日期
  const m = (window as any).moment;
  const rec = parseRecurrence(rawTask);
  if (!rec) return nextLine.trim();

  const base = m(baseDateISO, ['YYYY-MM-DD','YYYY/MM/DD']);
  const nextDate = base.clone().add(rec.interval, rec.unit + (rec.interval > 1 ? 's' : ''));
  const nextStr = nextDate.format('YYYY-MM-DD');

  const replaceIf = (emoji: string) => {
    const re = new RegExp(`${emoji}\\s*${DATE_YMD_RE.source}`);
    if (re.test(nextLine)) {
      nextLine = nextLine.replace(re, `${emoji} ${nextStr}`);
    }
  };
  replaceIf(EMOJI.due);
  replaceIf(EMOJI.scheduled);
  replaceIf(EMOJI.start);

  return nextLine.trim();
}

export function findBaseDateForRecurring(rawTask: string, whenDone: boolean, todayISO: string): string {
  const m = (window as any).moment;
  if (whenDone) return todayISO;

  const pick = (emoji: string) => {
    const re = new RegExp(`${emoji}\\s*(${DATE_YMD_RE.source})`);
    const mt = rawTask.match(re);
    if (mt) return normalizeDateStr(mt[1]);
    return null;
  };
  return pick(EMOJI.due) || pick(EMOJI.scheduled) || pick(EMOJI.start) || todayISO;
}