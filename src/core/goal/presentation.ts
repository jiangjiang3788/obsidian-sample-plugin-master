import type { GoalDefinition } from './types';
import { normalizeGoalPath, splitGoalPath } from './path';
import { resolveGoalIcon } from './icon';

const GOAL_FALLBACK_PALETTE = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#0ea5e9'] as const;
export const UNASSIGNED_GOAL_COLOR = '#9ca3af';

function stableGoalColor(seed: string): string {
  let hash = 0;
  for (const ch of seed || '') hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return GOAL_FALLBACK_PALETTE[Math.abs(hash) % GOAL_FALLBACK_PALETTE.length] || GOAL_FALLBACK_PALETTE[0];
}

export function normalizeGoalColorHex(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) return `#${raw.slice(1).split('').map((part) => part + part).join('')}`;
  return null;
}

/** GoalDefinition owns explicit Goal color; deterministic fallback is presentation-only. */
export function resolveGoalColor(goal?: Pick<GoalDefinition, 'path' | 'color'> | null, fallbackPath = ''): string {
  const explicit = normalizeGoalColorHex(goal?.color);
  if (explicit) return explicit;
  const path = normalizeGoalPath(String(goal?.path || fallbackPath || '').trim());
  return path ? stableGoalColor(path) : UNASSIGNED_GOAL_COLOR;
}

export interface GoalPresentation {
  path: string;
  label: string;
  color: string;
  icon: string;
}

export function getGoalPresentation(goal?: GoalDefinition | null, fallbackPath = ''): GoalPresentation {
  const path = normalizeGoalPath(String(goal?.path || fallbackPath || '').trim()) || '';
  return {
    path,
    label: splitGoalPath(path).leafGoal || path || '未归属目标',
    color: resolveGoalColor(goal, path),
    icon: resolveGoalIcon(goal),
  };
}
