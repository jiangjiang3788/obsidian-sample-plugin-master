import type { GoalDefinition } from './types';
import type { GoalTemplate } from './templates';
import { splitGoalPath } from './path';

const UNKNOWN_GOAL_RANK = Number.MAX_SAFE_INTEGER - 1000;
const UNASSIGNED_GOAL_RANK = Number.MAX_SAFE_INTEGER;

function finiteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeOrderPath(value: unknown): string {
  return splitGoalPath(String(value ?? '')).goalPath || '';
}

function leafGoalLabel(value: unknown): string {
  const parsed = splitGoalPath(String(value ?? ''));
  return parsed.leafGoal || parsed.goalPath || '';
}

/** 目标在所有视图里的规范显示路径：canonical slash path。 */
export function getGoalOrderPath(goal: GoalDefinition | null | undefined): string {
  if (!goal) return '';
  return normalizeOrderPath(goal.goalPath || goal.title || goal.id);
}

/** 目标在所有视图里的规范显示名：取目标路径叶子。 */
export function getGoalOrderLabel(goal: GoalDefinition | null | undefined): string {
  if (!goal) return '';
  return leafGoalLabel(goal.title || goal.goalPath || goal.id);
}

export interface GoalOrderIndex {
  byPath: Map<string, number>;
  byId: Map<string, number>;
  originalIndexByPath: Map<string, number>;
  orderedPaths: string[];
  rankOfPath: (path?: string | null) => number;
  compareGoalPaths: (left?: string | null, right?: string | null) => number;
  compareGoals: <T extends GoalDefinition>(left: T, right: T) => number;
}

/**
 * 唯一目标排序入口。
 *
 * 设计原则：
 * - 目标顺序来自 settings.goalSettings.goals 的 sortOrder / 原始顺序；
 * - 任何视图不得再按“记录数量、最新日期、积分”重排目标；
 * - 未配置目标排在已知目标后；未归属目标永远最后。
 */
export function createGoalOrderIndex(goals: GoalDefinition[] = []): GoalOrderIndex {
  const descriptors = (goals || [])
    .map((goal, originalIndex) => {
      const path = getGoalOrderPath(goal);
      return {
        id: goal.id,
        path,
        order: finiteNumber((goal as any)?.sortOrder, originalIndex),
        originalIndex,
      };
    })
    .filter((entry) => Boolean(entry.path));

  descriptors.sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.originalIndex - right.originalIndex;
  });

  const byPath = new Map<string, number>();
  const byId = new Map<string, number>();
  const originalIndexByPath = new Map<string, number>();
  const orderedPaths: string[] = [];

  descriptors.forEach((entry, index) => {
    if (!byPath.has(entry.path)) {
      byPath.set(entry.path, index);
      originalIndexByPath.set(entry.path, entry.originalIndex);
      orderedPaths.push(entry.path);
    }
    if (entry.id && !byId.has(entry.id)) byId.set(entry.id, index);
  });

  const rankOfPath = (path?: string | null): number => {
    const normalized = normalizeOrderPath(path || '');
    if (!normalized || normalized === '未归属目标') return UNASSIGNED_GOAL_RANK;
    const known = byPath.get(normalized);
    return known === undefined ? UNKNOWN_GOAL_RANK : known;
  };

  const compareGoalPaths = (left?: string | null, right?: string | null): number => {
    const leftPath = normalizeOrderPath(left || '');
    const rightPath = normalizeOrderPath(right || '');
    const leftRank = rankOfPath(leftPath);
    const rightRank = rankOfPath(rightPath);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return leftPath.localeCompare(rightPath, 'zh-CN');
  };

  const compareGoals = <T extends GoalDefinition>(left: T, right: T): number => {
    const byPathOrder = compareGoalPaths(getGoalOrderPath(left), getGoalOrderPath(right));
    if (byPathOrder !== 0) return byPathOrder;
    const leftIndex = (left.id && byId.has(left.id)) ? byId.get(left.id)! : UNKNOWN_GOAL_RANK;
    const rightIndex = (right.id && byId.has(right.id)) ? byId.get(right.id)! : UNKNOWN_GOAL_RANK;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return String(left.id || '').localeCompare(String(right.id || ''), 'zh-CN');
  };

  return { byPath, byId, originalIndexByPath, orderedPaths, rankOfPath, compareGoalPaths, compareGoals };
}

export function sortGoalsBySettingsOrder<T extends GoalDefinition>(goals: T[] = []): T[] {
  const order = createGoalOrderIndex(goals);
  return [...goals].sort(order.compareGoals);
}

export function compareGoalPathsBySettingsOrder(left: string | null | undefined, right: string | null | undefined, goals: GoalDefinition[] = []): number {
  return createGoalOrderIndex(goals).compareGoalPaths(left, right);
}

export function sortGoalPathsBySettingsOrder(paths: string[] = [], goals: GoalDefinition[] = []): string[] {
  const order = createGoalOrderIndex(goals);
  return [...paths].sort(order.compareGoalPaths);
}

function templateSortValue(template: GoalTemplate, fallback: number): number {
  return finiteNumber((template as any)?.sortOrder, fallback);
}

/**
 * 预设排序入口。
 *
 * 用于“目标 × 预设”视图：先按目标设置顺序，再按同一目标 / 同一 coreBlock 内预设 sortOrder。
 */
export function sortGoalTemplatesBySettingsOrder<T extends GoalTemplate>(templates: T[] = [], goals: GoalDefinition[] = []): T[] {
  const goalOrder = createGoalOrderIndex(goals);
  const originalIndex = new Map<T, number>();
  templates.forEach((template, index) => originalIndex.set(template, index));
  return [...templates].sort((left, right) => {
    const leftGoalPath = goals.find((goal) => goal.id === left.goalId)?.goalPath || left.goalId;
    const rightGoalPath = goals.find((goal) => goal.id === right.goalId)?.goalPath || right.goalId;
    const byGoal = goalOrder.compareGoalPaths(leftGoalPath, rightGoalPath);
    if (byGoal !== 0) return byGoal;
    const byBlock = String(left.coreBlockId || '').localeCompare(String(right.coreBlockId || ''), 'zh-CN');
    if (byBlock !== 0) return byBlock;
    const byTemplateOrder = templateSortValue(left, originalIndex.get(left) ?? 0) - templateSortValue(right, originalIndex.get(right) ?? 0);
    if (byTemplateOrder !== 0) return byTemplateOrder;
    return (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0);
  });
}
