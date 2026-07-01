import type { CategoryConfig } from '@core/view/public';
import type { Item } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import { aggregateByMonth, getMonthWeeksData, isSameIsoWeek } from '@core/utils/public';

export interface MonthStatisticsWeekModel {
  key: string;
  gridColumn: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'week'; week: number; year: number; goal: string };
}

export interface MonthStatisticsRenderModel {
  monthData: PeriodData;
  monthLabel: string;
  monthIdentifier: (goal: string) => { type: 'month'; month: number; year: number; goal: string };
  gridTemplateColumns: string;
  weeks: MonthStatisticsWeekModel[];
}

export function buildMonthWeekMeta(monthDate: any): Array<{ weekStart: any; label: string }> {
  const monthStart = monthDate.startOf('month');
  const monthEnd = monthDate.endOf('month');
  const weeksMeta: Array<{ weekStart: any; label: string }> = [];
  let weekCursor = monthStart.startOf('isoWeek');

  while (weekCursor.isBefore(monthEnd) || isSameIsoWeek(weekCursor, monthEnd)) {
    const weekStart = weekCursor;
    const weekEnd = weekStart.endOf('isoWeek');
    weeksMeta.push({
      weekStart,
      label: `${weekStart.format('MM-DD')} ~ ${weekEnd.format('MM-DD')}`,
    });
    weekCursor = weekCursor.add(1, 'week');
  }

  return weeksMeta;
}

export function buildMonthStatisticsRenderModel(input: {
  items: Item[];
  categories: CategoryConfig[];
  monthDate: any;
  usePeriod: boolean;
  bucketAccessor?: (item: Item) => string;
}): MonthStatisticsRenderModel {
  const { items, categories, monthDate, usePeriod, bucketAccessor } = input;
  const monthData = aggregateByMonth(items, categories, monthDate, usePeriod, bucketAccessor);
  const monthWeeksData = getMonthWeeksData(items, categories, monthDate, usePeriod, bucketAccessor);
  const weeksMeta = buildMonthWeekMeta(monthDate);
  const weeks = monthWeeksData.flatMap((data, index): MonthStatisticsWeekModel[] => {
    const meta = weeksMeta[index];
    if (!meta) return [];
    const { weekStart } = meta;
    return [{
      key: weekStart.format('YYYY-MM-DD'),
      gridColumn: `${index + 1}`,
      label: `W${weekStart.isoWeek()}`,
      data,
      identifier: (goal: string) => ({
        type: 'week',
        week: weekStart.isoWeek(),
        year: weekStart.isoWeekYear(),
        goal,
      }),
    }];
  });

  return {
    monthData,
    monthLabel: monthDate.format('YYYY年MM月'),
    monthIdentifier: (goal: string) => ({
      type: 'month',
      month: monthDate.month() + 1,
      year: monthDate.year(),
      goal,
    }),
    gridTemplateColumns: `repeat(${monthWeeksData.length}, 1fr)`,
    weeks,
  };
}
