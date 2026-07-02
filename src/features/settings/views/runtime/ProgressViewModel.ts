import type { Item } from '@core/types/public';

export interface ProgressBreakdownLike {
  key: string;
  points: number;
  count: number;
}

export interface ProgressRecentRecordModel {
  id: string;
  title: string;
  date?: string | null;
  item: Item;
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
  recentRecords?: ProgressRecentRecordModel[];
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
const EXPANDED_BLOCK_ORDER = ['task', 'plan', 'review', 'habit', 'blocker', 'milestone', 'thought', 'evidence'];
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
