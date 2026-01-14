// src/core/utils/timelineInteraction.ts
//
// 说明：
// - 这个文件曾经混入了 UI/交互逻辑（Notice / QuickInputModal / MouseEvent 等），
//   导致 core 反向依赖 features。
// - 现在交互部分已迁移到 features/views/timelineInteraction.ts。
// - core 仅保留“可推演的纯数据构建”逻辑，作为唯一真源的一部分。

import type { TimelineTask, TaskBlock } from '@core/types/timeline';
import { dayjs } from '@core/utils/date';
import { splitTaskIntoDayBlocks } from '@core/utils/timelineBlocks';

/**
 * 构建每日视图数据
 *
 * 输入：
 * - timelineTasks：已规范化的 TimelineTask 列表
 * - dateRange：视图范围（起止日期）
 *
 * 输出：
 * - dateRangeDays：范围内的每一天（dayjs 对象）
 * - blocksByDay：按 YYYY-MM-DD 分组后的 TaskBlock 列表（已按 startMinute 排序）
 */
export function buildDailyViewData(timelineTasks: TimelineTask[], dateRange: [Date, Date]) {
  const start = dayjs(dateRange[0]);
  const end = dayjs(dateRange[1]);
  const diff = end.diff(start, 'day');
  const dateRangeDays = Array.from({ length: diff + 1 }, (_, i) => start.add(i, 'day'));
  const map: Record<string, TaskBlock[]> = {};
  const range: [dayjs.Dayjs, dayjs.Dayjs] = [start, end];

  dateRangeDays.forEach((d) => {
    map[d.format('YYYY-MM-DD')] = [];
  });

  for (const task of timelineTasks) {
    const blocks = splitTaskIntoDayBlocks(task, range);
    for (const block of blocks) {
      if (map[block.day]) map[block.day].push(block);
    }
  }

  Object.values(map).forEach((dayBlocks) => {
    dayBlocks.sort((a, b) => a.blockStartMinute - b.blockStartMinute);
  });

  return { dateRangeDays, blocksByDay: map };
}
