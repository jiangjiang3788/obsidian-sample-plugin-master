import type { ProgressViewConfig } from '../types';

export const PROGRESS_VIEW_DEFAULT_CONFIG: ProgressViewConfig = {
  mode: 'goal',
  metric: 'recordCount',
  statusFilter: ['active', 'paused'],
  basePoints: 1,
  levelStep: 20,
  includedCategories: [],
  ratingBonusThreshold: 4,
  ratingBonusPoints: 1,
  showThemeBreakdown: true,
  showCategoryBreakdown: true,
  topN: 5,
};
