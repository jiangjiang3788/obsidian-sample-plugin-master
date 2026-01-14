// src/features/dashboard/views/timeline/timeline-parser.ts
//
// 注意：timeline 的“类型形状”不再由 features 定义。
// 这里仅保留解析/拆分的实现；类型来自 core（唯一真源）。

import type { Item } from '@/core/types/schema';
import { dayjs, timeToMinutes } from '@core/utils/date';
import { splitTaskIntoDayBlocks } from '@core/utils/timelineBlocks';

export type { TimelineTask, TaskBlock } from '@core/types/timeline';
import type { TimelineTask } from '@core/types/timeline';

// TimelineTask / TaskBlock 已在 core/types/timeline.ts 定义并在此文件 re-export。

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 从 Item 对象解析出一致的时间信息
 */
function parseAllTimes(item: Item): { startMinute: number | null; duration: number | null; endMinute: number | null } {
    const startMinute = item.startTime ? timeToMinutes(item.startTime) : null;
    const endMinute = item.endTime ? timeToMinutes(item.endTime) : null;
    const duration = item.duration ?? null; // 正确处理undefined情况

    // 优先级 1: 有开始和结束，计算并覆盖时长
    if (startMinute !== null && endMinute !== null) {
        let calculatedDuration = endMinute - startMinute;
        if (calculatedDuration < 0) calculatedDuration += 24 * 60; // 跨天
        return { startMinute, duration: calculatedDuration, endMinute };
    }
    
    // 优先级 2: 有开始和时长，计算结束
    if (startMinute !== null && duration !== null && duration >= 0) {
        return { startMinute, duration, endMinute: startMinute + duration };
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
            
            const doneDate = dayjs(item.doneDate);

            // [上次的正确修改] 修复跨天任务的实际开始日期计算逻辑
            const startOfDayMinute = timeToMinutes(item.startTime || '');
            const endOfDayMinute = timeToMinutes(item.endTime || '');
            const isCrossNight = startOfDayMinute !== null && endOfDayMinute !== null && startOfDayMinute > endOfDayMinute;
            const actualStartDate = isCrossNight 
                ? doneDate.subtract(1, 'day').format(DATE_FORMAT) 
                : doneDate.format(DATE_FORMAT);

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
