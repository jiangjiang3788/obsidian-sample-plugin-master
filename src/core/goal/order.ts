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
  return normalizeOrderPath(goal.path);
}

/** 目标在所有视图里的规范显示名：取目标路径叶子。 */
export function getGoalOrderLabel(goal: GoalDefinition | null | undefined): string {
  if (!goal) return '';
  return leafGoalLabel(goal.path);
}

export interface GoalOrderIndex {
  byPath: Map<string, number>;
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
  const rawDescriptors = (goals || [])
    .map((goal, originalIndex) => {
      const path = getGoalOrderPath(goal);
      const parts = path.split('/').filter(Boolean);
      return {
        path,
        parentPath: parts.slice(0, -1).join('/'),
        order: finiteNumber((goal as any)?.sortOrder, originalIndex),
        originalIndex,
      };
    })
    .filter((entry) => Boolean(entry.path));

  // Goal order is hierarchical, not a flat global sort. Sort siblings by sortOrder,
  // then walk the tree depth-first so a parent is always adjacent to its descendants.
  // This keeps settings matrices and all Goal-aware views from showing repeated leaf
  // labels detached from their parent paths.
  const descriptorByPath = new Map<string, (typeof rawDescriptors)[number]>();
  for (const entry of rawDescriptors) {
    if (!descriptorByPath.has(entry.path)) descriptorByPath.set(entry.path, entry);
  }

  const childrenByParent = new Map<string, Array<(typeof rawDescriptors)[number]>>();
  const rootEntries: Array<(typeof rawDescriptors)[number]> = [];
  for (const entry of descriptorByPath.values()) {
    if (!entry.parentPath || !descriptorByPath.has(entry.parentPath)) {
      rootEntries.push(entry);
      continue;
    }
    const siblings = childrenByParent.get(entry.parentPath) || [];
    siblings.push(entry);
    childrenByParent.set(entry.parentPath, siblings);
  }

  const sortSiblings = (items: Array<(typeof rawDescriptors)[number]>) => items.sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    if (left.originalIndex !== right.originalIndex) return left.originalIndex - right.originalIndex;
    return left.path.localeCompare(right.path, 'zh-CN');
  });

  sortSiblings(rootEntries);
  childrenByParent.forEach(sortSiblings);

  const descriptors: Array<(typeof rawDescriptors)[number]> = [];
  const visit = (entry: (typeof rawDescriptors)[number]) => {
    descriptors.push(entry);
    for (const child of childrenByParent.get(entry.path) || []) visit(child);
  };
  rootEntries.forEach(visit);

  const byPath = new Map<string, number>();
  const originalIndexByPath = new Map<string, number>();
  const orderedPaths: string[] = [];

  descriptors.forEach((entry, index) => {
    byPath.set(entry.path, index);
    originalIndexByPath.set(entry.path, entry.originalIndex);
    orderedPaths.push(entry.path);
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
    return left.path.localeCompare(right.path, 'zh-CN');
  };

  return { byPath, originalIndexByPath, orderedPaths, rankOfPath, compareGoalPaths, compareGoals };
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

/** Sort the one template owned by each Goal x RecordType cell. */
export function sortGoalTemplatesBySettingsOrder<T extends GoalTemplate>(templates: T[] = [], goals: GoalDefinition[] = []): T[] {
  const goalOrder = createGoalOrderIndex(goals);
  const originalIndex = new Map<T, number>();
  templates.forEach((template, index) => originalIndex.set(template, index));
  return [...templates].sort((left, right) => {
    const byGoal = goalOrder.compareGoalPaths(left.goalPath, right.goalPath);
    if (byGoal !== 0) return byGoal;
    const byBlock = String(left.recordTypeId || '').localeCompare(String(right.recordTypeId || ''), 'zh-CN');
    if (byBlock !== 0) return byBlock;
    return (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0);
  });
}
