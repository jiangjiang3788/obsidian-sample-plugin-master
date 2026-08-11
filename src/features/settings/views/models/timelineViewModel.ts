import { Item } from '@core/types/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { buildDailyViewData, buildMonthlyAndWeeklySummary, buildSummaryCategoryHours, dayjs } from '@core/utils/public';
import { processItemsToTimelineTasks } from '@features/settings/views/public';

import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export type TimelineCurrentView = '年' | '季' | '月' | '周' | '天';

export interface TimelineViewModel {
  config: any;
  colorMap: Record<string, string>;
  timelineTasks: any[];
  dailyViewData: any;
  isSummaryView: boolean;
  summaryData: any[];
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
}

/**
 * Phase2 shared/ui 纯化：把 TimelineView 的“过滤/解析/汇总/日列构建”上移到 feature 层。
 * shared/ui 只消费 renderModel + handlers。
 */
export function buildTimelineViewModel(args: {
  items: Item[];
  records?: Item[];
  module: any;
  dateRange: [Date, Date];
  currentView: TimelineCurrentView;
}): TimelineViewModel {
  const { items, records = items, module, dateRange, currentView } = args;

  const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG));
  const userConfig = module?.viewConfig || {};
  const config = { ...defaults, ...userConfig, categories: userConfig.categories || defaults.categories };

  // items 已经由 useViewData/applyViewQueryPipeline 应用 layoutFilters + viewInstance.filters。
  // Timeline 的事实来自 internal TaskSession，但 Session 必须继承可见 Task 的查询边界。
  const visibleTaskIds = new Set(items.filter((item) => item.coreBlock === 'task').map((item) => item.id));
  const timelineRecords = records.filter((record) => (
    (record.coreBlock === 'task' && visibleTaskIds.has(record.id))
    || (record.coreBlock === 'task-session' && !!record.taskId && visibleTaskIds.has(record.taskId))
  ));
  const timelineTasks = processItemsToTimelineTasks(timelineRecords);

  const categoriesConfig = config.categories || {};
  const colorMap: Record<string, string> = {};
  for (const categoryName in categoriesConfig) {
    colorMap[categoryName] = categoriesConfig[categoryName].color;
  }
  colorMap[config.UNTRACKED_LABEL] = '#9ca3af';

  const dailyViewData = buildDailyViewData(timelineTasks, dateRange);

  const isSummaryView = currentView === '年' || currentView === '季';
  const summaryData = (() => {
    if (!isSummaryView) return [];
    const viewStart = dayjs(dateRange[0]);
    const viewEnd = dayjs(dateRange[1]);
    const tasksInRange = timelineTasks.filter((task: any) => {
      const taskDate = dayjs(task.doneDate);
      return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
    });
    return buildMonthlyAndWeeklySummary(tasksInRange, config);
  })();

  const summaryCategoryHours = buildSummaryCategoryHours(timelineTasks, dateRange, config) || {};
  const totalSummaryHours = Object.values(summaryCategoryHours).reduce((s, h) => s + h, 0);

  return {
    config,
    colorMap,
    timelineTasks,
    dailyViewData,
    isSummaryView,
    summaryData,
    summaryCategoryHours,
    totalSummaryHours,
  };
}
