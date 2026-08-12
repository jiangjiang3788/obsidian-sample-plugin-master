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
  if (!normalized) throw new Error('Invalid Goal path: Goal paths must be slash-separated text without # markers.');
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

export function makeStableGoalIdFromPath(path: string): string {
  const normalized = requireGoalPath(path);
  const safe = normalized
    .toLowerCase()
    .replace(/[\/\s]+/g, '-')
    .replace(/[^a-z0-9\-_.\u4e00-\u9fa5]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `goal.${safe || 'untitled'}`;
}
