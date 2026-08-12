import type { RecordViewItem, ThemeDefinition, ViewInstance } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import { buildGoalBuckets, getItemGoalKey, getItemThemeKey } from '@core/goal/public';
import { computeProgression } from '@core/progression/public';
import { isEnergyItem } from '@core/energy/public';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { dayjs } from '@core/utils/public';
import { buildGoalEnergySummary, type GoalEnergySummaryModel } from '../models/energySummaryModel';

export interface ProgressBreakdownLike {
  key: string;
  points: number;
  count: number;
}

export interface ProgressRecentRecordModel {
  id: string;
  title: string;
  date?: string | null;
  item: RecordViewItem;
}

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
  categoryBreakdown?: ProgressBreakdownLike[];
  themeBreakdown?: ProgressBreakdownLike[];
  themeRecentRecords?: Record<string, ProgressRecentRecordModel[]>;
  energySummary?: GoalEnergySummaryModel | null;
}

export interface ProgressSummaryModel {
  goalCount: number;
  totalPoints: number;
  totalItems: number;
}

export interface ProgressViewRenderModel {
  config: unknown;
  mode?: 'goal' | 'legacy';
  goalCards?: GoalProgressCardModel[];
  summary?: ProgressSummaryModel;
  result?: unknown;
}

/** Goal-mode builder contract. Unlike the legacy union, these fields always exist. */
export interface ProgressGoalViewRenderModel extends ProgressViewRenderModel {
  mode: 'goal';
  goalCards: GoalProgressCardModel[];
  summary: ProgressSummaryModel;
}

export interface ProgressBlockCountRow {
  key: string;
  label: string;
  count: number;
}

export interface ProgressCollapsedFact {
  key: string;
  label: string;
  value: string | number;
}

export interface ProgressLevelMeta {
  level: number;
  icon: string;
  title: string;
}

export interface ProgressSkillRowModel {
  key: string;
  title: string;
  points: number;
  count: number;
  level: number;
  levelMeta: ProgressLevelMeta;
  progressRatio: number;
  recentRecords: ProgressRecentRecordModel[];
}


const PROGRESS_BLOCK_KEY_ALIASES: Record<string, string> = {
  '任务': 'task', '计划': 'plan', '总结': 'review', '打卡': 'habit',
  '阻碍项': 'blocker', '里程碑': 'milestone', '思考': 'thought', '事件': 'evidence',
};

function normalizeProgressBlockKey(item: RecordViewItem): string {
  const raw = String(item.coreBlock || '').replace(/^core\./, '').trim();
  if (!raw) return 'unknown';
  return PROGRESS_BLOCK_KEY_ALIASES[raw] || raw.split('/')[0] || raw;
}

function progressDateSource(item: RecordViewItem): unknown {
  return item.date || item.doneDate || item.dueDate || item.createdDate || item.modified || item.created || '';
}

function parseProgressDate(value: unknown) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }
  if (typeof value === 'number') {
    const millis = Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = dayjs(millis);
    return parsed.isValid() ? parsed : null;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    const millis = Math.abs(numeric) < 1_000_000_000_000 ? numeric * 1000 : numeric;
    const parsed = dayjs(millis);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(text);
  return parsed.isValid() ? parsed : null;
}

export function formatProgressRecordDate(value: unknown): string {
  const parsed = parseProgressDate(value);
  return parsed ? parsed.format('YYYY-MM-DD') : '';
}

function progressItemDate(item: RecordViewItem): string {
  return formatProgressRecordDate(progressDateSource(item));
}

function progressItemTime(item: RecordViewItem): number {
  return parseProgressDate(progressDateSource(item))?.valueOf() || 0;
}

function buildProgressRecentRecords(items: RecordViewItem[], limit = 5): ProgressRecentRecordModel[] {
  return [...items]
    .sort((left, right) => progressItemTime(right) - progressItemTime(left))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title || item.content || item.file?.basename || item.filename || '未命名记录',
      date: progressItemDate(item) || null,
      item,
    }));
}

export function buildProgressViewRenderModel(args: {
  items: RecordViewItem[];
  module: Pick<ViewInstance, 'viewConfig'>;
  goals?: GoalDefinition[];
  themes?: ThemeDefinition[];
}): ProgressGoalViewRenderModel {
  const { items, module, goals = [], themes = [] } = args;
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...(module?.viewConfig || {}), mode: 'goal' as const, metric: 'recordCount' as const };
  const buckets = buildGoalBuckets(items, goals, { includeUnassigned: false, includeKnownGoals: false, themes });
  const levelStep = Math.max(1, Number(config.levelStep) || 20);

  const cards: GoalProgressCardModel[] = buckets.map((bucket) => {
    const goalItems = items.filter((item) => getItemGoalKey(item, goals) === bucket.name);
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
    for (const item of goalItems) {
      const key = normalizeProgressBlockKey(item);
      blockCounts[key] = (blockCounts[key] || 0) + 1;
    }
    const dates = progressItems.map(progressItemDate).filter(Boolean).sort();
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
      latestDate: dates.length ? dates[dates.length - 1] : null,
      blockCounts,
      categoryBreakdown: progression.categoryBreakdown,
      themeBreakdown: progression.themeBreakdown,
      themeRecentRecords: Object.fromEntries(
        progression.themeBreakdown.map((row) => [
          row.key,
          buildProgressRecentRecords(progressItems.filter((item) => getItemThemeKey(item) === row.key), 5),
        ]),
      ),
      energySummary: buildGoalEnergySummary(goalItems.filter(isEnergyItem), 5, { contextRecords: items, effectRecords: items }),
    };
  });
  const topN = Math.max(0, Number(config.topN) || 0);
  const goalCards = topN > 0 ? cards.slice(0, topN) : cards;
  return {
    config,
    mode: 'goal',
    goalCards,
    summary: {
      goalCount: goalCards.length,
      totalPoints: goalCards.reduce((sum, card) => sum + card.totalPoints, 0),
      totalItems: goalCards.reduce((sum, card) => sum + card.itemCount, 0),
    },
    result: null,
  };
}

