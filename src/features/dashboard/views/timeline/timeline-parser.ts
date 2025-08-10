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
}

/**
 * 表示在时间轴上渲染的单个任务块，可能是一个跨天任务的一部分
 */
export interface TaskBlock extends TimelineTask {
  day: string; // YYYY-MM-DD
  blockStartMinute: number;
  blockEndMinute: number;
}

/**
 * 新的分类配置结构，用于 `viewConfig.categories`
 */
export interface CategoryConfig { // 导出这个接口以便其他地方使用
    color: string;
    files: string[]; // 文件名或路径前缀数组
}
export type CategoriesMap = Record<string, CategoryConfig>; // 导出这个类型


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
    // 确保 item.file.basename 存在，用于分类映射
    const fileName = item.file?.basename || item.filename || '';
    if (!fileName) continue; // 如果没有文件名，则跳过

    if (item.type !== 'task' || !item.categoryKey?.endsWith('/done')) continue;

    const { startMinute, duration, endMinute } = parseTimeAndDuration(item.content);

    if (startMinute !== null && duration !== null && endMinute !== null && item.doneDate) {
      timelineTasks.push({
        ...item,
        startMinute,
        duration,
        endMinute,
        pureText: extractPureText(item.content),
        // 添加 fileName 到 TimelineTask，方便后续分类映射
        fileName: fileName,
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

  const baseDate = dayjs(task.doneDate);
  let currentStartMinute = task.startMinute;
  let remainingDuration = task.duration;
  let currentDate = baseDate;

  while (remainingDuration > 0) {
    const dayStr = currentDate.format(DATE_FORMAT);

    // 如果当前日期在查询范围之外
    if (currentDate.isBefore(dateRange[0], 'day') || currentDate.isAfter(dateRange[1], 'day')) {
        // 如果任务已经进行到范围之后，就可以停止了
        if (currentDate.isAfter(dateRange[1], 'day')) break;

        // 如果任务开始于范围之前，我们需要快进到范围的第一天
        const minutesInDay = Math.min(1440 - currentStartMinute, remainingDuration);
        remainingDuration -= minutesInDay;
        currentStartMinute = 0;
        currentDate = currentDate.add(1, 'day');
        continue;
    }
    
    // 计算当天内的开始和结束分钟数
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

    // 更新剩余时长和下一天的开始时间
    const durationInDay = blockEndMinute - blockStartMinute;
    remainingDuration -= durationInDay;
    currentStartMinute = 0; // 后续天都从 00:00 开始
    currentDate = currentDate.add(1, 'day');
  }

  return blocks;
}

/**
 * 计算给定任务块列表中，每个分类的总时长（小时）
 * @param blocks - TaskBlock 数组
 * @param categories - 新的分类配置对象
 * @param untrackedLabel - 未追踪任务的标签
 * @returns 一个记录 { categoryName: hours } 的对象
 */
export function calculateCategoryHours(blocks: TaskBlock[], categories: CategoriesMap, untrackedLabel: string): Record<string, number> {
    const hoursMap: Record<string, number> = {};

    // 初始化所有已定义分类的时长为 0
    for (const categoryName in categories) {
        hoursMap[categoryName] = 0;
    }
    hoursMap[untrackedLabel] = 0; // 初始化未记录分类

    for (const block of blocks) {
        const durationHours = (block.blockEndMinute - block.blockStartMinute) / 60;
        let foundCategory = false;

        // 遍历配置中的每个分类
        for (const [categoryName, config] of Object.entries(categories)) {
            // 检查任务的文件路径是否匹配该分类下的任何一个文件/前缀
            // 确保 block.fileName 存在
            if (block.fileName && config.files.some(prefix => block.fileName.includes(prefix))) {
                hoursMap[categoryName] = (hoursMap[categoryName] || 0) + durationHours;
                foundCategory = true;
                break; // 找到第一个匹配的分类后就停止，避免重复计算
            }
        }
        // 如果没有找到匹配的分类，则归入“未记录”
        if (!foundCategory) {
          hoursMap[untrackedLabel] = (hoursMap[untrackedLabel] || 0) + durationHours;
        }
    }
    return hoursMap;
}