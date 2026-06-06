export interface GoalPathParts {
  goalPath: string | null;
  rootGoal: string | null;
  leafGoal: string | null;
}

export function normalizeGoalPath(path?: string | null): string | null {
  const parts = String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts.join('/') : null;
}

export function splitGoalPath(path?: string | null): GoalPathParts {
  const normalized = normalizeGoalPath(path);
  if (!normalized) return { goalPath: null, rootGoal: null, leafGoal: null };
  const parts = normalized.split('/').filter(Boolean);
  return {
    goalPath: normalized,
    rootGoal: parts[0] || null,
    leafGoal: parts.length ? parts[parts.length - 1] : null,
  };
}
