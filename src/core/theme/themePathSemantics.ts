import {
  getHierarchyPathLeaf,
  getHierarchyPathParent,
  normalizeHierarchyPathParts,
  normalizeHierarchyPathValue,
} from '@/core/semantics/path';

export interface NormalizeThemePathOptions {
  /** Theme values can be typed from tag-like UI; stripping keeps old behavior stable. */
  stripLeadingHashes?: boolean;
}

const DEFAULT_THEME_PATH_OPTIONS: Required<NormalizeThemePathOptions> = {
  stripLeadingHashes: true,
};

function themePathOptions(options: NormalizeThemePathOptions = {}): Required<NormalizeThemePathOptions> {
  return { ...DEFAULT_THEME_PATH_OPTIONS, ...options };
}

export function normalizeThemePath(value?: unknown, options: NormalizeThemePathOptions = {}): string {
  return normalizeHierarchyPathValue(value, themePathOptions(options)) || '';
}

export function normalizeThemePathOrNull(value?: unknown, options: NormalizeThemePathOptions = {}): string | null {
  return normalizeHierarchyPathValue(value, themePathOptions(options));
}

export function getThemePathCandidates(value?: unknown, options: NormalizeThemePathOptions = {}): string[] {
  const parts = normalizeHierarchyPathParts(value, themePathOptions(options));
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}

export function getThemePathLeaf(value?: unknown, options: NormalizeThemePathOptions = {}): string {
  return getHierarchyPathLeaf(value, themePathOptions(options)) || normalizeThemePath(value, options);
}

export function getThemePathParent(value?: unknown, options: NormalizeThemePathOptions = {}): string {
  return getHierarchyPathParent(value, themePathOptions(options));
}

export function buildThemePathMap<T extends { path?: string | null }>(themes: readonly T[] | undefined, options: NormalizeThemePathOptions = {}): Map<string, T> {
  return new Map((themes || [])
    .map((theme) => [normalizeThemePath(theme.path, options), theme] as const)
    .filter(([path]) => !!path));
}
