import type { Item, Theme } from '@core/types/public';
import { getThemePathLeaf } from './themePathSemantics';

export type ManagedTheme = Theme & {
    originallyPredefined?: boolean;
};

export interface ThemeCollectionStats {
    total: number;
    active: number;
    inactive: number;
    predefined: number;
    discovered: number;
}

export interface CreateManagedThemeInput {
    id: string;
    path: string;
    icon?: string;
    parentId: string | null;
    status: Theme['status'];
    source: Theme['source'];
    usageCount: number;
    lastUsed?: number;
    order: number;
    originallyPredefined?: boolean;
}

export function createManagedTheme(input: CreateManagedThemeInput): ManagedTheme {
    return {
        id: input.id,
        path: input.path,
        name: getThemePathLeaf(input.path) || input.path,
        icon: input.icon,
        parentId: input.parentId,
        status: input.status,
        source: input.source,
        usageCount: input.usageCount,
        lastUsed: input.lastUsed,
        order: input.order,
        originallyPredefined: input.originallyPredefined,
    };
}

export function findThemeByPath(themes: Iterable<ManagedTheme>, path: string): ManagedTheme | undefined {
    return Array.from(themes).find((theme) => theme.path === path);
}

export function findParentThemeId(themes: Iterable<ManagedTheme>, path: string): string | null {
    const parts = path.split('/');
    if (parts.length <= 1) return null;

    const parentPath = parts.slice(0, -1).join('/');
    return findThemeByPath(themes, parentPath)?.id || null;
}

export function sortActiveThemes(themes: Iterable<ManagedTheme>): ManagedTheme[] {
    return Array.from(themes)
        .filter((theme) => theme.status === 'active')
        .sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
                return b.usageCount - a.usageCount;
            }
            if (a.lastUsed && b.lastUsed) {
                return b.lastUsed - a.lastUsed;
            }
            return a.order - b.order;
        });
}

export function groupThemesByStatus(themes: Iterable<ManagedTheme>): { active: Theme[]; inactive: Theme[]; discovered: Theme[] } {
    const themeList = Array.from(themes);
    return {
        active: themeList.filter((theme) => theme.status === 'active'),
        inactive: themeList.filter((theme) => theme.status === 'inactive'),
        discovered: themeList.filter((theme) => theme.source === 'discovered'),
    };
}

export function extractExplicitThemeFromItem(item: Item): string | null {
    return item.theme || null;
}

export function calculateThemeCollectionStats(themes: Iterable<ManagedTheme>): ThemeCollectionStats {
    const themeList = Array.from(themes);
    return {
        total: themeList.length,
        active: themeList.filter((theme) => theme.status === 'active').length,
        inactive: themeList.filter((theme) => theme.status === 'inactive').length,
        predefined: themeList.filter((theme) => theme.source === 'predefined').length,
        discovered: themeList.filter((theme) => theme.source === 'discovered').length,
    };
}

export function buildThemeHierarchy(themes: Iterable<ManagedTheme>): Map<string | null, Theme[]> {
    const hierarchy = new Map<string | null, Theme[]>();
    for (const theme of themes) {
        const parentId = theme.parentId;
        if (!hierarchy.has(parentId)) {
            hierarchy.set(parentId, []);
        }
        hierarchy.get(parentId)!.push(theme);
    }
    return hierarchy;
}

export function updateThemeCounterFromId(themeId: string, currentCounter: number): number {
    const idNum = parseInt(themeId.replace('theme_', ''), 10);
    return !isNaN(idNum) && idNum > currentCounter ? idNum : currentCounter;
}
