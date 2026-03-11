import type { Item } from '@core/public';
import type { ProgressResult, ProgressBreakdownRow } from './types';

export interface ProgressComputationOptions {
  basePoints: number;
  levelStep: number;
  includedCategories?: string[];
  ratingBonusThreshold?: number;
  ratingBonusPoints?: number;
  topN?: number;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toSortedRows(map: Map<string, { points: number; count: number }>, topN: number): ProgressBreakdownRow[] {
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, points: v.points, count: v.count }))
    .sort((a, b) => (b.points - a.points) || (b.count - a.count) || a.key.localeCompare(b.key, 'zh-CN'))
    .slice(0, topN);
}

export function computeProgression(items: Item[], options: ProgressComputationOptions): ProgressResult {
  const {
    basePoints = 1,
    levelStep = 20,
    includedCategories = [],
    ratingBonusThreshold = 4,
    ratingBonusPoints = 1,
    topN = 5,
  } = options;

  const allowed = new Set((includedCategories || []).filter(Boolean));
  const categoryMap = new Map<string, { points: number; count: number }>();
  const themeMap = new Map<string, { points: number; count: number }>();

  let totalPoints = 0;
  let matchedCount = 0;

  for (const item of items) {
    const category = (item.categoryKey || '').split('/')[0] || item.categoryKey || '未分类';
    if (allowed.size > 0 && !allowed.has(category)) continue;

    let points = basePoints;
    if (typeof item.rating === 'number' && item.rating >= ratingBonusThreshold) {
      points += ratingBonusPoints;
    }

    totalPoints += points;
    matchedCount += 1;

    const catRow = categoryMap.get(category) || { points: 0, count: 0 };
    catRow.points += points;
    catRow.count += 1;
    categoryMap.set(category, catRow);

    const theme = item.theme || '未设置主题';
    const themeRow = themeMap.get(theme) || { points: 0, count: 0 };
    themeRow.points += points;
    themeRow.count += 1;
    themeMap.set(theme, themeRow);
  }

  const safeLevelStep = Math.max(1, levelStep);
  const level = Math.floor(totalPoints / safeLevelStep) + 1;
  const currentLevelStart = (level - 1) * safeLevelStep;
  const nextLevelPoints = level * safeLevelStep;
  const currentLevelPoints = totalPoints - currentLevelStart;
  const progressRatio = clampProgress(currentLevelPoints / safeLevelStep);

  return {
    totalPoints,
    level,
    currentLevelPoints,
    nextLevelPoints,
    progressRatio,
    matchedCount,
    categoryBreakdown: toSortedRows(categoryMap, topN),
    themeBreakdown: toSortedRows(themeMap, topN),
  };
}
