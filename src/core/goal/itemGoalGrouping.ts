import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { CategoryConfig } from '@/core/config/views';
import type { GoalDefinition } from './types';
import { normalizeGoalPath, splitGoalPath } from './path';
import { createGoalOrderIndex } from './order';
import { resolveGoalIcon } from './icon';

export const UNASSIGNED_GOAL_KEY = '未归属目标';

export interface GoalBucket extends CategoryConfig {
  goalPath?: string;
  icon?: string;
  isUnassigned?: boolean;
}

function normalizeItemGoalPath(value: unknown): string {
  return normalizeGoalPath(String(value ?? '').trim()) || '';
}

function findGoalByPath(goals: GoalDefinition[] = [], goalPath: string): GoalDefinition | null {
  const normalized = normalizeItemGoalPath(goalPath);
  if (!normalized) return null;
  return goals.find((goal) => normalizeItemGoalPath(goal.path) === normalized) || null;
}

/** Goal identity is the canonical slash path stored on the Record. */
export function getItemGoalKey(item: RecordViewItem, _goals: GoalDefinition[] = []): string {
  return normalizeItemGoalPath(item.goalPath) || UNASSIGNED_GOAL_KEY;
}

export function getItemRootGoalKey(item: RecordViewItem, goals: GoalDefinition[] = []): string {
  const path = getItemGoalKey(item, goals);
  if (path === UNASSIGNED_GOAL_KEY) return path;
  return splitGoalPath(path).rootGoal || path;
}

export function getItemGoalLabel(item: RecordViewItem, goals: GoalDefinition[] = []): string {
  const key = getItemGoalKey(item, goals);
  if (key === UNASSIGNED_GOAL_KEY) return UNASSIGNED_GOAL_KEY;
  const goal = findGoalByPath(goals, key);
  return splitGoalPath(goal?.path || key).leafGoal || key;
}

function stableColor(seed: string): string {
  const palette = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#0ea5e9'];
  let hash = 0;
  for (const ch of seed || '') hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length] || '#8b5cf6';
}

export function buildGoalBuckets(
  items: RecordViewItem[],
  goals: GoalDefinition[] = [],
  options: { includeUnassigned?: boolean; includeKnownGoals?: boolean; level?: 'path' | 'root' } = {},
): GoalBucket[] {
  const { includeUnassigned = true, includeKnownGoals = false, level = 'path' } = options;
  const normalizeBucketPath = (value: string): string => {
    const normalized = normalizeItemGoalPath(value);
    if (!normalized || normalized === UNASSIGNED_GOAL_KEY) return UNASSIGNED_GOAL_KEY;
    return level === 'root' ? (splitGoalPath(normalized).rootGoal || normalized) : normalized;
  };
  const map = new Map<string, GoalBucket>();

  const addBucket = (goalPath: string, sourceGoal?: GoalDefinition | null) => {
    const key = normalizeBucketPath(goalPath);
    if (!includeUnassigned && key === UNASSIGNED_GOAL_KEY) return;
    if (map.has(key)) return;
    const goal = sourceGoal || findGoalByPath(goals, key);
    const label = key === UNASSIGNED_GOAL_KEY ? UNASSIGNED_GOAL_KEY : (splitGoalPath(goal?.path || key).leafGoal || key);
    const icon = key === UNASSIGNED_GOAL_KEY ? '•' : resolveGoalIcon(goal);
    map.set(key, {
      name: key,
      alias: icon && icon !== '•' ? `${icon} ${label}` : label,
      color: goal?.color || stableColor(key),
      files: [],
      goalPath: key === UNASSIGNED_GOAL_KEY ? undefined : key,
      icon,
      isUnassigned: key === UNASSIGNED_GOAL_KEY,
    });
  };

  if (includeKnownGoals) {
    for (const goal of goals || []) {
      const path = normalizeItemGoalPath(goal.path);
      if (!path) continue;
      const bucketPath = normalizeBucketPath(path);
      const bucketGoal = level === 'root' ? findGoalByPath(goals, bucketPath) : goal;
      addBucket(bucketPath, bucketGoal);
    }
  }

  for (const item of items || []) {
    const path = level === 'root' ? getItemRootGoalKey(item, goals) : getItemGoalKey(item, goals);
    addBucket(path);
  }

  const order = createGoalOrderIndex(goals);
  return Array.from(map.values()).sort((a, b) => {
    if (a.isUnassigned && !b.isUnassigned) return 1;
    if (!a.isUnassigned && b.isUnassigned) return -1;
    const byGoal = order.compareGoalPaths(a.goalPath || a.name, b.goalPath || b.name);
    if (byGoal !== 0) return byGoal;
    return (a.alias || a.name).localeCompare(b.alias || b.name, 'zh-CN');
  });
}
