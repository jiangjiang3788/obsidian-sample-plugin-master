import type { GoalDefinition, ThemeDefinition } from "@core/public";
import { splitGoalPath } from "@core/public";

export function cleanDisplaySegment(value: unknown): string {
  return String(value ?? "")
    .replace(/^[#＃]+\s*/, "")
    .trim();
}

export function cleanDisplayPath(value?: string | null): string | null {
  const normalized = splitGoalPath(value).goalPath;
  if (!normalized) return null;
  const parts = normalized.split("/").map(cleanDisplaySegment).filter(Boolean);
  return parts.length ? parts.join("/") : null;
}

export const splitThemePathParts = (path?: string | null) => {
  const parts = String(path || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    themePath: parts.length ? parts.join("/") : null,
    rootTheme: parts[0] || null,
    leafTheme: parts.length ? parts[parts.length - 1] : null,
  };
};

export const splitPathParts = (path?: string | null) => {
  const parts = String(path || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    path: parts.length ? parts.join("/") : null,
    root: parts[0] || null,
    leaf: parts.length ? parts[parts.length - 1] : null,
  };
};

export function getGoalPath(goal?: GoalDefinition | null): string | null {
  if (!goal) return null;
  return cleanDisplayPath(goal.goalPath || goal.title);
}

export function makeGoalIdFromPath(path: string): string {
  return `goal:${path}`;
}

export function themeOptions(themes: ThemeDefinition[]) {
  return (themes || []).map((theme) => ({
    value: theme.path,
    label: cleanDisplaySegment(
      theme.path.split("/").filter(Boolean).pop() || theme.path,
    ),
    icon: theme.icon,
  }));
}
