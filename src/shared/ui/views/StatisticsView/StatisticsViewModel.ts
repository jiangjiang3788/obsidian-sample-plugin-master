import type { Item, ViewInstance } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import {
  aggregateByMonth,
  aggregateByQuarter,
  aggregateByWeek,
  aggregateByYear,
  createPeriodData,
  dayjs,
  getWeeksInYear,
} from '@core/utils/public';
import { getItemGoalKey } from '@core/goal/public';
import { STATISTICS_VIEW_DEFAULT_CONFIG } from '@core/view/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';

export interface StatisticsPeriodDataModel {
  yearData: PeriodData;
  quartersData: PeriodData[];
  monthsData: PeriodData[];
  weeksData: PeriodData[];
}

export interface StatisticsYearlyWeekMonth {
  month: number;
  weeks: number[];
}

export function buildStatisticsViewConfig(module: ViewInstance, statisticsModel?: any): any {
  return statisticsModel?.viewConfig ?? ({ ...STATISTICS_VIEW_DEFAULT_CONFIG, ...module.viewConfig } as any);
}

export function resolveStatisticsStartDate(dateRange: [Date, Date], statisticsModel?: any): any {
  return statisticsModel?.startDate ?? dayjs(dateRange[0]);
}

export function isStatisticsYearView(currentView: StatisticsCurrentView, statisticsModel?: any): boolean {
  return statisticsModel?.isYearView ?? currentView === '年';
}

export function resolveStatisticsYear(startDate: any, statisticsModel?: any): number {
  return statisticsModel?.year ?? startDate.year();
}

export function resolveStatisticsBucketAccessor(statisticsModel?: any): (item: Item) => string {
  return statisticsModel?.bucketAccessor || getItemGoalKey;
}

export function buildYearlyWeekStructure(year: number, enabled = true): StatisticsYearlyWeekMonth[] {
  if (!enabled) return [];
  const months: StatisticsYearlyWeekMonth[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, weeks: [] }));
  const totalWeeks = getWeeksInYear(year);

  for (let week = 1; week <= totalWeeks; week++) {
    const thursdayOfWeek = dayjs().year(year).isoWeek(week).day(4);
    months[thursdayOfWeek.month()]?.weeks.push(week);
  }
  return months;
}

export function resolveYearlyWeekStructure(input: {
  year: number;
  isYearView: boolean;
  statisticsModel?: any;
}): StatisticsYearlyWeekMonth[] {
  if (input.statisticsModel?.yearlyWeekStructure) return input.statisticsModel.yearlyWeekStructure;
  return buildYearlyWeekStructure(input.year, input.isYearView);
}

export function buildStatisticsProcessedData(input: {
  isYearView: boolean;
  items: Item[];
  year: number;
  filteredCategories: any[];
  usePeriod: boolean;
  bucketAccessor?: (item: Item) => string;
}): StatisticsPeriodDataModel {
  const bucketAccessor = input.bucketAccessor || getItemGoalKey;
  if (!input.isYearView) {
    return {
      yearData: createPeriodData(input.filteredCategories),
      quartersData: [],
      monthsData: [],
      weeksData: [],
    };
  }

  const totalWeeks = getWeeksInYear(input.year);
  const targetDate = dayjs().year(input.year);
  const yearData = aggregateByYear(input.items, input.filteredCategories, targetDate, input.usePeriod, bucketAccessor);
  const quartersData: PeriodData[] = [];
  for (let q = 1; q <= 4; q++) {
    quartersData.push(aggregateByQuarter(input.items, input.filteredCategories, targetDate.quarter(q), input.usePeriod, bucketAccessor));
  }

  const monthsData: PeriodData[] = [];
  for (let m = 0; m < 12; m++) {
    monthsData.push(aggregateByMonth(input.items, input.filteredCategories, targetDate.month(m), input.usePeriod, bucketAccessor));
  }

  const weeksData: PeriodData[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    weeksData.push(aggregateByWeek(input.items, input.filteredCategories, targetDate.isoWeek(w), input.usePeriod, bucketAccessor));
  }

  return { yearData, quartersData, monthsData, weeksData };
}

export function getStatisticsPopoverWidgetId(moduleId: string): string {
  return `stats-popover-${moduleId}`;
}

export function isSameStatisticsCell(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
