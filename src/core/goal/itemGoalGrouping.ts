import type { Item, ThemeDefinition } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import type { CategoryConfig } from '@/core/config/viewConfigs';
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

function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = firstString(item);
      if (candidate) return candidate;
    }
    return '';
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';
    return text.split(',').map((part) => part.trim()).filter(Boolean)[0] || '';
  }
  if (value == null) return '';
  return String(value).trim();
}

function normalizeItemGoalPath(value: unknown): string {
  const raw = firstString(value);
  if (!raw) return '';
  return normalizeGoalPath(raw) || raw;
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

export function getItemGoalKey(item: Item, goals: GoalDefinition[] = []): string {
  const directPath = normalizeItemGoalPath(item.goalPath);
  if (directPath) return directPath;

  const directPaths = normalizeItemGoalPath(item.goalPaths);
  if (directPaths) return directPaths;

  const fieldPath = normalizeItemGoalPath(readField(item, 'goalPath')) || normalizeItemGoalPath(readField(item, '目标路径')) || normalizeItemGoalPath(readField(item, '目标'));
  if (fieldPath) return fieldPath;

  const fieldPaths = normalizeItemGoalPath(readField(item, 'goalPaths'));
  if (fieldPaths) return fieldPaths;

  const byId = buildGoalPathById(goals);
  const directId = firstString(item.goalId) || firstString(readField(item, 'goalId')) || firstString(readField(item, '目标ID'));
  if (directId && byId.has(directId)) return byId.get(directId) || UNASSIGNED_GOAL_KEY;

  const directIds = firstString(item.goalIds);
  if (directIds && byId.has(directIds)) return byId.get(directIds) || UNASSIGNED_GOAL_KEY;

  return UNASSIGNED_GOAL_KEY;
}

export function getItemGoalLabel(item: Item, goals: GoalDefinition[] = []): string {
  const key = getItemGoalKey(item, goals);
  if (key === UNASSIGNED_GOAL_KEY) return UNASSIGNED_GOAL_KEY;
  const goal = findGoalByPath(goals, key);
  return goal?.title || splitGoalPath(key).leafGoal || key;
}

export function getItemThemeKey(item: Item): string {
  const direct = normalizeThemePath(item.themePath) || normalizeThemePath(item.theme);
  if (direct) return direct;

  const fieldTheme = normalizeThemePath(readField(item, 'themePath')) || normalizeThemePath(readField(item, '主题'));
  if (fieldTheme) return fieldTheme;

  const extra = item.extra || {};
  const extraTheme = normalizeThemePath(extra.themePath) || normalizeThemePath(extra['主题']) || normalizeThemePath(extra['主题路径']);
  if (extraTheme) return extraTheme;

  return '未设置主题';
}

export function getItemThemeLabel(item: Item): string {
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

export function buildGoalThemeBreakdown(items: Item[], goals: GoalDefinition[] = []): GoalThemeBreakdownRow[] {
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

export function buildGoalBuckets(items: Item[], goals: GoalDefinition[] = [], options: { includeUnassigned?: boolean; includeKnownGoals?: boolean; themes?: ThemeDefinition[] } = {}): GoalBucket[] {
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
