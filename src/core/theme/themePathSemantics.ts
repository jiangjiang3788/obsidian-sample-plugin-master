import {
  getHierarchyPathLeaf,
  getHierarchyPathParent,
  normalizeHierarchyPathParts,
  normalizeHierarchyPathValue,
} from '@/core/semantics/path';

/** Theme is a slash hierarchy, not a tag. */
export function normalizeThemePath(value?: unknown): string {
  return normalizeHierarchyPathValue(value) || '';
}

export function normalizeThemePathOrNull(value?: unknown): string | null {
  return normalizeHierarchyPathValue(value);
}

export function getThemePathCandidates(value?: unknown): string[] {
  const parts = normalizeHierarchyPathParts(value);
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}

export function getThemePathLeaf(value?: unknown): string {
  return getHierarchyPathLeaf(value) || normalizeThemePath(value);
}

export function getThemePathParent(value?: unknown): string {
  return getHierarchyPathParent(value);
}

export function buildThemePathMap<T extends { path?: string | null }>(themes: readonly T[] | undefined): Map<string, T> {
  return new Map((themes || [])
    .map((theme) => [normalizeThemePath(theme.path), theme] as const)
    .filter(([path]) => !!path));
}
