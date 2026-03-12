import {
  Item,
  dayjs,
  getWeeksInYear,
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  aggregateByQuarter,
  aggregateByYear,
  createPeriodData,
  STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG,
} from '@core/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';

export interface StatisticsViewModel {
  startDate: any;
  endDate: any;
  isYearView: boolean;
  year: number;
  filteredCategories: any[];
  categoryOrder: string[];
  yearlyWeekStructure: { month: number; weeks: number[] }[];
  processedData: {
    yearData: any;
    quartersData: any[];
    monthsData: any[];
    weeksData: any[];
  };
  viewConfig: any;
}

/**
 * Phase2 shared/ui 纯化：把 StatisticsView 的“过滤分类/年结构/聚合数据生成”上移到 feature 层。
 */
export function buildStatisticsViewModel(args: {
  items: Item[];
  dateRange: [Date, Date];
  module: any;
  currentView: StatisticsCurrentView;
  selectedCategories?: string[];
}): StatisticsViewModel {
  const { items, dateRange, module, currentView, selectedCategories } = args;

  const viewConfig = { ...DEFAULT_CONFIG, ...(module?.viewConfig || {}) };
  const categoryConfigs = (viewConfig.categories || []) as any[];
  const categoryOrder = categoryConfigs.map((c: any) => c.name);

  const filteredCategories = (() => {
    if (!selectedCategories || selectedCategories.length === 0) return categoryConfigs;
    return categoryConfigs.filter((c: any) => selectedCategories.includes(c.name));
  })();

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

    const yearData = aggregateByYear(items, filteredCategories, targetDate, usePeriod);

    const quartersData: any[] = [];
    for (let q = 1; q <= 4; q++) {
      quartersData.push(aggregateByQuarter(items, filteredCategories, targetDate.quarter(q), usePeriod));
    }

    const monthsData: any[] = [];
    for (let m = 0; m < 12; m++) {
      monthsData.push(aggregateByMonth(items, filteredCategories, targetDate.month(m), usePeriod));
    }

    const weeksData: any[] = [];
    for (let w = 1; w <= totalWeeks; w++) {
      weeksData.push(aggregateByWeek(items, filteredCategories, targetDate.isoWeek(w), usePeriod));
    }

    return { yearData, quartersData, monthsData, weeksData };
  })();

  // 非年视图的聚合仍由 shared/ui 按当前逻辑渲染（后续可继续 viewModel 化）
  // 这里只负责把“年视图最重的一块”先上移。
  void aggregateByDay;
  void aggregateByWeek;
  void aggregateByMonth;
  void aggregateByQuarter;

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
  };
}