export const PROGRESS_BLOCK_LABELS: Record<string, string> = {
  task: '任务',
  plan: '计划',
  review: '总结',
  habit: '打卡',
  blocker: '阻碍项',
  milestone: '里程碑',
  thought: '思考',
  evidence: '事件',
  energy: '精力',
  unknown: '未分类',
};

export const PROGRESS_LEVEL_META: ProgressLevelMeta[] = [
  { level: 1, icon: '🌱', title: '入门' },
  { level: 2, icon: '🔰', title: '练习' },
  { level: 3, icon: '🧩', title: '熟悉' },
  { level: 4, icon: '⚙️', title: '稳定' },
  { level: 5, icon: '🔥', title: '熟练' },
  { level: 6, icon: '🛠️', title: '进阶' },
  { level: 7, icon: '🧠', title: '专精' },
  { level: 8, icon: '🏔️', title: '高阶' },
  { level: 9, icon: '💎', title: '精通' },
  { level: 10, icon: '👑', title: '大师' },
];

const DEFAULT_COLLAPSED_BLOCKS = ['task', 'habit', 'blocker', 'milestone'];
const EXPANDED_BLOCK_ORDER = ['task', 'plan', 'review', 'habit', 'blocker', 'milestone', 'thought', 'evidence', 'energy'];
const TRACK_SEGMENT_COUNT = 10;

export function clampProgressRatio(value: number): number {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function ratioPercent(value: number): string {
  return `${Math.round(clampProgressRatio(value) * 100)}%`;
}

export function progressBarWidth(value: number): string {
  return `${Math.round(clampProgressRatio(value) * 100)}%`;
}

export function getProgressLeafLabel(path: string): string {
  const parts = String(path || '').split('/').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || path || '未设置主题';
}

export function getGoalProgressTitle(card: GoalProgressCardModel): string {
  return card.title || card.goalPath || '未命名目标';
}

export function getGoalProgressRemainingPoints(card: GoalProgressCardModel): number {
  return Math.max(0, Number(card.levelStep || 0) - Number(card.currentLevelPoints || 0));
}

export function getProgressDisplayLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(10, normalized);
}

export function getProgressLevelMeta(level: number): ProgressLevelMeta {
  return PROGRESS_LEVEL_META[getProgressDisplayLevel(level) - 1] || PROGRESS_LEVEL_META[0];
}

export function buildProgressTrackSegments(count: number = TRACK_SEGMENT_COUNT): number[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => index);
}

export function buildProgressSkillRows(card: GoalProgressCardModel): ProgressSkillRowModel[] {
  return getVisibleProgressThemeBreakdown(card.themeBreakdown).map((row) => {
    const safeLevelStep = Math.max(1, Number(card.levelStep || 1));
    const level = Math.floor(Number(row.points || 0) / safeLevelStep) + 1;
    const currentLevelPoints = Number(row.points || 0) - ((level - 1) * safeLevelStep);
    return {
      key: row.key,
      title: getProgressLeafLabel(row.key),
      points: Number(row.points || 0),
      count: Number(row.count || 0),
      level,
      levelMeta: getProgressLevelMeta(level),
      progressRatio: clampProgressRatio(currentLevelPoints / safeLevelStep),
      recentRecords: card.themeRecentRecords?.[row.key] || [],
    };
  });
}

export function getVisibleProgressThemeBreakdown(rows?: ProgressBreakdownLike[]) {
  return (rows || []).filter((row) => row.count > 0).slice(0, 8);
}

export function buildProgressBlockCountRows(counts: Record<string, number>): ProgressBlockCountRow[] {
  return EXPANDED_BLOCK_ORDER
    .map((key) => ({ key, label: PROGRESS_BLOCK_LABELS[key] || key, count: Number(counts?.[key] || 0) }))
    .filter((row) => row.count > 0);
}

export function buildProgressCollapsedFacts(card: GoalProgressCardModel): ProgressCollapsedFact[] {
  const blockFacts = DEFAULT_COLLAPSED_BLOCKS.map((key) => ({
    key,
    label: PROGRESS_BLOCK_LABELS[key] || key,
    value: Number(card.blockCounts?.[key] || 0),
  }));
  return [
    ...blockFacts,
    { key: 'latestDate', label: '最近', value: card.latestDate || '暂无' },
  ];
}

export function buildProgressSummary(cards: GoalProgressCardModel[], injectedSummary?: ProgressSummaryModel): ProgressSummaryModel {
  if (injectedSummary) return injectedSummary;
  return {
    goalCount: cards.length,
    totalPoints: cards.reduce((sum, card) => sum + Number(card.totalPoints || 0), 0),
    totalItems: cards.reduce((sum, card) => sum + Number(card.itemCount || 0), 0),
  };
}
