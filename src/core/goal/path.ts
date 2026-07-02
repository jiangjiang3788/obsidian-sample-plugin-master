import { splitHierarchyPathValue } from '@/core/semantics/path';

export interface GoalPathParts {
  goalPath: string | null;
  rootGoal: string | null;
  leafGoal: string | null;
}

export function normalizeGoalPath(path?: string | null): string | null {
  return splitHierarchyPathValue(path, { stripLeadingHashes: true }).path;
}

export function splitGoalPath(path?: string | null): GoalPathParts {
  const parts = splitHierarchyPathValue(path, { stripLeadingHashes: true });
  return {
    goalPath: parts.path,
    rootGoal: parts.root,
    leafGoal: parts.leaf,
  };
}

export function getGoalPathCandidates(path?: string | null): string[] {
  const parts = splitHierarchyPathValue(path, { stripLeadingHashes: true }).parts;
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}
