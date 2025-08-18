// src/features/dashboard/views/timeline/timeline-parser.ts
import { Item } from '@core/domain/schema';
import dayjs from 'dayjs';

/**
 * 增强后的任务项，包含用于时间轴视图的额外信息
 */
export interface TimelineTask extends Item {
  startMinute: number;
  endMinute: number;
  duration: number;
  pureText: string;
  actualStartDate: string; // 任务真实的开始日期
}

/**
 * 表示在时间轴上渲染的单个任务块，可能是一个跨天任务的一部分
 */
export interface TaskBlock extends TimelineTask {
  day: string; // YYYY-MM-DD
  blockStartMinute: number;
  blockEndMinute: number;
}

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 从任务文本中解析 [时间:: HH:mm] 和 [时长:: mm]
 * @param rawText - 原始任务文本
 * @returns 解析出的开始分钟数、时长和结束分钟数
 */
function parseTimeAndDuration(rawText: string): { startMinute: number | null; duration: number | null; endMinute: number | null } {
  const timeMatch = rawText.match(/[\(\[]\s*时间::\s*([0-2]?\d:[0-5]\d)\s*[\)\]]/);
  const durationMatch = rawText.match(/[\(\[]\s*时长::\s*(\d+)\s*[\)\]]/);

  let startMinute: number | null = null;
  let duration: number | null = null;
  let endMinute: number | null = null;

  if (timeMatch) {
    const [h, m] = timeMatch[1].split(':').map(Number);
    startMinute = h * 60 + m;
  }
  if (durationMatch) {
    duration = parseInt(durationMatch[1], 10);
  }
  if (startMinute !== null && duration !== null) {
    endMinute = startMinute + duration;
  }
  return { startMinute, duration, endMinute };
}

/**
 * 从原始任务文本中提取纯净的显示文本
 * @param rawText - 原始任务文本
 * @returns 清理后的任务标题
 */
function extractPureText(rawText: string): string {
  return rawText
    .replace(/<!--[\s\S]*?-->/g, '') // 移除 HTML 注释
    .replace(/[\(\[]\s*时间::\s*([0-2]?\d:[0-5]\d)\s*[\)\]]/g, '')
    .replace(/[\(\[]\s*时长::\s*(\d+)\s*[\)\]]/g, '')
    .replace(/#[\p{L}\d\-_/]+/gu, '') // 移除 tags
    .replace(/✅?\s*\d{4}-\d{2}-\d{2}/g, '') // 移除完成日期
    .replace(/[\(\[]\s*🔁\s*.*?\s*[\)\]]/gi, '') // 移除重复任务
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 过滤并转换原始 Item 为 TimelineTask
 * @param items - 从 DataStore 获取的原始 Item 数组
 * @returns 只包含有效时间信息的 TimelineTask 数组
 */
export function processItemsToTimelineTasks(items: Item[]): TimelineTask[] {
  const timelineTasks: TimelineTask[] = [];

  for (const item of items) {
    const fileName = item.file?.basename || item.filename || '';
    if (!fileName) continue;

    if (item.type !== 'task' || !item.categoryKey?.endsWith('/done')) continue;

    const { startMinute, duration, endMinute } = parseTimeAndDuration(item.content);

    if (startMinute !== null && duration !== null && endMinute !== null && item.doneDate) {
      
      const doneDate = dayjs(item.doneDate);
      const daysSpanned = Math.floor(startMinute / 1440);
      const actualStartDate = doneDate.subtract(daysSpanned, 'day').format(DATE_FORMAT);

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
 * @param task - 一个 TimelineTask
 * @param dateRange - [startDate, endDate]，用于确定拆分范围
 * @returns 拆分后的 TaskBlock 数组
 */
export function splitTaskIntoDayBlocks(task: TimelineTask, dateRange: [dayjs.Dayjs, dayjs.Dayjs]): TaskBlock[] {
  const blocks: TaskBlock[] = [];
  if (task.startMinute === null || task.endMinute === null || !task.doneDate) {
    return [];
  }

  let currentDate = dayjs(task.actualStartDate);
  let currentStartMinute = task.startMinute % 1440;
  let remainingDuration = task.duration;
  
  while (remainingDuration > 0 && currentDate.isBefore(dateRange[1].add(1, 'day'))) {
    const dayStr = currentDate.format(DATE_FORMAT);

    if (currentDate.isBefore(dateRange[0], 'day')) {
        const minutesInDay = Math.min(1440 - currentStartMinute, remainingDuration);
        remainingDuration -= minutesInDay;
        currentStartMinute = 0;
        currentDate = currentDate.add(1, 'day');
        continue;
    }
    
    const blockStartMinute = currentStartMinute;
    const blockEndMinute = Math.min(1440, currentStartMinute + remainingDuration);

    if (blockStartMinute < blockEndMinute) {
      blocks.push({
        ...task,
        day: dayStr,
        blockStartMinute: blockStartMinute,
        blockEndMinute: blockEndMinute,
      });
    }

    const durationInDay = blockEndMinute - blockStartMinute;
    remainingDuration -= durationInDay;
    currentStartMinute = 0;
    currentDate = currentDate.add(1, 'day');
  }

  return blocks;
}