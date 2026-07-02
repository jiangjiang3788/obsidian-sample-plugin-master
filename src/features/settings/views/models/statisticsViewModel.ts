import { type GoalDefinition, type GoalBucket, buildGoalBuckets, getItemGoalKey, getItemThemeKey } from '@core/goal/public';
import type { ThemeDefinition, Item, ViewInstance } from '@core/types/public';
import type { StatisticsViewConfig } from '@core/view/public';
import {
  dayjs,
  type PeriodData,
  getWeeksInYear,
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  aggregateByQuarter,
  aggregateByYear,
  createPeriodData,
} from '@core/utils/public';
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';
export type StatisticsDateLike = ReturnType<typeof dayjs>;

export interface StatisticsViewModel {
  startDate: StatisticsDateLike;
  endDate: StatisticsDateLike;
  isYearView: boolean;
  year: number;
  filteredCategories: GoalBucket[];
  categoryOrder: string[];
  yearlyWeekStructure: { month: number; weeks: number[] }[];
  processedData: {
    yearData: PeriodData;
    quartersData: PeriodData[];
    monthsData: PeriodData[];
    weeksData: PeriodData[];
  };
  viewConfig: StatisticsViewConfig;
  bucketAccessor: (item: Item) => string;
  goalThemeSummaries: Array<{ goalPath: string; themes: Array<{ themePath: string; label: string; count: number }> }>;
}

/**
 * Statistics 严格沿用原 Day / Week / Month / Quarter / Year 结构，
 * 但统计维度从“分类”收敛为“目标”。时间周期仍由外部控制栏传入。
 */
export function buildStatisticsViewModel(args: {
  items: Item[];
  dateRange: [Date, Date];
  module: ViewInstance;
  currentView: StatisticsCurrentView;
  selectedCategories?: string[];
  goals?: GoalDefinition[];
  themes?: ThemeDefinition[];
}): StatisticsViewModel {
  const { items, dateRange, module, currentView, goals = [], themes = [] } = args;

  const viewConfig = { ...DEFAULT_CONFIG, ...(module?.viewConfig || {}), groupBy: 'goal' } as StatisticsViewConfig;
  const goalBuckets = buildGoalBuckets(items, goals, { includeUnassigned: true, includeKnownGoals: false, themes });
  const bucketAccessor = (item: Item) => getItemGoalKey(item, goals);
  const topN = Math.max(0, Number(viewConfig.topN) || 0);
  const themeCountByGoal = new Map<string, Map<string, number>>();
  for (const item of items || []) {
    const goalKey = bucketAccessor(item);
    const themeKey = getItemThemeKey(item);
    const inner = themeCountByGoal.get(goalKey) || new Map<string, number>();
    inner.set(themeKey, (inner.get(themeKey) || 0) + 1);
    themeCountByGoal.set(goalKey, inner);
  }

  // 目标顺序由 settings.goalSettings.goals 决定，buildGoalBuckets 已统一排序。
  // 视图只能裁剪 topN，不能再按记录数量重排。
  const filteredCategories = [...goalBuckets]
    .slice(0, topN || undefined);
  const categoryOrder = filteredCategories.map((bucket) => bucket.name);
  const goalThemeSummaries = filteredCategories.map((bucket) => {
    const inner = themeCountByGoal.get(bucket.name) || new Map<string, number>();
    const themes = Array.from(inner.entries())
      .map(([themePath, count]) => {
        const parts = String(themePath || '').split('/').filter(Boolean);
        return { themePath, label: parts[parts.length - 1] || themePath || '未设置主题', count };
      })
      .sort((a, b) => b.count - a.count || a.themePath.localeCompare(b.themePath, 'zh-CN'))
      .slice(0, 3);
    return { goalPath: bucket.name, themes };
  });


  const startDate = dayjs(dateRange[0]);
  const endDate = dayjs(dateRange[1]);

  const isYearView = currentView === '年';
  const year = startDate.year();
  const yearlyWeekStructure = (() => {
    if (!isYearView) return [];
    const months: { month: number; weeks: number[] }[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      weeks: [],
    }));
    const totalWeeks = getWeeksInYear(year);
    for (let week = 1; week <= totalWeeks; week++) {
      const thursdayOfWeek = dayjs().year(year).isoWeek(week).day(4);
      const monthIndex = thursdayOfWeek.month();
      months[monthIndex]?.weeks.push(week);
    }
    return months;
  })();

  const processedData = (() => {
    if (!isYearView) {
      return { yearData: createPeriodData(filteredCategories), quartersData: [], monthsData: [], weeksData: [] };
    }

    const totalWeeks = getWeeksInYear(year);
    const targetDate = dayjs().year(year);
    const usePeriod = Boolean(viewConfig.usePeriodField);

    const yearData = aggregateByYear(items, filteredCategories, targetDate, usePeriod, bucketAccessor);

    const quartersData: PeriodData[] = [];
    for (let q = 1; q <= 4; q++) {
      quartersData.push(aggregateByQuarter(items, filteredCategories, targetDate.quarter(q), usePeriod, bucketAccessor));
    }

    const monthsData: PeriodData[] = [];
    for (let m = 0; m < 12; m++) {
      monthsData.push(aggregateByMonth(items, filteredCategories, targetDate.month(m), usePeriod, bucketAccessor));
    }

    const weeksData: PeriodData[] = [];
    for (let w = 1; w <= totalWeeks; w++) {
      weeksData.push(aggregateByWeek(items, filteredCategories, targetDate.isoWeek(w), usePeriod, bucketAccessor));
    }

    return { yearData, quartersData, monthsData, weeksData };
  })();

  void aggregateByDay;

  return {
    startDate,
    endDate,
    isYearView,
    year,
    filteredCategories,
    categoryOrder,
    yearlyWeekStructure,
    processedData,
    viewConfig,
    bucketAccessor,
    goalThemeSummaries,
  };
}
