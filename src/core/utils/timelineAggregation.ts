// src/core/utils/timelineAggregation.ts
import { dayjs } from '@core/utils/date';
import { normalizeGoalPath, UNASSIGNED_GOAL_KEY } from '@core/goal/public';
import type { TaskBlock, TimelineTask } from '@core/types/timeline';

/** Timeline aggregation is keyed directly by canonical Goal path. */
export function getTimelineGoalKey(task: Pick<TimelineTask, 'goalPath'>): string {
    return normalizeGoalPath(String(task.goalPath || '').trim()) || UNASSIGNED_GOAL_KEY;
}

/** Build month/week summaries keyed by Goal path, plus untracked clock time. */
export function buildMonthlyAndWeeklySummary(
    timelineTasks: TimelineTask[],
    untrackedLabel: string,
): any[] {
    const data: any[] = [];
    if (!timelineTasks?.length) return data;

    const validTasks = timelineTasks.filter((task) => dayjs(task.doneDate).isValid());
    if (!validTasks.length) return data;
    const taskDates = validTasks.map((task) => dayjs(task.doneDate));
    const minDate = taskDates.reduce((min, d) => d.isBefore(min) ? d : min);
    const maxDate = taskDates.reduce((max, d) => d.isAfter(max) ? d : max);

    let month = minDate.startOf('month');
    const end = maxDate.endOf('month');
    while (month.isBefore(end) || month.isSame(end, 'month')) {
        const monthStr = month.format('YYYY-MM');
        const tasksInMonth = validTasks.filter((task) => dayjs(task.doneDate).format('YYYY-MM') === monthStr);
        const monthlySummary: Record<string, number> = {};
        let totalTrackedHoursInMonth = 0;

        for (const task of tasksInMonth) {
            const goalKey = getTimelineGoalKey(task);
            const durationHours = Number(task.duration || 0) / 60;
            monthlySummary[goalKey] = (monthlySummary[goalKey] || 0) + durationHours;
            totalTrackedHoursInMonth += durationHours;
        }

        const daysInMonth = month.daysInMonth();
        const untrackedHoursInMonth = Math.max(0, daysInMonth * 24 - totalTrackedHoursInMonth);
        if (untrackedHoursInMonth > 0.01) monthlySummary[untrackedLabel] = untrackedHoursInMonth;

        const weeklySummaries = Array.from({ length: 5 }).map((_, index) => {
            const weekStartDay = index * 7 + 1;
            if (weekStartDay > daysInMonth) return null;
            const weeklySummary: Record<string, number> = {};
            let totalTrackedHoursInWeek = 0;
            for (const task of tasksInMonth) {
                const taskDay = dayjs(task.doneDate).date();
                if (taskDay < weekStartDay || taskDay >= weekStartDay + 7) continue;
                const goalKey = getTimelineGoalKey(task);
                const durationHours = Number(task.duration || 0) / 60;
                weeklySummary[goalKey] = (weeklySummary[goalKey] || 0) + durationHours;
                totalTrackedHoursInWeek += durationHours;
            }
            if (totalTrackedHoursInWeek < 0.01) return null;
            const daysInSlice = Math.min(7, daysInMonth - weekStartDay + 1);
            const untrackedHours = Math.max(0, daysInSlice * 24 - totalTrackedHoursInWeek);
            if (untrackedHours > 0.01) weeklySummary[untrackedLabel] = untrackedHours;
            return { summary: weeklySummary, totalHours: daysInSlice * 24 };
        });

        data.push({ month: monthStr, monthlySummary, totalMonthHours: daysInMonth * 24, weeklySummaries });
        month = month.add(1, 'month');
    }
    return data;
}

/** Build current-range tracked hours keyed by Goal path, plus untracked clock time. */
export function buildSummaryGoalHours(
    timelineTasks: TimelineTask[],
    dateRange: [Date, Date],
    untrackedLabel: string,
): Record<string, number> {
    const viewStart = dayjs(dateRange[0]);
    const viewEnd = dayjs(dateRange[1]);
    const tasksInRange = timelineTasks.filter((task) => dayjs(task.doneDate).isBetween(viewStart, viewEnd, 'day', '[]'));
    const hours: Record<string, number> = {};
    let totalTrackedHours = 0;
    for (const task of tasksInRange) {
        const goalKey = getTimelineGoalKey(task);
        const durationHours = Number(task.duration || 0) / 60;
        hours[goalKey] = (hours[goalKey] || 0) + durationHours;
        totalTrackedHours += durationHours;
    }
    const dayCount = dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'day') + 1;
    const untrackedHours = Math.max(0, dayCount * 24 - totalTrackedHours);
    if (untrackedHours > 0.01) hours[untrackedLabel] = untrackedHours;
    return hours;
}

/** Build a single day's tracked hours keyed by Goal path. */
export function buildDailyGoalHours(
    blocks: TaskBlock[],
    untrackedLabel: string,
): { goalHours: Record<string, number>; totalDayHours: number } {
    const hours: Record<string, number> = {};
    let trackedHours = 0;
    for (const block of blocks) {
        const goalKey = getTimelineGoalKey(block);
        const duration = (block.blockEndMinute - block.blockStartMinute) / 60;
        hours[goalKey] = (hours[goalKey] || 0) + duration;
        trackedHours += duration;
    }
    const untrackedHours = Math.max(0, 24 - trackedHours);
    if (untrackedHours > 0.01) hours[untrackedLabel] = untrackedHours;
    return { goalHours: hours, totalDayHours: Math.max(24, trackedHours) };
}
