// src/core/utils/timelineAggregation.ts
import { dayjs } from '@core/utils/date';
import { normalizeGoalPath, UNASSIGNED_GOAL_KEY } from '@core/goal/public';
import type { TaskBlock, TimelineTask } from '@core/types/timeline';
import { splitTaskIntoDayBlocks } from './timelineBlocks';

/** Timeline aggregation is keyed directly by canonical Goal path. */
export function getTimelineGoalKey(task: Pick<TimelineTask, 'goalPath'>): string {
    return normalizeGoalPath(String(task.goalPath || '').trim()) || UNASSIGNED_GOAL_KEY;
}

interface TrackedSlice {
    day: string;
    goalKey: string;
    hours: number;
}

/** Use the same day slices as Timeline itself, rather than assigning a whole session to its start date. */
function trackedSlices(tasks: TimelineTask[], range: [dayjs.Dayjs, dayjs.Dayjs]): TrackedSlice[] {
    const result: TrackedSlice[] = [];
    for (const task of tasks) {
        if (task.timelineSource === 'task-plan' || task.timelineSource === 'task-point'
            || !task.actualStartDate || !dayjs(task.actualStartDate).isValid()
            || !Number.isFinite(task.duration) || task.duration <= 0) continue;
        // Old/injected Timeline projections may have a valid start and duration
        // but no explicit range.end. Keep their recorded duration compatible;
        // the day splitter otherwise classifies them as zero-length points.
        const derivedStart = dayjs(`${task.actualStartDate}T00:00:00`).add(task.startMinute, 'minute');
        const withEnd: TimelineTask = task.timelineRange?.end ? task : {
            ...task,
            doneDate: task.doneDate || task.actualStartDate,
            timelineRange: {
                start: task.timelineRange?.start || derivedStart.format('YYYY-MM-DDTHH:mm'),
                end: derivedStart.add(task.duration, 'minute').format('YYYY-MM-DDTHH:mm'),
            },
        };
        const blocks = splitTaskIntoDayBlocks(withEnd, range);
        const goalKey = getTimelineGoalKey(task);
        for (const block of blocks) {
            const minutes = block.blockEndMinute - block.blockStartMinute;
            if (minutes > 0) result.push({ day: block.day, goalKey, hours: minutes / 60 });
        }
    }
    return result;
}

/** Build month/week summaries keyed by Goal path, plus untracked clock time. */
export function buildMonthlyAndWeeklySummary(
    timelineTasks: TimelineTask[],
    untrackedLabel: string,
    dateRange?: [Date, Date],
): any[] {
    const valid = (timelineTasks || []).filter(task => task.actualStartDate && dayjs(task.actualStartDate).isValid());
    if (!valid.length) return [];

    const start = dateRange
        ? dayjs(dateRange[0]).startOf('day')
        : valid.map(task => dayjs(task.actualStartDate)).reduce((min, date) => date.isBefore(min) ? date : min).startOf('day');
    const end = dateRange
        ? dayjs(dateRange[1]).endOf('day')
        : valid.map(task => dayjs(task.actualStartDate).add(Math.max(0, Number(task.duration) || 0), 'minute'))
            .reduce((max, date) => date.isAfter(max) ? date : max).endOf('day');
    if (!start.isValid() || !end.isValid() || start.isAfter(end)) return [];
    const slices = trackedSlices(valid, [start, end]);
    if (!slices.length) return [];
    const sliceMonths = slices.map(slice => slice.day.slice(0, 7));
    let month = dayjs(`${sliceMonths.reduce((min, value) => value < min ? value : min)}-01`);
    const lastMonth = sliceMonths.reduce((max, value) => value > max ? value : max);
    const data: any[] = [];

    while (month.format('YYYY-MM') <= lastMonth) {
        const monthStr = month.format('YYYY-MM');
        const slicesInMonth = slices.filter(slice => slice.day.startsWith(monthStr));
        const monthlySummary: Record<string, number> = {};
        let totalTrackedHoursInMonth = 0;
        for (const slice of slicesInMonth) {
            monthlySummary[slice.goalKey] = (monthlySummary[slice.goalKey] || 0) + slice.hours;
            totalTrackedHoursInMonth += slice.hours;
        }
        const daysInMonth = month.daysInMonth();
        const untrackedHoursInMonth = Math.max(0, daysInMonth * 24 - totalTrackedHoursInMonth);
        if (untrackedHoursInMonth > 0.01) monthlySummary[untrackedLabel] = untrackedHoursInMonth;

        const weeklySummaries = Array.from({ length: 5 }).map((_, index) => {
            const weekStartDay = index * 7 + 1;
            if (weekStartDay > daysInMonth) return null;
            const weeklySummary: Record<string, number> = {};
            let totalTrackedHoursInWeek = 0;
            for (const slice of slicesInMonth) {
                const taskDay = Number(slice.day.slice(-2));
                if (taskDay < weekStartDay || taskDay >= weekStartDay + 7) continue;
                weeklySummary[slice.goalKey] = (weeklySummary[slice.goalKey] || 0) + slice.hours;
                totalTrackedHoursInWeek += slice.hours;
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
    const viewStart = dayjs(dateRange[0]).startOf('day');
    const viewEnd = dayjs(dateRange[1]).endOf('day');
    const hours: Record<string, number> = {};
    let totalTrackedHours = 0;
    for (const slice of trackedSlices(timelineTasks || [], [viewStart, viewEnd])) {
        hours[slice.goalKey] = (hours[slice.goalKey] || 0) + slice.hours;
        totalTrackedHours += slice.hours;
    }
    const dayCount = viewEnd.startOf('day').diff(viewStart, 'day') + 1;
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
