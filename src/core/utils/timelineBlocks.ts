// src/core/utils/timelineBlocks.ts
//
// Timeline 领域的“纯时间拆分”逻辑：
// - 不依赖 features（UI/解析层）
// - 由 core 掌握唯一真源，features 只能复用/组合

import type { TimelineTask, TaskBlock } from '@core/types/timeline';
import { dayjs } from '@core/utils/date';

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 将单个任务（可能跨天）拆分为多个按天对齐的 TaskBlock。
 *
 * 这段逻辑属于“可推演的纯计算”：
 * - 输入：task（已规范化）、dateRange（视图范围）
 * - 输出：按天切片后的 blocks（用于渲染/聚合）
 */
export function splitTaskIntoDayBlocks(
  task: TimelineTask,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs]
): TaskBlock[] {
  const blocks: TaskBlock[] = [];

  // TimelineTask 逻辑上应当具备 doneDate，但类型层面仍允许 optional；这里做防御式保护。
  if (!task.doneDate) return [];

  let currentDate = dayjs(task.actualStartDate);
  let currentStartMinute = task.startMinute % 1440;
  let remainingDuration = task.duration;

  while (remainingDuration > 0 && currentDate.isBefore(dateRange[1].add(1, 'day'))) {
    const dayStr = currentDate.format(DATE_FORMAT);

    // 如果任务块在当前视图范围之前，快速跳过
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
        blockStartMinute,
        blockEndMinute,
      });
    }

    const durationInDay = blockEndMinute - blockStartMinute;
    remainingDuration -= durationInDay;
    currentStartMinute = 0;
    currentDate = currentDate.add(1, 'day');
  }

  return blocks;
}
