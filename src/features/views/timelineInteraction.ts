// src/features/views/timelineInteraction.ts
//
// Timeline 视图的“UI 交互”逻辑：
// - 依赖 obsidian UI（Notice / App）
// - 依赖 features UI（QuickInputModal）
//
// 这部分逻辑不属于 core：
// core 只负责可推演的纯计算；交互/弹窗属于 features 层。

import { App, Notice } from 'obsidian';
import { minutesToTime } from '@core/public';
import type { TaskBlock } from '@core/public';
import { QuickInputModal } from '@features/quickinput/QuickInputModal';

interface CreateTaskOptions {
  app: App;
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
  const { app, inputBlocks, hourHeight, dayBlocks } = options;

  if (!inputBlocks || inputBlocks.length === 0) {
    new Notice('没有可用的Block模板，请先在设置中创建一个。');
    return;
  }

  // 查找任务模板
  let taskBlock = inputBlocks.find((b: any) => b.name === 'Task' || b.name === '任务');
  if (!taskBlock) {
    taskBlock = inputBlocks[0];
  }

  // 计算点击位置
  const targetEl = e.currentTarget as HTMLElement;
  const rect = targetEl.getBoundingClientRect();

  let clientY = 0;
  if ('touches' in e) {
    clientY = (e as TouchEvent).touches[0].clientY;
  } else {
    clientY = (e as MouseEvent).clientY;
  }

  const y = clientY - rect.top;
  const clickedMinute = Math.floor((y / hourHeight) * 60);

  // 查找前后任务块
  const prevBlock = dayBlocks.filter((b) => b.blockEndMinute <= clickedMinute).pop();
  const nextBlock = dayBlocks.find((b) => b.blockStartMinute >= clickedMinute);

  // 构建上下文
  const context: Record<string, any> = { 日期: day };
  if (prevBlock) {
    context['时间'] = minutesToTime(prevBlock.blockEndMinute);
  } else {
    context['时间'] = minutesToTime(clickedMinute);
  }
  if (nextBlock) {
    context['结束'] = minutesToTime(nextBlock.blockStartMinute);
  }

  new QuickInputModal(app, taskBlock.id, context).open();
}
