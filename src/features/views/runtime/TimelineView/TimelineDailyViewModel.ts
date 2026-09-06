import type { TaskBlock } from '@core/types/public';
import { timelineVisibleEndMinute } from '@core/utils/public';
import type { DailyViewData } from './TimelineViewTypes';

export interface TimelineDayColumnModel {
  day: string;
  blocks: TaskBlock[];
}

export interface TimelineTimeAxisRowModel {
  hour: number;
  label: string;
  height: string;
}

export function buildTimelineDayColumns(dailyViewData: DailyViewData): TimelineDayColumnModel[] {
  return dailyViewData.dateRangeDays.map((day: any) => {
    const dayStr = day.format('YYYY-MM-DD');
    return {
      day: dayStr,
      blocks: dailyViewData.blocksByDay[dayStr] || [],
    };
  });
}

/**
 * One row represents one real clock hour. There is no synthetic 25th row.
 * Row 0 is explicitly labelled 00:00 so the natural-day origin is visible.
 */
export function buildTimelineTimeAxisRows(maxHours: number, hourHeight: number): TimelineTimeAxisRowModel[] {
  const visibleEndMinute = timelineVisibleEndMinute(maxHours);
  const hourCount = Math.ceil(visibleEndMinute / 60);
  return Array.from({ length: hourCount }, (_, hour) => {
    const rowStartMinute = hour * 60;
    const rowMinutes = Math.max(0, Math.min(60, visibleEndMinute - rowStartMinute));
    return {
      hour,
      label: hour === 0 || hour % 2 === 0 ? `${String(hour).padStart(2, '0')}:00` : '',
      // The final row can be partial. Its total pixel height must still exactly match
      // the day column height computed from the same visible-minute boundary.
      height: `${(rowMinutes / 60) * hourHeight}px`,
    };
  });
}
