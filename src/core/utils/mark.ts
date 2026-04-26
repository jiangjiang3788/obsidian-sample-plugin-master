// src/core/utils/mark.ts
// 任务状态切换与周期任务工具函数
import { EMOJI } from '@/core/types/constants';
import { DATE_YMD_RE } from './regex';
import { normalizeDateStr } from './date';
import { dayjs } from './date';

/* ---------- 周期任务工具类型 ---------- */
export interface RecurrenceInfo {
    interval: number;
    unit: 'day' | 'week' | 'month' | 'year';
    whenDone: boolean;
}

// 放宽了 🔁 前面的限制：允许紧贴正文（如 “什么也不干🔁every day”）也能识别。
const RECURRENCE_RULE_RE =
    /(^|[\s\[(]|[^\s])🔁\s*(every\s+(?:\d+\s+)?(?:day|week|month|year)s?(?:\s+when\s+done)?)(?=$|\s*(?:[\(\[][^\(\[\])]*::|📅|⏳|🛫|➕|✅|❌|#))/i;

/*
 * 从一整行任务文本中抽取“纯 recurrence 规则文本”。
 */
export function extractRecurrenceText(rawTask: string): string | null {
    const match = rawTask.match(RECURRENCE_RULE_RE);
    if (!match) return null;
    return match[2]?.trim() || null;
}

const cleanTimeAndDurationTags = (line: string): string => {
    return line
        .replace(/\s*[\(\[]时间::[^)\]]*[\)\]]/g, '')
        .replace(/\s*[\(\[]结束::[^)\]]*[\)\]]/g, '')
        .replace(/\s*[\(\[]时长::[^)\]]*[\)\]]/g, '')
        .trim();
};

export function toggleToDone(
    rawLine: string,
    todayISO: string,
    nowTime: string,
    options?: { duration?: number; startTime?: string; endTime?: string }
): string {
    let line = cleanTimeAndDurationTags(rawLine);

    const duration = options?.duration;
    const startTime = options?.startTime;
    const endTime = options?.endTime;

    const tagsToAppend = [];

    if (startTime !== undefined) {
        tagsToAppend.push(`(时间:: ${startTime})`);
    }
    else if (duration === undefined && endTime === undefined) {
        tagsToAppend.push(`(时间:: ${nowTime})`);
    }

    if (endTime !== undefined) {
        tagsToAppend.push(`(结束:: ${endTime})`);
    }

    if (duration !== undefined) {
        tagsToAppend.push(`(时长:: ${duration})`);
    }

    line = [line, ...tagsToAppend].join(' ').replace(/\s+/g, ' ').trim();

    line = line.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[x]');
    if (!/^-\s*\[x\]/.test(line)) {
        line = `- [x] ${line.replace(/^-\s*\[.\]/, '').replace(/^-\s*/, '')}`;
    }

    line = line.replace(
        new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}$`),
        '',
    );
    return `${line.trim()} ${EMOJI.done} ${todayISO}`;
}

export function buildCompletedTaskRecord(
    rawLine: string,
    todayISO: string,
    nowTime: string,
    options?: { duration?: number; startTime?: string; endTime?: string }
): string {
    return toggleToDone(rawLine, todayISO, nowTime, options);
}

export function parseRecurrence(rawTask: string): RecurrenceInfo | null {
    const recurrenceText = extractRecurrenceText(rawTask);
    if (!recurrenceText) return null;

    const m = recurrenceText.match(
        /^every\s+(\d+)?\s*(day|week|month|year)s?(\s+when\s+done)?$/i,
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
        const r = new RegExp(`${emoji}\s*(${DATE_YMD_RE.source})`);
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
        .replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[ ]')
        .replace(new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}`), '')
        .replace(/\s*[\(\[]时间::[^)\]]*[\)\]]/g, '')
        .replace(/\s*[\(\[]结束::[^)\]]*[\)\]]/g, '');

    const rec = parseRecurrence(rawTask);
    if (!rec) return next.trim();

    const base = dayjs(baseDateISO, ['YYYY-MM-DD', 'YYYY/MM/DD']);
    const nextDate = base.add(rec.interval, rec.unit);
    const nextStr = nextDate.format('YYYY-MM-DD');

    const replaceIf = (emoji: string) => {
        const re = new RegExp(`${emoji}\s*${DATE_YMD_RE.source}`);
        if (re.test(next)) next = next.replace(re, `${emoji} ${nextStr}`);
    };
    replaceIf(EMOJI.due);
    replaceIf(EMOJI.scheduled);
    replaceIf(EMOJI.start);

    return next.trim();
}

export function markTaskDone(
    rawLine: string,
    todayISO: string,
    nowTime: string,
    options?: { duration?: number; startTime?: string; endTime?: string }
): { completedLine: string; nextTaskLine?: string } {
    const completedLine = buildCompletedTaskRecord(rawLine, todayISO, nowTime, options);
    const rec = parseRecurrence(rawLine);
    if (!rec) return { completedLine };

    const baseISO = findBaseDateForRecurring(rawLine, rec.whenDone, todayISO);
    const nextTaskLine = generateNextRecurringTask(rawLine, baseISO);
    return { completedLine, nextTaskLine };
}
