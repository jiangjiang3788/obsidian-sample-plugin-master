import type { CategoryConfig } from '@core/view/public';
import type { RecordViewItem } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import { aggregateByMonth, aggregateByQuarter, getMonthWeeksData, isSameIsoWeek } from '@core/utils/public';

export interface QuarterStatisticsWeekModel {
  key: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'week'; week: number; year: number; goal: string };
}

export interface QuarterStatisticsMonthModel {
  key: string;
  gridColumn: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'month'; month: number; year: number; goal: string };
  weeks: QuarterStatisticsWeekModel[];
  placeholderCount: number;
}

export interface QuarterStatisticsRenderModel {
  quarterData: PeriodData;
  quarterLabel: string;
  quarterIdentifier: (goal: string) => { type: 'quarter'; quarter: number; year: number; goal: string };
  months: QuarterStatisticsMonthModel[];
}

export function buildQuarterMonthWeekStarts(month: any): any[] {
  const monthStart = month.startOf('month');
  const monthEnd = month.endOf('month');
  const weeksMeta: any[] = [];
  let weekCursor = monthStart.startOf('isoWeek');
  while (weekCursor.isBefore(monthEnd) || isSameIsoWeek(weekCursor, monthEnd)) {
    weeksMeta.push(weekCursor);
    weekCursor = weekCursor.add(1, 'week');
  }
  return weeksMeta;
}

export function buildQuarterStatisticsRenderModel(input: {
  items: RecordViewItem[];
  categories: CategoryConfig[];
  quarterDate: any;
  usePeriod: boolean;
  bucketAccessor?: (item: RecordViewItem) => string;
}): QuarterStatisticsRenderModel {
  const { items, categories, quarterDate, usePeriod, bucketAccessor } = input;
  const quarterStart = quarterDate.startOf('quarter');
  const rawMonths = Array.from({ length: 3 }, (_, index) => {
    const month = quarterStart.add(index, 'month');
    const weeksData = getMonthWeeksData(items, categories, month, usePeriod, bucketAccessor);
    const weekStarts = buildQuarterMonthWeekStarts(month);
    return {
      month,
      data: aggregateByMonth(items, categories, month, usePeriod, bucketAccessor),
      weeksData,
      weekStarts,
    };
  });
  const maxWeeks = Math.max(...rawMonths.map((month) => month.weeksData.length), 1);

  return {
    quarterData: aggregateByQuarter(items, categories, quarterDate, usePeriod, bucketAccessor),
    quarterLabel: `${quarterDate.format('YYYY年')} 第${quarterDate.quarter()}季度`,
    quarterIdentifier: (goal: string) => ({
      type: 'quarter',
      quarter: quarterDate.quarter(),
      year: quarterDate.year(),
      goal,
    }),
    months: rawMonths.map(({ month, data, weeksData, weekStarts }, index) => ({
      key: month.format('YYYY-MM'),
      gridColumn: `${index + 1}`,
      label: month.format('MM月'),
      data,
      identifier: (goal: string) => ({
        type: 'month',
        month: month.month() + 1,
        year: month.year(),
        goal,
      }),
      weeks: weeksData.flatMap((weekData, weekIndex): QuarterStatisticsWeekModel[] => {
        const weekStart = weekStarts[weekIndex];
        if (!weekStart) return [];
        return [{
          key: weekStart.format('YYYY-MM-DD'),
          label: `W${weekStart.isoWeek()}`,
          data: weekData,
          identifier: (goal: string) => ({
            type: 'week',
            week: weekStart.isoWeek(),
            year: weekStart.isoWeekYear(),
            goal,
          }),
        }];
      }),
      placeholderCount: Math.max(maxWeeks - weeksData.length, 0),
    })),
  };
}
