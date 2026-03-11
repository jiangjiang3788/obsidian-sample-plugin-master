import type { Item } from '@core/public';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/public';
import { computeProgression } from '@/features/progression/computeProgression';

export function buildProgressViewModel(args: { items: Item[]; module: any }) {
  const { items, module } = args;
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...(module?.viewConfig || {}) };
  const result = computeProgression(items, {
    basePoints: config.basePoints,
    levelStep: config.levelStep,
    includedCategories: config.includedCategories,
    ratingBonusThreshold: config.ratingBonusThreshold,
    ratingBonusPoints: config.ratingBonusPoints,
    topN: config.topN,
  });
  return { config, result };
}
