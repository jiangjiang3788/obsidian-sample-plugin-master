import { getThemePathLeaf } from './themePathSemantics';

export interface ThemeMatchCandidate {
    path: string;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizedCandidatePath(theme: ThemeMatchCandidate): string {
    return String(theme.path || '').trim();
}

/**
 * Match a header/partial value to a full theme path.
 *
 * Match order is intentionally strict-to-loose so short text does not steal a
 * broader path too early:
 * 1. exact full path
 * 2. exact leaf name
 * 3. full path ends with /leaf
 * 4. header is an independent path segment
 * 5. leaf contains header
 */
export function findThemePathByPartialMatch(
    themes: readonly ThemeMatchCandidate[],
    headerText: string,
): string | null {
    if (!headerText || headerText.trim() === '') {
        return null;
    }

    const normalizedHeader = headerText.trim().toLowerCase();
    const allThemes = themes
        .map((theme) => ({ path: normalizedCandidatePath(theme), lowerPath: normalizedCandidatePath(theme).toLowerCase() }))
        .filter((theme) => !!theme.path);

    for (const theme of allThemes) {
        if (theme.lowerPath === normalizedHeader) {
            return theme.path;
        }
    }

    for (const theme of allThemes) {
        const themeName = getThemePathLeaf(theme.path).toLowerCase();
        if (themeName === normalizedHeader) {
            return theme.path;
        }
    }

    for (const theme of allThemes) {
        if (theme.lowerPath.endsWith(`/${normalizedHeader}`)) {
            return theme.path;
        }
    }

    const segmentPattern = new RegExp(`(^|/)${escapeRegExp(normalizedHeader)}(/|$)`, 'i');
    for (const theme of allThemes) {
        if (segmentPattern.test(theme.lowerPath)) {
            return theme.path;
        }
    }

    for (const theme of allThemes) {
        const themeName = getThemePathLeaf(theme.path).toLowerCase();
        if (themeName && themeName.includes(normalizedHeader)) {
            return theme.path;
        }
    }

    return null;
}
