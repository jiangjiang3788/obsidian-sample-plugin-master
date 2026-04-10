// src/features/dashboard/views/timeline/timeline-parser.ts
//
// 注意：timeline 的“类型形状”不再由 features 定义。
// 这里仅保留解析/拆分的实现；类型来自 core（唯一真源）。
function resolveTimelineAnchorDate(item: any): string | null {
  return item?.date || item?.doneDate || item?.completedDate || item?.createdDate || null;
}


import type { Item } from '@core/public';
import { dayjs, timeToMinutes, deriveDurationFromRange, deriveStartFromEndAndDuration } from '@core/public';
import { splitTaskIntoDayBlocks } from '@core/public';

export type { TimelineTask, TaskBlock } from '@core/public';
import type { TimelineTask } from '@core/public';

// TimelineTask / TaskBlock 已在 core/types/timeline.ts 定义并在此文件 re-export。

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 从 Item 对象解析出一致的时间信息
 */
function parseAllTimes(item: Item): { startMinute: number | null; duration: number | null; endMinute: number | null } {
    const startMinute = item.startTime ? timeToMinutes(item.startTime) : null;
    const explicitEndMinute = item.endTime ? timeToMinutes(item.endTime) : null;
    const duration = item.duration ?? null;

    if (startMinute !== null && item.startTime && item.endTime) {
        const normalizedDuration = deriveDurationFromRange(item.startTime, item.endTime);
        if (normalizedDuration !== null) {
            return {
                startMinute,
                duration: normalizedDuration,
                endMinute: startMinute + normalizedDuration,
            };
        }
    }

    if (startMinute !== null && duration !== null && duration >= 0) {
        return { startMinute, duration, endMinute: startMinute + duration };
    }

    if (explicitEndMinute !== null && duration !== null && duration >= 0 && item.endTime) {
        const derivedStart = deriveStartFromEndAndDuration(item.endTime, duration);
        const derivedStartMinute = derivedStart ? timeToMinutes(derivedStart) : null;
        if (derivedStartMinute !== null) {
            return { startMinute: derivedStartMinute, duration, endMinute: derivedStartMinute + duration };
        }
    }

    return { startMinute: null, duration: null, endMinute: null };
}

/**
 * 从原始任务文本中提取纯净的显示文本
 */
function extractPureText(rawText: string): string {
    return rawText
        .replace(/<!--[\s\S]*?-->/g, '') // [核心修复] 恢复此行，移除 HTML 注释
        .replace(/[\(\[]\s*(时间|结束|时长)::.*?[\)\]]/g, '') // 移除所有时间相关标签
        .replace(/#[\p{L}\d\-_/]+/gu, '') // 移除 tags
        .replace(/✅?\s*\d{4}-\d{2}-\d{2}/g, '') // 移除完成日期
        .replace(/[\(\[]\s*🔁\s*.*?\s*[\)\]]/gi, '') // 移除重复任务
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * 过滤并转换原始 Item 为 TimelineTask
 */
export function processItemsToTimelineTasks(items: Item[]): TimelineTask[] {
    const timelineTasks: TimelineTask[] = [];

    for (const item of items) {
        const fileName = item.file?.basename || item.filename || '';
        if (!fileName) continue;

        // 检查是否为已完成的任务（支持新旧格式）
        const isCompletedTask = item.categoryKey?.endsWith('/done') || 
                               item.categoryKey?.endsWith('/cancelled') || 
                               item.categoryKey === '完成任务';
        if (item.type !== 'task' || !isCompletedTask) continue;

        const { startMinute, duration, endMinute } = parseAllTimes(item);

        if (startMinute !== null && duration !== null && endMinute !== null && item.doneDate) {
            
            const anchorDate = item.doneDate || item.date;
            if (!anchorDate) continue;
            const actualStartDate = dayjs(anchorDate).format(DATE_FORMAT);

            timelineTasks.push({
                ...item,
                startMinute,
                duration,
                endMinute,
                pureText: extractPureText(item.content),
                fileName: fileName,
                actualStartDate: actualStartDate,
            });
        }
    }
    return timelineTasks;
}

/**
 * 将单个任务（可能跨天）拆分为多个按天对齐的 TaskBlock
 */
// splitTaskIntoDayBlocks 已迁移至 core（唯一真源）
// timeline-parser 仅做 re-export，保留对外调用点稳定。
export { splitTaskIntoDayBlocks };
