// src/core/types/timeline.ts
import type { Item } from './schema';

/**
 * Timeline 视图的领域类型：从完成任务 Item 中提取并规范化后的结构。
 *
 * 这是“结构性唯一真源”：
 * - shared / features / app 之间传递 timeline 数据，都应使用这里的类型；
 * - timeline-parser 仍然可以是实现，但不再拥有“定义类型形状”的权力。
 */

/**
 * 增强后的任务项，包含用于时间轴视图的额外信息。
 */
export interface TimelineTask extends Item {
  startMinute: number;
  endMinute: number;
  duration: number;
  pureText: string;
  /** 任务真实的开始日期（跨夜任务会落到前一天） */
  actualStartDate: string;
}

/**
 * 表示在时间轴上渲染的单个任务块（可能是一个跨天任务的一部分）。
 */
export interface TaskBlock extends TimelineTask {
  /** YYYY-MM-DD */
  day: string;
  blockStartMinute: number;
  blockEndMinute: number;
}
