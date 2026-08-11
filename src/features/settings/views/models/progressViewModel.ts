import type { GoalDefinition } from '@core/goal/public';
import type { ThemeDefinition, Item } from '@core/types/public';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { buildGoalBuckets, getItemGoalKey } from '@core/goal/public';
import { computeProgression } from '@core/progression/public';
import { isEnergyItem } from '@core/energy/public';

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
  recentRecords: Array<{ id: string; title: string; date?: string | null; item: Item }>;
}

interface ProgressViewModuleLike {
  viewConfig?: Partial<typeof PROGRESS_VIEW_DEFAULT_CONFIG>;
}

const BLOCK_KEY_ALIASES: Record<string, string> = {
  '任务': 'task',
  '计划': 'plan',
  '总结': 'review',
  '打卡': 'habit',
  '阻碍项': 'blocker',
  '里程碑': 'milestone',
  '思考': 'thought',
  '事件': 'evidence',
};

function normalizeBlockKey(item: Item): string {
  const raw = String(item.coreBlock || '').replace(/^core\./, '').trim();
  if (!raw) return 'unknown';
  return BLOCK_KEY_ALIASES[raw] || raw.split('/')[0] || raw;
}

function itemDateValue(item: Item): string {
  return String(item.date || item.doneDate || item.dueDate || item.createdDate || item.modified || item.created || '');
}

function buildProgressRecentRecords(items: Item[], limit: number = 5): GoalProgressCardModel['recentRecords'] {
  return [...items]
    .sort((left, right) => itemDateValue(right).localeCompare(itemDateValue(left)))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title || item.content || item.file?.basename || item.filename || '未命名记录',
      date: itemDateValue(item) || null,
      item,
    }));
}

export function buildProgressViewModel(args: { items: Item[]; module: ProgressViewModuleLike; goals?: GoalDefinition[]; themes?: ThemeDefinition[] }) {
  const { items, module, goals = [], themes = [] } = args;
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...(module?.viewConfig || {}), mode: 'goal' as const, metric: 'recordCount' as const };
  const buckets = buildGoalBuckets(items, goals, { includeUnassigned: false, includeKnownGoals: false, themes });
  const levelStep = Math.max(1, Number(config.levelStep) || 20);

  const cards: GoalProgressCardModel[] = buckets.map((bucket) => {
    const goalItems = (items || []).filter((item) => getItemGoalKey(item, goals) === bucket.name);
    const progressItems = goalItems.filter((item) => !isEnergyItem(item));
    const progression = computeProgression(progressItems, {
      basePoints: config.basePoints,
      levelStep,
      includedCategories: config.includedCategories,
      ratingBonusThreshold: config.ratingBonusThreshold,
      ratingBonusPoints: config.ratingBonusPoints,
      topN: config.topN,
    });

    const blockCounts: Record<string, number> = {};
    for (const item of progressItems) {
      const key = normalizeBlockKey(item);
      blockCounts[key] = (blockCounts[key] || 0) + 1;
    }

    const sortedDates = progressItems
      .map(itemDateValue)
      .filter(Boolean)
      .sort();
    const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

    return {
      key: bucket.name,
      title: bucket.alias || bucket.name,
      goalPath: bucket.goalPath || bucket.name,
      icon: bucket.icon || null,
      itemCount: progressItems.length,
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
      recentRecords: buildProgressRecentRecords(progressItems),
    };
  });

  const topN = Math.max(0, Number(config.topN) || 0);
  const visibleCards = topN > 0 ? cards.slice(0, topN) : cards;

  return {
    config,
    mode: 'goal' as const,
    goalCards: visibleCards,
    summary: {
      goalCount: visibleCards.length,
      totalPoints: visibleCards.reduce((sum, card) => sum + card.totalPoints, 0),
      totalItems: visibleCards.reduce((sum, card) => sum + card.itemCount, 0),
    },
    result: null,
  };
}
