import type { RecordViewItem, TimelineTask, ViewInstance } from '@core/types/public';
import type { TimelineViewConfig } from '@core/view/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import {
  buildDailyViewData,
  buildMonthlyAndWeeklySummary,
  buildSummaryCategoryHours,
  dayjs,
} from '@core/utils/public';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { processItemsToTimelineTasks } from '../timeline-parser';
import type { DailyViewData } from './TimelineViewTypes';

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

export function resolveTimelineConfig(module: ViewInstance): TimelineViewConfig {
  const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG)) as TimelineViewConfig;
  const userConfig = (module?.viewConfig || {}) as Partial<TimelineViewConfig>;
  return { ...defaults, ...userConfig, categories: userConfig.categories || defaults.categories };
}

export function buildTimelineColorMap(config: TimelineViewConfig): Record<string, string> {
  const colorMap: Record<string, string> = {};
  for (const categoryName in config.categories || {}) {
    colorMap[categoryName] = config.categories[categoryName].color;
  }
  colorMap[config.UNTRACKED_LABEL] = '#9ca3af';
  return colorMap;
}

export function resolveTimelineTasks(items: RecordViewItem[], records: RecordViewItem[] = items): TimelineTask[] {
  const visibleTaskIds = new Set(items.filter((item) => item.coreBlock === 'task').map((item) => item.id));
  const timelineRecords = records.filter((record) => (
    (record.coreBlock === 'task' && visibleTaskIds.has(record.id))
    || (record.coreBlock === 'task-session' && !!record.taskId && visibleTaskIds.has(record.taskId))
  ));
  return processItemsToTimelineTasks(timelineRecords);
}


export function buildTimelineSummaryData(args: {
  timelineTasks: TimelineTask[];
  dateRange: [Date, Date];
  config: TimelineViewConfig;
  isSummaryView: boolean;
}): TimelineSummaryRow[] {
  if (!args.isSummaryView) return [];
  const viewStart = dayjs(args.dateRange[0]);
  const viewEnd = dayjs(args.dateRange[1]);
  const tasksInRange = args.timelineTasks.filter((task) => dayjs(task.doneDate).isBetween(viewStart, viewEnd, 'day', '[]'));
  return buildMonthlyAndWeeklySummary(tasksInRange, args.config) as TimelineSummaryRow[];
}

export function buildTimelineRenderModel(args: {
  items: RecordViewItem[];
  records?: RecordViewItem[];
  module: ViewInstance;
  dateRange: [Date, Date];
  currentView: TimelineCurrentView;
}): TimelineRenderModel {
  const { items, records = items, module, dateRange, currentView } = args;
  const config = resolveTimelineConfig(module);
  const timelineTasks = resolveTimelineTasks(items, records);
  const colorMap = buildTimelineColorMap(config);
  const isSummaryView = currentView === '年' || currentView === '季';

  const summaryData = buildTimelineSummaryData({ timelineTasks, dateRange, config, isSummaryView });

  const summaryCategoryHours = isSummaryView ? {} : (buildSummaryCategoryHours(timelineTasks, dateRange, config) || {});
  const dailyViewData = isSummaryView ? null : buildDailyViewData(timelineTasks, dateRange);
  const totalSummaryHours = Object.values(summaryCategoryHours).reduce((sum, hours) => sum + Number(hours || 0), 0);

  return { config, colorMap, timelineTasks, dailyViewData, isSummaryView, summaryData, summaryCategoryHours, totalSummaryHours };
}
