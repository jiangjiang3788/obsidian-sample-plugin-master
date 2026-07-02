import type { Item, TimelineTask, ViewInstance } from '@core/types/public';
import type { TimelineViewConfig } from '@core/view/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import {
  buildDailyViewData,
  buildMonthlyAndWeeklySummary,
  buildSummaryCategoryHours,
  dayjs,
  filterByRules,
} from '@core/utils/public';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { processItemsToTimelineTasks } from '../timeline-parser';
import type { DailyViewData } from './TimelineViewView';

// Timeline fallback model still supports direct shared view mounting, but feature layer should normally inject timelineModel.
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export type TimelineCurrentView = '年' | '季' | '月' | '周' | '天';

export interface TimelineSummaryWeek {
  summary: Record<string, number>;
  totalHours: number;
}

export interface TimelineSummaryRow {
  month: string;
  monthlySummary: Record<string, number>;
  totalMonthHours: number;
  weeklySummaries: Array<TimelineSummaryWeek | null>;
}

export interface TimelineRenderModel {
  config: TimelineViewConfig;
  colorMap: Record<string, string>;
  timelineTasks: TimelineTask[];
  dailyViewData: DailyViewData | null;
  isSummaryView: boolean;
  summaryData: TimelineSummaryRow[];
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
}

export function resolveTimelineConfig(module: ViewInstance, injectedModel?: Partial<TimelineRenderModel>): TimelineViewConfig {
  if (injectedModel?.config) return injectedModel.config;
  const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG)) as TimelineViewConfig;
  const userConfig = (module?.viewConfig || {}) as Partial<TimelineViewConfig>;
  return {
    ...defaults,
    ...userConfig,
    categories: userConfig.categories || defaults.categories,
  };
}

export function buildTimelineColorMap(config: TimelineViewConfig, injectedModel?: Partial<TimelineRenderModel>): Record<string, string> {
  if (injectedModel?.colorMap) return injectedModel.colorMap;
  const colorMap: Record<string, string> = {};
  const categoriesConfig = config?.categories || {};
  for (const categoryName in categoriesConfig) {
    colorMap[categoryName] = categoriesConfig[categoryName].color;
  }
  colorMap[config.UNTRACKED_LABEL] = '#9ca3af';
  return colorMap;
}

export function resolveTimelineTasks(args: {
  items: Item[];
  module: ViewInstance;
  injectedModel?: Partial<TimelineRenderModel>;
}): TimelineTask[] {
  const { items, module, injectedModel } = args;
  if (injectedModel?.timelineTasks) return injectedModel.timelineTasks;
  const filteredItems = module?.filters ? filterByRules(items, module.filters) : items;
  return processItemsToTimelineTasks(filteredItems);
}

export function isTimelineSummaryView(currentView: TimelineCurrentView, injectedModel?: Partial<TimelineRenderModel>): boolean {
  return injectedModel?.isSummaryView ?? (currentView === '年' || currentView === '季');
}

export function buildTimelineSummaryData(args: {
  timelineTasks: TimelineTask[];
  dateRange: [Date, Date];
  config: TimelineViewConfig;
  isSummaryView: boolean;
  injectedModel?: Partial<TimelineRenderModel>;
}): TimelineSummaryRow[] {
  const { timelineTasks, dateRange, config, isSummaryView, injectedModel } = args;
  if (injectedModel?.summaryData) return injectedModel.summaryData;
  if (!isSummaryView) return [];

  const viewStart = dayjs(dateRange[0]);
  const viewEnd = dayjs(dateRange[1]);
  const tasksInRange = timelineTasks.filter((task) => {
    const taskDate = dayjs(task.doneDate);
    return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
  });
  return buildMonthlyAndWeeklySummary(tasksInRange, config) as TimelineSummaryRow[];
}

export function buildTimelineSummaryCategoryHours(args: {
  timelineTasks: TimelineTask[];
  dateRange: [Date, Date];
  config: TimelineViewConfig;
  isSummaryView: boolean;
  injectedModel?: Partial<TimelineRenderModel>;
}): Record<string, number> {
  const { timelineTasks, dateRange, config, isSummaryView, injectedModel } = args;
  if (injectedModel?.summaryCategoryHours) return injectedModel.summaryCategoryHours;
  if (isSummaryView) return {};
  return buildSummaryCategoryHours(timelineTasks, dateRange, config) || {};
}

export function buildTimelineDailyViewData(args: {
  timelineTasks: TimelineTask[];
  dateRange: [Date, Date];
  isSummaryView: boolean;
  injectedModel?: Partial<TimelineRenderModel>;
}): DailyViewData | null {
  const { timelineTasks, dateRange, isSummaryView, injectedModel } = args;
  if (injectedModel?.dailyViewData) return injectedModel.dailyViewData;
  if (isSummaryView) return null;
  return buildDailyViewData(timelineTasks, dateRange);
}

export function sumTimelineSummaryHours(summaryCategoryHours: Record<string, number>, injectedModel?: Partial<TimelineRenderModel>): number {
  return injectedModel?.totalSummaryHours ?? Object.values(summaryCategoryHours || {}).reduce((sum, hours) => sum + Number(hours || 0), 0);
}

export function buildTimelineRenderModel(args: {
  items: Item[];
  module: ViewInstance;
  dateRange: [Date, Date];
  currentView: TimelineCurrentView;
  injectedModel?: Partial<TimelineRenderModel>;
}): TimelineRenderModel {
  const { items, module, dateRange, currentView, injectedModel } = args;
  const config = resolveTimelineConfig(module, injectedModel);
  const timelineTasks = resolveTimelineTasks({ items, module, injectedModel });
  const colorMap = buildTimelineColorMap(config, injectedModel);
  const isSummaryView = isTimelineSummaryView(currentView, injectedModel);
  const summaryData = buildTimelineSummaryData({ timelineTasks, dateRange, config, isSummaryView, injectedModel });
  const summaryCategoryHours = buildTimelineSummaryCategoryHours({ timelineTasks, dateRange, config, isSummaryView, injectedModel });
  const dailyViewData = buildTimelineDailyViewData({ timelineTasks, dateRange, isSummaryView, injectedModel });

  return {
    config,
    colorMap,
    timelineTasks,
    dailyViewData,
    isSummaryView,
    summaryData,
    summaryCategoryHours,
    totalSummaryHours: sumTimelineSummaryHours(summaryCategoryHours, injectedModel),
  };
}
