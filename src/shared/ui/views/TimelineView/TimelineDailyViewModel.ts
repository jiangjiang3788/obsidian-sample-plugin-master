import type { TaskBlock } from '@core/types/public';
import type { DailyViewData } from './TimelineViewView';

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

export function buildTimelineTimeAxisRows(maxHours: number, hourHeight: number): TimelineTimeAxisRowModel[] {
  return Array.from({ length: Math.max(0, maxHours) + 1 }, (_, hour) => ({
    hour,
    label: hour > 0 && hour % 2 === 0 ? `${hour}:00` : '',
    height: `${hourHeight}px`,
  }));
}
