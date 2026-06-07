import type { GoalDefinition, ThemeDefinition, Item } from '@core/public';
import { PROGRESS_VIEW_DEFAULT_CONFIG, buildGoalBuckets, computeProgression, getItemGoalKey } from '@core/public';

export interface GoalProgressCardModel {
  key: string;
  title: string;
  goalPath: string;
  icon?: string | null;
  itemCount: number;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  levelStep: number;
  progressRatio: number;
  matchedCount: number;
  latestDate?: string | null;
  blockCounts: Record<string, number>;
  categoryBreakdown: Array<{ key: string; points: number; count: number }>;
  themeBreakdown: Array<{ key: string; points: number; count: number }>;
}

function normalizeBlockKey(item: Item): string {
  const raw = String((item as any).coreBlock || item.categoryKey || item.type || '').replace(/^core\./, '').trim();
  if (!raw) return 'unknown';
  const map: Record<string, string> = {
    '任务': 'task',
    '计划': 'plan',
    '总结': 'review',
    '打卡': 'habit',
    '阻碍项': 'blocker',
    '里程碑': 'milestone',
    '思考': 'thought',
    '事件': 'evidence',
  };
  return map[raw] || raw.split('/')[0] || raw;
}

function itemDateValue(item: Item): string {
  return String(item.date || item.doneDate || item.dueDate || item.createdDate || item.modified || item.created || '');
}

export function buildProgressViewModel(args: { items: Item[]; module: any; goals?: GoalDefinition[]; themes?: ThemeDefinition[] }) {
  const { items, module, goals = [], themes = [] } = args;
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...(module?.viewConfig || {}), mode: 'goal' };
  const buckets = buildGoalBuckets(items, goals, { includeUnassigned: false, includeKnownGoals: false, themes });
  const levelStep = Math.max(1, Number(config.levelStep) || 20);

  const cards: GoalProgressCardModel[] = buckets.map((bucket) => {
    const goalItems = (items || []).filter((item) => getItemGoalKey(item, goals) === bucket.name);
    const progression = computeProgression(goalItems, {
      basePoints: config.basePoints,
      levelStep,
      includedCategories: config.includedCategories,
      ratingBonusThreshold: config.ratingBonusThreshold,
      ratingBonusPoints: config.ratingBonusPoints,
      topN: config.topN,
    });

    const blockCounts: Record<string, number> = {};
    for (const item of goalItems) {
      const key = normalizeBlockKey(item);
      blockCounts[key] = (blockCounts[key] || 0) + 1;
    }

    const sortedDates = goalItems
      .map(itemDateValue)
      .filter(Boolean)
      .sort();
    const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

    return {
      key: bucket.name,
      title: bucket.alias || bucket.name,
      goalPath: bucket.goalPath || bucket.name,
      icon: bucket.icon || null,
      itemCount: goalItems.length,
      totalPoints: progression.totalPoints,
      level: progression.level,
      currentLevelPoints: progression.currentLevelPoints,
      nextLevelPoints: progression.nextLevelPoints,
      levelStep,
      progressRatio: progression.progressRatio,
      matchedCount: progression.matchedCount,
      latestDate,
      blockCounts,
      categoryBreakdown: progression.categoryBreakdown,
      themeBreakdown: progression.themeBreakdown,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.itemCount - a.itemCount || a.title.localeCompare(b.title, 'zh-CN'));

  const topN = Math.max(0, Number(config.topN) || 0);
  const visibleCards = topN > 0 ? cards.slice(0, topN) : cards;

  return {
    config,
    mode: 'goal',
    goalCards: visibleCards,
    summary: {
      goalCount: visibleCards.length,
      totalPoints: visibleCards.reduce((sum, card) => sum + card.totalPoints, 0),
      totalItems: visibleCards.reduce((sum, card) => sum + card.itemCount, 0),
    },
    result: null,
  };
}
