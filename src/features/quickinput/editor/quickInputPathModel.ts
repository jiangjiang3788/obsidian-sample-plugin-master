import type { GoalDefinition } from '@core/goal/public';
import type { ThemeDefinition } from '@core/types/public';
import { getLeafPath } from '@core/utils/public';
import { normalizeGoalPath } from '@core/goal/public';
import { splitHierarchyPath } from '@core/fields/public';

export const splitThemePathParts = (path?: string | null) => {
  const parts = splitHierarchyPath(path);
  return {
    themePath: parts.path || null,
    rootTheme: parts.root || null,
    leafTheme: parts.leaf || null,
  };
};

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
  return normalizeGoalPath(goal.goalPath || goal.title);
}

export function themeOptions(themes: ThemeDefinition[]) {
  return (themes || []).map((theme) => ({
    value: theme.path,
    label: getLeafPath(theme.path) || theme.path,
    icon: theme.icon,
  }));
}
