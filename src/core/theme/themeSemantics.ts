import type { IThemeMatcher } from '@/core/types/theme';

/**
 * Theme semantic helpers.
 *
 * A heading/header describes the section where an item is located. It is NOT a
 * theme fallback. Theme identity must come from explicit theme data only:
 * - task inline metadata: (主题::xxx) / (theme::xxx)
 * - block metadata: 主题:: xxx
 * - already persisted explicit theme fields from cache/imports
 */
export interface ThemePathParts {
  /** Full theme path, e.g. 学习/英语/听力. */
  themePath: string | null;
  /** Root theme, e.g. 学习. */
  rootTheme: string | null;
  /** Leaf theme, e.g. 听力. */
  leafTheme: string | null;
}

function cleanThemePath(value: unknown): string | null {
  const cleaned = String(value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
  return cleaned || null;
}

export function splitThemePath(themePath: string | null | undefined): ThemePathParts {
  const cleaned = cleanThemePath(themePath);
  if (!cleaned) {
    return { themePath: null, rootTheme: null, leafTheme: null };
  }

  const parts = cleaned.split('/');
  return {
    themePath: cleaned,
    rootTheme: parts[0] || null,
    leafTheme: parts[parts.length - 1] || null,
  };
}

/** Normalize only an explicit theme value. Never pass heading/header here. */
export function normalizeExplicitTheme(rawTheme: unknown, matcher?: Pick<IThemeMatcher, 'findThemeByPartialMatch'> | null): string | undefined {
  const explicitTheme = cleanThemePath(rawTheme);
  if (!explicitTheme) return undefined;

  const matched = matcher?.findThemeByPartialMatch(explicitTheme);
  return cleanThemePath(matched) || explicitTheme;
}

export interface ThemeCarrier {
  theme?: string;
  themePath?: string;
  themePathNormalized?: string;
  rootTheme?: string;
  leafTheme?: string;
}

/**
 * Read explicit theme identity from an item-like object.
 *
 * themePath/themePathNormalized are accepted for restored cache/imported data,
 * but header is intentionally excluded from this contract.
 */
export function readExplicitThemePath(item: ThemeCarrier | null | undefined): string | undefined {
  const normalized = cleanThemePath(item?.themePath);
  if (normalized) return normalized;

  const cached = cleanThemePath(item?.themePathNormalized);
  if (cached) return cached;

  return cleanThemePath(item?.theme) || undefined;
}

export function readExplicitThemeParts(item: ThemeCarrier | null | undefined): ThemePathParts {
  return splitThemePath(readExplicitThemePath(item));
}

/** Refresh derived view fields from explicit theme only. */
export function applyExplicitThemeViewFields<T extends ThemeCarrier>(item: T): T {
  const parts = readExplicitThemeParts(item);
  item.themePath = parts.themePath || undefined;
  item.rootTheme = parts.rootTheme || undefined;
  item.leafTheme = parts.leafTheme || undefined;
  item.themePathNormalized = parts.themePath || undefined;
  return item;
}
