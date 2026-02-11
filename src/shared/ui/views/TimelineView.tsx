// src/features/views/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback } from 'preact/hooks';
import { useUiPort } from '@/app/public';
import { Item } from '@core/public';
import { processItemsToTimelineTasks } from './timeline-parser';
import { dayjs } from '@core/public';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/public';
import { filterByRules } from '@core/public';
import type { UpdateTaskTimeHandler } from '@shared/types/taskTime';

import { buildMonthlyAndWeeklySummary, buildSummaryCategoryHours } from '@core/public';
import { buildDailyViewData } from '@core/public';
import { handleTimelineTaskCreation } from './timelineInteraction';
import { useTimelineZoom } from '@core/public';

import { TimelineViewView, type DailyViewData } from './timeline/TimelineViewView';

// 初始化 dayjs 插件
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

interface TimelineViewProps {
  items: Item[];
  dateRange: [Date, Date];
  module: any;
  currentView: '年' | '季' | '月' | '周' | '天';
  app: any;
  /** 由 feature 层注入：用于“对齐/精确编辑”等需要写回的操作 */
  onUpdateTaskTime?: UpdateTaskTimeHandler;
  inputSettings: any;
  /** Phase2: feature 层注入的 renderModel（shared/ui 只渲染） */
  timelineModel?: any;
}

export function TimelineView({
  items,
  dateRange,
  module,
  currentView,
  app,
  onUpdateTaskTime,
  inputSettings,
  timelineModel,
}: TimelineViewProps) {
  const uiPort = useUiPort();
  const inputBlocks = inputSettings?.blocks || [];

  // 配置管理
  const config = useMemo(() => {
    if (timelineModel?.config) return timelineModel.config;
    const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG));
    const userConfig = module.viewConfig || {};
    return {
      ...defaults,
      ...userConfig,
      categories: userConfig.categories || defaults.categories,
    };
  }, [timelineModel, module.viewConfig]);

  // 使用缩放 hook
  const { hourHeight, zoomHandlers } = useTimelineZoom({
    defaultHeight: config.defaultHourHeight,
  });

  // 计算 timeline 任务
  const timelineTasks = useMemo(() => {
    if (timelineModel?.timelineTasks) return timelineModel.timelineTasks;
    const filteredItems = module.filters ? filterByRules(items, module.filters) : items;
    return processItemsToTimelineTasks(filteredItems);
  }, [timelineModel, items, module.filters]);

  // 颜色映射
  const colorMap = useMemo(() => {
    if (timelineModel?.colorMap) return timelineModel.colorMap;
    const finalColorMap: Record<string, string> = {};
    const categoriesConfig = config.categories || {};
    for (const categoryName in categoriesConfig) {
      finalColorMap[categoryName] = categoriesConfig[categoryName].color;
    }
    finalColorMap[config.UNTRACKED_LABEL] = '#9ca3af';
    return finalColorMap;
  }, [timelineModel, config.categories, config.UNTRACKED_LABEL]);

  // 年/季视图：汇总表（必须在顶层 useMemo，避免 Hook 顺序变化）
  const isSummaryView = timelineModel?.isSummaryView ?? (currentView === '年' || currentView === '季');

  const summaryData = useMemo<any[]>(() => {
    if (timelineModel?.summaryData) return timelineModel.summaryData;
    if (!isSummaryView) return [];

    const viewStart = dayjs(dateRange[0]);
    const viewEnd = dayjs(dateRange[1]);
    const tasksInRange = timelineTasks.filter((task: any) => {
      const taskDate = dayjs(task.doneDate);
      return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
    });

    return buildMonthlyAndWeeklySummary(tasksInRange, config);
  }, [timelineModel, isSummaryView, timelineTasks, dateRange, config]);

  // 计算汇总数据（天/周/月视图才会用）
  const summaryCategoryHours = useMemo<Record<string, number>>(() => {
    if (timelineModel?.summaryCategoryHours) return timelineModel.summaryCategoryHours;
    if (isSummaryView) return {};
    return buildSummaryCategoryHours(timelineTasks, dateRange, config);
  }, [timelineModel, isSummaryView, timelineTasks, dateRange, config]);

  // 计算每日视图数据（天/周/月视图才会用）
  const dailyViewData = useMemo<DailyViewData | null>(() => {
    if (timelineModel?.dailyViewData) return timelineModel.dailyViewData;
    if (isSummaryView) return null;
    return buildDailyViewData(timelineTasks, dateRange);
  }, [timelineModel, isSummaryView, timelineTasks, dateRange]);

  // 点击创建任务处理（交互逻辑在 container，View 纯渲染）
  const handleColumnClick = useCallback(
    (day: string, e: MouseEvent | TouchEvent) => {
      handleTimelineTaskCreation(day, e, {
        app,
        uiPort,
        inputBlocks,
        hourHeight,
        dayBlocks: dailyViewData?.blocksByDay[day] || [],
      });
    },
    [app, uiPort, inputBlocks, hourHeight, dailyViewData]
  );

  const totalSummaryHours =
    timelineModel?.totalSummaryHours ??
    Object.values(summaryCategoryHours || {}).reduce((s, h) => s + h, 0);

  const TIME_AXIS_WIDTH = 90;

  return (
    <TimelineViewView
      timelineTasksCount={timelineTasks.length}
      isSummaryView={isSummaryView}
      summaryData={summaryData}
      colorMap={colorMap}
      progressOrder={config.progressOrder}
      untrackedLabel={config.UNTRACKED_LABEL}
      zoomHandlers={zoomHandlers}
      timeAxisWidth={TIME_AXIS_WIDTH}
      summaryCategoryHours={summaryCategoryHours}
      totalSummaryHours={totalSummaryHours}
      dailyViewData={dailyViewData}
      categoriesConfig={config.categories}
      hourHeight={hourHeight}
      maxHours={config.MAX_HOURS_PER_DAY}
      app={app}
      onUpdateTaskTime={onUpdateTaskTime}
      onColumnClick={handleColumnClick}
    />
  );
}
