import type { RecordViewItem, ViewInstance } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import type { CategoryConfig, StatisticsViewConfig } from '@core/view/public';
import {
  aggregateByMonth,
  aggregateByQuarter,
  aggregateByWeek,
  aggregateByYear,
  createPeriodData,
  dayjs,
  getWeeksInYear,
} from '@core/utils/public';
import type { GoalDefinition } from '@core/goal/public';
import { buildGoalBuckets, getItemRootGoalKey } from '@core/goal/public';
import { STATISTICS_VIEW_DEFAULT_CONFIG } from '@core/view/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';
export type StatisticsDateLike = ReturnType<typeof dayjs>;

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

export interface StatisticsRuntimeModel {
  viewConfig: StatisticsViewConfig;
  startDate: StatisticsDateLike;
  isYearView: boolean;
  year: number;
  bucketAccessor: (item: RecordViewItem) => string;
  yearlyWeekStructure: StatisticsYearlyWeekMonth[];
  filteredCategories: CategoryConfig[];
}

export function buildStatisticsViewConfig(module: ViewInstance): StatisticsViewConfig {
  return ({ ...STATISTICS_VIEW_DEFAULT_CONFIG, ...module.viewConfig, groupBy: 'goal' } as StatisticsViewConfig);
}

export function resolveStatisticsStartDate(dateRange: [Date, Date]): StatisticsDateLike {
  return dayjs(dateRange[0]);
}

export function isStatisticsYearView(currentView: StatisticsCurrentView): boolean {
  return currentView === '年';
}

export function resolveStatisticsYear(startDate: StatisticsDateLike): number {
  return startDate.year();
}

export function resolveStatisticsBucketAccessor(goals: GoalDefinition[] = []): (item: RecordViewItem) => string {
  return (item: RecordViewItem) => getItemRootGoalKey(item, goals);
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

export function resolveYearlyWeekStructure(input: { year: number; isYearView: boolean }): StatisticsYearlyWeekMonth[] {
  return buildYearlyWeekStructure(input.year, input.isYearView);
}


export function buildStatisticsGoalBuckets(args: {
  items: RecordViewItem[];
  goals?: GoalDefinition[];
  topN?: number;
}): CategoryConfig[] {
  // Statistics is intentionally a strategic overview: child Goal records roll up to
  // their root Goal instead of expanding every leaf into a separate chart category.
  const buckets = buildGoalBuckets(args.items, args.goals || [], {
    includeUnassigned: true,
    includeKnownGoals: true,
    level: 'root',
  });
  const topN = Math.max(0, Number(args.topN) || 0);
  return topN > 0 ? buckets.slice(0, topN) : buckets;
}

export function buildStatisticsProcessedData(input: {
  isYearView: boolean;
  items: RecordViewItem[];
  year: number;
  filteredCategories: CategoryConfig[];
  usePeriod: boolean;
  bucketAccessor?: (item: RecordViewItem) => string;
}): StatisticsPeriodDataModel {
  const bucketAccessor = input.bucketAccessor || getItemRootGoalKey;
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
