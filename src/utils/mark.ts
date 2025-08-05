// 任务状态切换与周期任务工具函数
import { EMOJI } from '../config/constants';
import { DATE_YMD_RE } from '../utils/regex';
import { normalizeDateStr } from '../utils/date';
import { dayjs } from '../utils/date';                               // (#5)

/* ---------- 周期任务工具类型 ---------- */
export interface RecurrenceInfo {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  whenDone: boolean;
}

/* ---------- 单行任务完成 ---------- */
export function toggleToDone(
  rawLine: string,
  todayISO: string,
  nowTime: string,
): string {
  let line = rawLine;

  // 确保 (时长::x) 在括号里，同时插入时间 (时间::hh:mm)
  line = line.replace(/(\s|^)(时长::[^\s()]+)/g, (m, pre) =>
    m.includes('(') ? m : `${pre}(${m.trim()})`,
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
    '',
  );
  return `${line.trim()} ${EMOJI.done} ${todayISO}`;
}

/* ---------- 周期任务 ---------- */
export function parseRecurrence(rawTask: string): RecurrenceInfo | null {
  const m = rawTask.match(
    /🔁\s*every\s+(\d+)?\s*(day|week|month|year)s?\s*(when done)?/i,
  );
  if (!m) return null;
  const interval = m[1] ? parseInt(m[1], 10) : 1;
  const unit = m[2].toLowerCase() as RecurrenceInfo['unit'];
  const whenDone = Boolean(m[3]);
  return { interval, unit, whenDone };
}

export function findBaseDateForRecurring(
  rawTask: string,
  whenDone: boolean,
  todayISO: string,
): string {
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
  baseDateISO: string,
): string {
  let next = rawTask
    .replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[ ]') // 复原为待办
    .replace(new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}`), '')
    .replace(/\(时间::\d{2}:\d{2}\)/, '');

  const rec = parseRecurrence(rawTask);
  if (!rec) return next.trim();

  const base = dayjs(baseDateISO, ['YYYY-MM-DD', 'YYYY/MM/DD']);
  const nextDate = base.add(rec.interval, rec.unit);
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

/* ---------- 一次性完成标记 + 生成下一条 ---------- */
export function markTaskDone(
  rawLine: string,
  todayISO: string,
  nowTime: string,
): { completedLine: string; nextTaskLine?: string } {
  const completedLine = toggleToDone(rawLine, todayISO, nowTime);
  const rec = parseRecurrence(rawLine);
  if (!rec) return { completedLine };

  const baseISO = findBaseDateForRecurring(rawLine, rec.whenDone, todayISO);
  const nextTaskLine = generateNextRecurringTask(rawLine, baseISO);
  return { completedLine, nextTaskLine };
}
