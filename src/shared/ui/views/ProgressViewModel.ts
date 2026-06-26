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
  categoryBreakdown?: Array<{ key: string; points: number; count: number }>;
  themeBreakdown?: Array<{ key: string; points: number; count: number }>;
}

export interface ProgressSummaryModel {
  goalCount: number;
  totalPoints: number;
  totalItems: number;
}

export interface ProgressViewRenderModel {
  config: any;
  mode?: 'goal' | 'legacy';
  goalCards?: GoalProgressCardModel[];
  summary?: ProgressSummaryModel;
  result?: any;
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

const DEFAULT_COLLAPSED_BLOCKS = ['task', 'habit', 'blocker', 'milestone'];
const EXPANDED_BLOCK_ORDER = ['task', 'plan', 'review', 'habit', 'blocker', 'milestone', 'thought', 'evidence'];

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

export function getVisibleProgressThemeBreakdown(rows?: Array<{ key: string; points: number; count: number }>) {
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
