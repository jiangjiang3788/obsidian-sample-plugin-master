import { splitHierarchyPathValue } from '@/core/semantics/path';

export interface GoalPathParts {
  goalPath: string | null;
  rootGoal: string | null;
  leafGoal: string | null;
}

function containsTagMarker(value: string): boolean {
  return value.includes('#') || value.includes('＃');
}

/**
 * Canonical Goal path parser.
 * Goal is an entity hierarchy, not a tag. `#` is invalid rather than silently
 * stripped. This keeps bad values from leaking into the domain model.
 */
export function normalizeGoalPath(path?: string | null): string | null {
  const normalized = splitHierarchyPathValue(path).path;
  if (!normalized || containsTagMarker(normalized)) return null;
  return normalized;
}

export function requireGoalPath(path?: string | null): string {
  const normalized = normalizeGoalPath(path);
  if (!normalized) throw new Error('目标路径无效：必须使用斜杠分隔，且不能包含 # 标记。');
  return normalized;
}

export function splitGoalPath(path?: string | null): GoalPathParts {
  const normalized = normalizeGoalPath(path);
  const parts = splitHierarchyPathValue(normalized);
  return {
    goalPath: parts.path,
    rootGoal: parts.root,
    leafGoal: parts.leaf,
  };
}

export function getGoalPathCandidates(path?: string | null): string[] {
  const normalized = normalizeGoalPath(path);
  if (!normalized) return [];
  const parts = splitHierarchyPathValue(normalized).parts;
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}

export function getParentGoalPath(path?: string | null): string | null {
  const normalized = normalizeGoalPath(path);
  if (!normalized) return null;
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

export function getGoalLeaf(path?: string | null): string {
  return splitGoalPath(path).leafGoal || '';
}

export function isGoalPathDescendant(path?: string | null, ancestor?: string | null): boolean {
  const child = normalizeGoalPath(path);
  const parent = normalizeGoalPath(ancestor);
  return Boolean(child && parent && child !== parent && child.startsWith(`${parent}/`));
}
