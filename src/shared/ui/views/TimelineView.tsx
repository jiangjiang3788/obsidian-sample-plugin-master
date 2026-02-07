// src/features/views/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback } from 'preact/hooks';
import { Item } from '@core/public';
import { processItemsToTimelineTasks } from './timeline-parser';
import { dayjs } from '@core/public';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/public';
import { App } from 'obsidian';
import { filterByRules } from '@core/public';
import type { UpdateTaskTimeHandler } from '@shared/types/taskTime';

// 导入重构后的组件、工具函数和 hooks
import { 
    ProgressBlock, 
    TimelineSummaryTable, 
    DayColumnHeader, 
    DayColumnBody 
} from '@shared/ui/timeline';
import { 
    buildMonthlyAndWeeklySummary, 
    buildSummaryCategoryHours 
} from '@core/public';
import { buildDailyViewData } from '@core/public';
import { handleTimelineTaskCreation } from './timelineInteraction';
import { useTimelineZoom } from '@core/public';

// 初始化 dayjs 插件
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

interface TimelineViewProps {
    items: Item[];
    dateRange: [Date, Date];
    module: any;
    currentView: '年' | '季' | '月' | '周' | '天';
    app: App;
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
    const inputBlocks = inputSettings?.blocks || [];

    // 配置管理
    const config = useMemo(() => {
        if (timelineModel?.config) return timelineModel.config;
        const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG));
        const userConfig = module.viewConfig || {};
        return { ...defaults, ...userConfig, categories: userConfig.categories || defaults.categories };
    }, [timelineModel, module.viewConfig]);
    
    // 使用缩放 hook
    const { hourHeight, zoomHandlers } = useTimelineZoom({
        defaultHeight: config.defaultHourHeight
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
        for(const categoryName in categoriesConfig) {
            finalColorMap[categoryName] = categoriesConfig[categoryName].color;
        }
        finalColorMap[config.UNTRACKED_LABEL] = "#9ca3af";
        return finalColorMap;
    }, [timelineModel, config.categories, config.UNTRACKED_LABEL]);

    // 计算每日视图数据
    const dailyViewData = useMemo(() => {
        if (timelineModel?.dailyViewData) return timelineModel.dailyViewData;
        return buildDailyViewData(timelineTasks, dateRange);
    }, [timelineModel, timelineTasks, dateRange]);

    // 点击创建任务处理
    const handleColumnClick = useCallback((day: string, e: MouseEvent | TouchEvent) => {
        handleTimelineTaskCreation(day, e, {
            app,
            inputBlocks,
            hourHeight,
            dayBlocks: dailyViewData?.blocksByDay[day] || []
        });
    }, [app, inputBlocks, hourHeight, dailyViewData]);

    // 空数据处理
    if (timelineTasks.length === 0) {
        return <div class="timeline-empty-state">当前范围内没有数据。</div>;
    }
    
        // 年/季视图：使用 TimelineSummaryTable
    // [修复] 必须在组件顶层调用 useMemo，避免切换 年/季/月/周/天 时 Hook 顺序变化导致数据显示错乱
    const isSummaryView = timelineModel?.isSummaryView ?? (currentView === '年' || currentView === '季');
    const summaryData = useMemo<any[]>(() => {
        if (timelineModel?.summaryData) return timelineModel.summaryData;
        if (!isSummaryView) return [];
        const viewStart = dayjs(dateRange[0]);
        const viewEnd = dayjs(dateRange[1]);
        const tasksInRange = timelineTasks.filter(task => {
            const taskDate = dayjs(task.doneDate);
            return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
        });
        return buildMonthlyAndWeeklySummary(tasksInRange, config);
    }, [timelineModel, isSummaryView, timelineTasks, dateRange, config]);

    if (isSummaryView) {
        return (
            <TimelineSummaryTable 
                summaryData={summaryData} 
                colorMap={colorMap} 
                progressOrder={config.progressOrder} 
                untrackedLabel={config.UNTRACKED_LABEL} 
            />
        );
    }

// 计算汇总数据
    const summaryCategoryHours = useMemo(() => {
        if (timelineModel?.summaryCategoryHours) return timelineModel.summaryCategoryHours;
        return buildSummaryCategoryHours(timelineTasks, dateRange, config);
    }, [timelineModel, timelineTasks, dateRange, config]);

    // 天/周/月视图：使用每日时间轴
    const totalSummaryHours = timelineModel?.totalSummaryHours ?? Object.values(summaryCategoryHours || {}).reduce((s, h) => s + h, 0);
    const TIME_AXIS_WIDTH = 90;

    return (
        <div class="timeline-view-wrapper" {...zoomHandlers}>
            <div class="timeline-sticky-header">
                <div class="summary-progress-container" style={{ flex: `0 0 ${TIME_AXIS_WIDTH}px` }}>
                    <div class="summary-title">总结</div>
                    <div class="summary-content">
                        {summaryCategoryHours && totalSummaryHours > 0 && (
                            <ProgressBlock 
                                categoryHours={summaryCategoryHours} 
                                order={config.progressOrder} 
                                totalHours={totalSummaryHours} 
                                colorMap={colorMap} 
                                untrackedLabel={config.UNTRACKED_LABEL} 
                            />
                        )}
                    </div>
                </div>
                {dailyViewData.dateRangeDays.map(day => {
                    const dayStr = day.format('YYYY-MM-DD');
                    const blocks = dailyViewData.blocksByDay[dayStr] || [];
                    return (
                        <DayColumnHeader 
                            key={dayStr} 
                            day={dayStr} 
                            blocks={blocks} 
                            categoriesConfig={config.categories} 
                            colorMap={colorMap} 
                            untrackedLabel={config.UNTRACKED_LABEL} 
                            progressOrder={config.progressOrder} 
                        />
                    );
                })}
            </div>
            
            <div class="timeline-scrollable-body">
                <div class="time-axis" style={{ flex: `0 0 ${TIME_AXIS_WIDTH}px` }}>
                   {Array.from({ length: config.MAX_HOURS_PER_DAY + 1 }, (_, i) => (
                       <div key={i} class="time-axis-hour" style={{ height: `${hourHeight}px` }}>
                           {i > 0 && i % 2 === 0 ? `${i}:00` : ''}
                       </div>
                   ))}
                </div>
                {dailyViewData.dateRangeDays.map(day => {
                    const dayStr = day.format('YYYY-MM-DD');
                    const blocks = dailyViewData.blocksByDay[dayStr] || [];
                    return (
                        <DayColumnBody 
                            key={dayStr} 
                            app={app} 
                            day={dayStr}
                            blocks={blocks} 
                            hourHeight={hourHeight} 
                            categoriesConfig={config.categories} 
                            colorMap={colorMap} 
                            maxHours={config.MAX_HOURS_PER_DAY} 
                            onUpdateTaskTime={onUpdateTaskTime}
                            onColumnClick={handleColumnClick}
                        />
                    );
                })}
            </div>
        </div>
    );
}
