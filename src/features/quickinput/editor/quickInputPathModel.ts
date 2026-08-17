import type { GoalDefinition } from '@core/goal/public';
import { normalizeGoalPath } from '@core/goal/public';
import { splitHierarchyPath } from '@core/fields/public';


export const splitPathParts = (path?: string | null) => {
  const parts = splitHierarchyPath(path);
  return {
    path: parts.path || null,
    root: parts.root || null,
    leaf: parts.leaf || null,
  };
};

export function getGoalPath(goal?: GoalDefinition | null): string | null {
  if (!goal) return null;
  return normalizeGoalPath(goal.path);
}
