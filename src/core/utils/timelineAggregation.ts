// src/core/utils/timelineAggregation.ts
import { dayjs } from '@core/utils/date';
import { TaskBlock } from '@features/views/timeline-parser';

/**
 * 将任务文件名映射到分类
 */
export function mapTaskToCategory(
    taskFileName: string,
    categoriesConfig: Record<string, { files?: string[]; color?: string }>
): string {
    if (!taskFileName || !categoriesConfig) return taskFileName;
    
    for (const categoryName in categoriesConfig) {
        const categoryInfo = categoriesConfig[categoryName];
        if (categoryInfo.files && categoryInfo.files.some(fileKey => taskFileName.includes(fileKey))) {
            return categoryName;
        }
    }
    return taskFileName;
}

/**
 * 构建月度和周度汇总数据
 * 用于年/季视图的 TimelineSummaryTable
 */
export function buildMonthlyAndWeeklySummary(
    timelineTasks: any[],
    config: {
        categories: Record<string, { files?: string[]; color?: string }>;
        UNTRACKED_LABEL: string;
    }
): any[] {
    const data: any[] = [];
    
    if (!timelineTasks || timelineTasks.length === 0) {
        return data;
    }
    
    // 找出任务的时间范围
    const taskDates = timelineTasks.map(t => dayjs(t.doneDate));
    const minDate = taskDates.reduce((min, d) => d.isBefore(min) ? d : min);
    const maxDate = taskDates.reduce((max, d) => d.isAfter(max) ? d : max);
    
    let month = minDate.startOf('month');
    const end = maxDate.endOf('month');
    
    while (month.isBefore(end) || month.isSame(end, 'month')) {
        const monthStr = month.format('YYYY-MM');
        const tasksInMonth = timelineTasks.filter(t => 
            dayjs(t.doneDate).format('YYYY-MM') === monthStr
        );
        
        // 月度汇总
        const monthlySummary: Record<string, number> = {};
        let totalTrackedHoursInMonth = 0;
        
        tasksInMonth.forEach(task => {
            const category = mapTaskToCategory(task.fileName || '', config.categories);
            const durationHours = task.duration / 60;
            monthlySummary[category] = (monthlySummary[category] || 0) + durationHours;
            totalTrackedHoursInMonth += durationHours;
        });
        
        const daysInMonth = month.daysInMonth();
        const untrackedHoursInMonth = Math.max(0, daysInMonth * 24 - totalTrackedHoursInMonth);
        if (untrackedHoursInMonth > 0.01) {
            monthlySummary[config.UNTRACKED_LABEL] = untrackedHoursInMonth;
        }
        
        if (Object.keys(monthlySummary).length > 0) {
            // 周度汇总（最多5周）
            const weeklySummaries = Array.from({ length: 5 }).map((_, i) => {
                const weekStartDay = i * 7 + 1;
                if (weekStartDay > daysInMonth) return null;
                
                const weeklySummary: Record<string, number> = {};
                let totalTrackedHoursInWeek = 0;
                
                tasksInMonth.forEach(task => {
                    const taskDay = dayjs(task.doneDate).date();
                    if (taskDay >= weekStartDay && taskDay < weekStartDay + 7) {
                        const category = mapTaskToCategory(task.fileName || '', config.categories);
                        const durationHours = task.duration / 60;
                        weeklySummary[category] = (weeklySummary[category] || 0) + durationHours;
                        totalTrackedHoursInWeek += durationHours;
                    }
                });
                
                if (totalTrackedHoursInWeek < 0.01) return null;
                
                const daysInThisWeekSlice = Math.min(7, daysInMonth - weekStartDay + 1);
                const untrackedHoursInWeek = Math.max(0, daysInThisWeekSlice * 24 - totalTrackedHoursInWeek);
                if (untrackedHoursInWeek > 0.01) {
                    weeklySummary[config.UNTRACKED_LABEL] = untrackedHoursInWeek;
                }
                
                return {
                    summary: weeklySummary,
                    totalHours: daysInThisWeekSlice * 24,
                };
            });
            
            data.push({
                month: monthStr,
                monthlySummary,
                totalMonthHours: daysInMonth * 24,
                weeklySummaries,
            });
        }
        
        month = month.add(1, 'month');
    }
    
    return data;
}

/**
 * 构建当前视图范围的分类小时汇总
 * 用于日/周/月视图的汇总条
 */
export function buildSummaryCategoryHours(
    timelineTasks: any[],
    dateRange: [Date, Date],
    config: {
        categories: Record<string, { files?: string[]; color?: string }>;
        UNTRACKED_LABEL: string;
    }
): Record<string, number> {
    const viewStart = dayjs(dateRange[0]);
    const viewEnd = dayjs(dateRange[1]);
    
    const tasksInCurrentRange = timelineTasks.filter(task => {
        const taskDate = dayjs(task.doneDate);
        return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
    });
    
    const hours: Record<string, number> = {};
    let totalTrackedHours = 0;
    
    tasksInCurrentRange.forEach(task => {
        const category = mapTaskToCategory(task.fileName || '', config.categories);
        const durationHours = task.duration / 60;
        hours[category] = (hours[category] || 0) + durationHours;
        totalTrackedHours += durationHours;
    });
    
    const dayCount = dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'day') + 1;
    const untrackedHours = Math.max(0, dayCount * 24 - totalTrackedHours);
    if (untrackedHours > 0.01) {
        hours[config.UNTRACKED_LABEL] = untrackedHours;
    }
    
    return hours;
}

/**
 * 构建单日的分类小时汇总
 * 用于 DayColumnHeader 的进度条
 */
export function buildDailyCategoryHours(
    blocks: TaskBlock[],
    categoriesConfig: Record<string, { files?: string[]; color?: string }>,
    untrackedLabel: string
): { categoryHours: Record<string, number>; totalDayHours: number } {
    const hours: Record<string, number> = {};
    let trackedHours = 0;
    
    blocks.forEach((block: TaskBlock) => {
        const category = mapTaskToCategory(block.fileName || '', categoriesConfig);
        const duration = (block.blockEndMinute - block.blockStartMinute) / 60;
        hours[category] = (hours[category] || 0) + duration;
        trackedHours += duration;
    });
    
    const untrackedHours = Math.max(0, 24 - trackedHours);
    if (untrackedHours > 0.01) {
        hours[untrackedLabel] = untrackedHours;
    }
    
    return {
        categoryHours: hours,
        totalDayHours: Math.max(24, trackedHours),
    };
}
