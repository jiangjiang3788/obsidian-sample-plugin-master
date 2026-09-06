// src/core/utils/timelineBlocks.ts
//
// Timeline 领域的“纯时间拆分”逻辑：
// - 不依赖 features（UI/解析层）
// - 由 core 掌握唯一真源，features 只能复用/组合

import type { TimelineTask, TaskBlock } from '@core/types/timeline';
import { dayjs } from '@core/utils/date';

const DATE_FORMAT = 'YYYY-MM-DD';

/** 将一个完整逻辑 Timeline range 拆成自然日切片，同时标记真正的首/尾边界。 */
export function splitTaskIntoDayBlocks(
  task: TimelineTask,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs]
): TaskBlock[] {
  const blocks: TaskBlock[] = [];
  if (!task.doneDate) return [];

  if (task.timelineSource === 'task-point' || !task.timelineRange.end) {
    const pointDate = dayjs(task.actualStartDate);
    if (pointDate.isBefore(dateRange[0], 'day') || pointDate.isAfter(dateRange[1], 'day')) return [];
    const minute = task.startMinute % 1440;
    return [{
      ...task,
      day: pointDate.format(DATE_FORMAT),
      blockStartMinute: minute,
      blockEndMinute: minute,
      isRangeStart: true,
      isRangeEnd: true,
    }];
  }

  let currentDate = dayjs(task.actualStartDate);
  let currentStartMinute = task.startMinute % 1440;
  let remainingDuration = task.duration;
  let elapsedDuration = 0;

  while (remainingDuration > 0 && currentDate.isBefore(dateRange[1].add(1, 'day'))) {
    const dayStr = currentDate.format(DATE_FORMAT);
    const minutesInDay = Math.min(1440 - currentStartMinute, remainingDuration);
    const isRangeStart = elapsedDuration === 0;
    const isRangeEnd = remainingDuration <= minutesInDay;

    if (!currentDate.isBefore(dateRange[0], 'day')) {
      const blockStartMinute = currentStartMinute;
      const blockEndMinute = Math.min(1440, currentStartMinute + remainingDuration);
      if (blockStartMinute < blockEndMinute) {
        blocks.push({
          ...task,
          day: dayStr,
          blockStartMinute,
          blockEndMinute,
          isRangeStart,
          isRangeEnd,
        });
      }
    }

    remainingDuration -= minutesInDay;
    elapsedDuration += minutesInDay;
    currentStartMinute = 0;
    currentDate = currentDate.add(1, 'day');
  }

  return blocks;
}
