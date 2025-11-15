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

// [核心修改] 辅助函数，用于清理所有时间相关的标签
const cleanTimeAndDurationTags = (line: string): string => {
    return line
        .replace(/\s*[\(\[]时间::[^)\]]*[\)\]]/g, '')
        .replace(/\s*[\(\[]结束::[^)\]]*[\)\]]/g, '')
        .replace(/\s*[\(\[]时长::[^)\]]*[\)\]]/g, '')
        .trim();
};

/* ---------- 单行任务完成 ---------- */
export function toggleToDone(
    rawLine: string,
    todayISO: string,
    nowTime: string,
    options?: { duration?: number; startTime?: string; endTime?: string }
): string {
    // 1. 清理所有旧的时间、结束、时长标签，以确保顺序和值的正确性
    let line = cleanTimeAndDurationTags(rawLine);

    // 2. 准备要按顺序追加的新标签
    const duration = options?.duration;
    const startTime = options?.startTime;
    const endTime = options?.endTime;

    const tagsToAppend = [];

    // 顺序 1: 开始时间
    if (startTime !== undefined) {
        tagsToAppend.push(`(时间:: ${startTime})`);
    } 
    // 回退情况：如果没有任何时间信息，说明是简单完成，记录一个时间点
    else if (duration === undefined && endTime === undefined) {
        tagsToAppend.push(`(时间:: ${nowTime})`);
    }

    // 顺序 2: 结束时间
    if (endTime !== undefined) {
        tagsToAppend.push(`(结束:: ${endTime})`);
    }

    // 顺序 3: 时长
    if (duration !== undefined) {
        tagsToAppend.push(`(时长:: ${duration})`);
    }

    // 3. 重新组装任务行
    line = [line, ...tagsToAppend].join(' ').replace(/\s+/g, ' ').trim();
    
    // 4. 标记任务为完成状态 [x]
    line = line.replace(/^(\s*-\s*)\[[ xX-]\]/, '$1[x]');
    if (!/^-\s*\[x\]/.test(line)) {
        line = `- [x] ${line.replace(/^-\s*\[.\]/, '').replace(/^-\s*/, '')}`;
    }

    // 5. 清理旧的完成日期并添加新的
    line = line.replace(
        new RegExp(`\\s*${EMOJI.done}\\s*${DATE_YMD_RE.source}$`),
        '',
    );
    return `${line.trim()} ${EMOJI.done} ${todayISO}`;
}

/* ---------- 周期任务 (无变化) ---------- */
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
        .replace(/\s*[\(\[]时间::[^)\]]*[\)\]]/g, '') // 清理所有时间相关标签
        .replace(/\s*[\(\[]结束::[^)\]]*[\)\]]/g, '')
        // .replace(/\s*[\(\[]时长::[^)\]]*[\)\]]/g, '');

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
    options?: { duration?: number; startTime?: string; endTime?: string }
): { completedLine: string; nextTaskLine?: string } {
    const completedLine = toggleToDone(rawLine, todayISO, nowTime, options);
    const rec = parseRecurrence(rawLine);
    if (!rec) return { completedLine };

    const baseISO = findBaseDateForRecurring(rawLine, rec.whenDone, todayISO);
    const nextTaskLine = generateNextRecurringTask(rawLine, baseISO);
    return { completedLine, nextTaskLine };
}
