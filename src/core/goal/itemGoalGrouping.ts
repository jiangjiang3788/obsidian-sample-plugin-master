import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';
import { readField } from '@/core/fields/ViewFieldCatalog';
import type { CategoryConfig } from '@/core/config/views';
import type { GoalDefinition } from './types';
import { normalizeGoalPath, splitGoalPath } from './path';
import { getThemePathCandidates, getThemePathLeaf, normalizeThemePath } from '@/core/theme/themePathSemantics';
import { createGoalOrderIndex } from './order';

export const UNASSIGNED_GOAL_KEY = '未归属目标';

export interface GoalBucket extends CategoryConfig {
  goalId?: string | null;
  goalPath?: string;
  icon?: string;
  isUnassigned?: boolean;
}

type GoalDefinitionWithIcon = GoalDefinition & { icon?: string | null };

function normalizeItemGoalPath(value: unknown): string {
  return normalizeGoalPath(String(value ?? '').trim()) || '';
}

function buildGoalPathById(goals: GoalDefinition[] = []): Map<string, string> {
  const map = new Map<string, string>();
  for (const goal of goals || []) {
    const path = normalizeItemGoalPath(goal.goalPath || goal.title);
    if (goal.id && path) map.set(goal.id, path);
  }
  return map;
}

function findGoalByPath(goals: GoalDefinition[] = [], goalPath: string): GoalDefinition | null {
  const normalized = normalizeItemGoalPath(goalPath);
  if (!normalized) return null;
  return goals.find((goal) => normalizeItemGoalPath(goal.goalPath || goal.title) === normalized) || null;
}

/**
 * Goal identity is single-valued and ID-first. A record without goalId is
 * unassigned; we no longer infer Goal identity from tag-like strings or aliases.
 * goalPath is only a readable snapshot if the referenced Goal no longer exists.
 */
export function getItemGoalKey(item: RecordViewItem, goals: GoalDefinition[] = []): string {
  const goalId = String(item.goalId || '').trim();
  if (!goalId) return UNASSIGNED_GOAL_KEY;
  const currentPath = buildGoalPathById(goals).get(goalId);
  if (currentPath) return currentPath;
  return normalizeItemGoalPath(item.goalPath) || UNASSIGNED_GOAL_KEY;
}

export function getItemGoalLabel(item: RecordViewItem, goals: GoalDefinition[] = []): string {
  const key = getItemGoalKey(item, goals);
  if (key === UNASSIGNED_GOAL_KEY) return UNASSIGNED_GOAL_KEY;
  const goal = findGoalByPath(goals, key);
  return goal?.title || splitGoalPath(key).leafGoal || key;
}

export function getItemThemeKey(item: RecordViewItem): string {
  const direct = normalizeThemePath(item.themePath) || normalizeThemePath(item.theme);
  if (direct) return direct;

  const fieldTheme = normalizeThemePath(readField(item, 'themePath')) || normalizeThemePath(readField(item, '主题'));
  if (fieldTheme) return fieldTheme;

  const extra = item.extra || {};
  const extraTheme = normalizeThemePath(extra.themePath) || normalizeThemePath(extra['主题']) || normalizeThemePath(extra['主题路径']);
  if (extraTheme) return extraTheme;

  return '未设置主题';
}

export function getItemThemeLabel(item: RecordViewItem): string {
  const key = getItemThemeKey(item);
  if (!key || key === '未设置主题') return '未设置主题';
  return getThemePathLeaf(key) || key;
}

export interface GoalThemeBreakdownRow {
  goalPath: string;
  themePath: string;
  themeLabel: string;
  count: number;
}

export function buildGoalThemeBreakdown(items: RecordViewItem[], goals: GoalDefinition[] = []): GoalThemeBreakdownRow[] {
  const map = new Map<string, GoalThemeBreakdownRow>();
  for (const item of items || []) {
    const goalPath = getItemGoalKey(item, goals);
    const themePath = getItemThemeKey(item);
    const key = `${goalPath}\u0000${themePath}`;
    const current = map.get(key) || { goalPath, themePath, themeLabel: getItemThemeLabel(item), count: 0 };
    current.count += 1;
    map.set(key, current);
  }
  const order = createGoalOrderIndex(goals);
  return Array.from(map.values()).sort((a, b) => {
    const byGoal = order.compareGoalPaths(a.goalPath, b.goalPath);
    if (byGoal !== 0) return byGoal;
    return a.themePath.localeCompare(b.themePath, 'zh-CN');
  });
}

function resolveThemeIcon(goal: GoalDefinition | null | undefined, themes: ThemeDefinition[] = []): string | undefined {
  const direct = String((goal as GoalDefinitionWithIcon | null | undefined)?.icon || '').trim();
  if (direct) return direct;
  const goalThemePath = normalizeThemePath(goal?.themePath);
  if (!goalThemePath) return undefined;
  const byPath = new Map((themes || []).map((theme) => [normalizeThemePath(theme.path), theme]));
  for (const candidate of getThemePathCandidates(goalThemePath)) {
    const theme = byPath.get(candidate);
    const icon = String(theme?.icon || '').trim();
    if (icon) return icon;
  }
  return undefined;
}

function stableColor(seed: string): string {
  const palette = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#0ea5e9'];
  let hash = 0;
  for (const ch of seed || '') hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length] || '#8b5cf6';
}

export function buildGoalBuckets(items: RecordViewItem[], goals: GoalDefinition[] = [], options: { includeUnassigned?: boolean; includeKnownGoals?: boolean; themes?: ThemeDefinition[] } = {}): GoalBucket[] {
  const { includeUnassigned = true, includeKnownGoals = false, themes = [] } = options;
  const map = new Map<string, GoalBucket>();

  const addBucket = (goalPath: string, sourceGoal?: GoalDefinition | null) => {
    const key = normalizeItemGoalPath(goalPath) || UNASSIGNED_GOAL_KEY;
    if (!includeUnassigned && key === UNASSIGNED_GOAL_KEY) return;
    if (map.has(key)) return;
    const goal = sourceGoal || findGoalByPath(goals, key);
    const label = key === UNASSIGNED_GOAL_KEY ? UNASSIGNED_GOAL_KEY : (goal?.title || splitGoalPath(key).leafGoal || key);
    const icon = key === UNASSIGNED_GOAL_KEY ? '•' : resolveThemeIcon(goal, themes);
    map.set(key, {
      name: key,
      alias: icon && icon !== '•' ? `${icon} ${label}` : label,
      color: stableColor(key),
      files: [],
      goalId: goal?.id || null,
      goalPath: key === UNASSIGNED_GOAL_KEY ? undefined : key,
      icon,
      isUnassigned: key === UNASSIGNED_GOAL_KEY,
    });
  };

  if (includeKnownGoals) {
    for (const goal of goals || []) {
      const path = normalizeItemGoalPath(goal.goalPath || goal.title);
      if (path) addBucket(path, goal);
    }
  }

  for (const item of items || []) {
    addBucket(getItemGoalKey(item, goals));
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
