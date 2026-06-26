// src/features/views/timelineInteraction.ts
//
// Timeline 视图的“UI 交互”逻辑：
// - 不直接依赖 app/actions
// - 只把 Timeline 点击转换为 feature/app 层注入的创建回调

import type { TaskBlock } from '@core/public';
import type { OpenTimelineCreateHandler } from '../../types/actions';

interface CreateTaskOptions {
  onCreateFromTimeline: OpenTimelineCreateHandler;
  inputBlocks: any[];
  hourHeight: number;
  dayBlocks: TaskBlock[];
}

/**
 * 处理时间轴上的点击创建任务
 */
export function handleTimelineTaskCreation(
  day: string,
  e: MouseEvent | TouchEvent,
  options: CreateTaskOptions
) {
  options.onCreateFromTimeline({
    inputBlocks: options.inputBlocks,
    hourHeight: options.hourHeight,
    dayBlocks: options.dayBlocks,
    day,
    event: e,
  });
}
