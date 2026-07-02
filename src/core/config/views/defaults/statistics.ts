import type { StatisticsViewConfig } from '../types';

export const STATISTICS_VIEW_DEFAULT_CONFIG: StatisticsViewConfig = {
  groupBy: 'goal',
  metric: 'recordCount',
  chartType: 'bar',
  goalPath: '',
  topN: 10,
  categories: [],
  displayMode: 'smart',
  minVisibleHeight: 15,
  usePeriodField: false,
};
