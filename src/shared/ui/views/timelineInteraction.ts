// src/features/views/timelineInteraction.ts
//
// Timeline 视图的“UI 交互”逻辑：
// - 依赖 obsidian UI（Notice / App）
// - 依赖 app/actions 的 record UI actions
//
// 这部分逻辑不属于 core：
// core 只负责可推演的纯计算；交互/弹窗属于 features 层。

import type { TaskBlock } from '@core/public';
import type { UiPort } from '@core/public';
import { openCreateFromTimeline } from '@/app/actions/recordUiActions';

interface CreateTaskOptions {
  app: any;
  uiPort: UiPort;
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
  openCreateFromTimeline({
    app: options.app,
    uiPort: options.uiPort,
    inputBlocks: options.inputBlocks,
    hourHeight: options.hourHeight,
    dayBlocks: options.dayBlocks,
    day,
    event: e,
  });
}
