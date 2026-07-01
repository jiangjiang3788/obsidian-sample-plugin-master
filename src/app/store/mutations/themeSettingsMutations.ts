// src/app/store/mutations/themeSettingsMutations.ts
/** Pure settings mutations for theme state. */

import type { ActiveStatus, ThemeDefinition, ThinkSettings } from '@core/types/public';
import { generateId } from '@core/utils/public';

export function normalizeThemeSettingsPath(path: string): string {
    return path.split('/').map((part) => part.trim()).filter(Boolean).join('/');
}

export function getNearestThemeSettingsParentPath(
    path: string,
    themes: ThemeDefinition[],
): string | null {
    const parts = normalizeThemeSettingsPath(path).split('/');
    if (parts.length <= 1) return null;

    const themePaths = new Set(themes.map((theme) => normalizeThemeSettingsPath(theme.path)));
    for (let index = parts.length - 1; index >= 1; index -= 1) {
        const candidate = parts.slice(0, index).join('/');
        if (themePaths.has(candidate)) return candidate;
    }
    return null;
}

export function getThemeSettingsSiblingOrder(path: string, themes: ThemeDefinition[]): number {
    const normalizedPath = normalizeThemeSettingsPath(path);
    const parentPath = getNearestThemeSettingsParentPath(normalizedPath, themes);
    const siblingOrders = themes
        .filter((theme) => getNearestThemeSettingsParentPath(theme.path, themes) === parentPath)
        .map((theme) => typeof theme.order === 'number' && Number.isFinite(theme.order) ? theme.order : -1);
    const maxOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) : -1;
    return maxOrder + 1;
}

export function themeSettingsPathExists(
    themes: ThemeDefinition[],
    path: string,
    exceptThemeId?: string,
): boolean {
    const normalizedPath = normalizeThemeSettingsPath(path);
    return themes.some((theme) => normalizeThemeSettingsPath(theme.path) === normalizedPath && theme.id !== exceptThemeId);
}

export function makeThemeSettingsDraft(path: string, existingThemes: ThemeDefinition[]): ThemeDefinition {
    const normalizedPath = normalizeThemeSettingsPath(path);
    return {
        id: generateId('thm'),
        path: normalizedPath,
        icon: '📁',
        order: getThemeSettingsSiblingOrder(normalizedPath, existingThemes),
    };
}

function ensureThemeSettingsList(draft: ThinkSettings): ThemeDefinition[] {
    if (!draft.inputSettings.themes) draft.inputSettings.themes = [];
    return draft.inputSettings.themes;
}

export function addThemeSettingsDraft(draft: ThinkSettings, theme: ThemeDefinition): void {
    ensureThemeSettingsList(draft).push(theme);
}

export function patchThemeSettingsDraft(
    draft: ThinkSettings,
    id: string,
    updates: Partial<ThemeDefinition>,
): void {
    const theme = draft.inputSettings.themes?.find((candidate) => candidate.id === id);
    if (theme) Object.assign(theme, updates);
}

export function deleteThemeSettingsDraft(draft: ThinkSettings, id: string): void {
    draft.inputSettings.themes = draft.inputSettings.themes?.filter((theme) => theme.id !== id) || [];
}

export function reorderThemeSettingsSiblings(draft: ThinkSettings, orderedThemeIds: string[]): void {
    const orderMap = new Map<string, number>();
    orderedThemeIds.forEach((id, index) => orderMap.set(id, index));

    const themes = draft.inputSettings.themes || [];
    themes.forEach((theme) => {
        const nextOrder = orderMap.get(theme.id);
        if (typeof nextOrder === 'number') theme.order = nextOrder;
    });
}

export function batchPatchThemeSettingsDraft(
    draft: ThinkSettings,
    themeIds: string[],
    updates: Partial<ThemeDefinition>,
): void {
    themeIds.forEach((id) => patchThemeSettingsDraft(draft, id, updates));
}

export function batchDeleteThemeSettingsDraft(draft: ThinkSettings, themeIds: string[]): void {
    const themeIdSet = new Set(themeIds);
    draft.inputSettings.themes = draft.inputSettings.themes?.filter((theme) => !themeIdSet.has(theme.id)) || [];
}

export function batchSetThemeSettingsStatus(
    draft: ThinkSettings,
    themeIds: string[],
    status: ActiveStatus,
): void {
    const themePaths = themeIds
        .map((id) => draft.inputSettings.themes?.find((theme) => theme.id === id)?.path)
        .filter((path): path is string => Boolean(path));

    if (!draft.activeThemePaths) draft.activeThemePaths = [];

    if (status === 'active') {
        themePaths.forEach((path) => {
            if (!draft.activeThemePaths!.includes(path)) draft.activeThemePaths!.push(path);
        });
    } else {
        draft.activeThemePaths = draft.activeThemePaths.filter((path) => !themePaths.includes(path));
    }
}

export function batchSetThemeSettingsIcon(
    draft: ThinkSettings,
    themeIds: string[],
    icon: string,
): void {
    themeIds.forEach((id) => {
        const theme = draft.inputSettings.themes?.find((candidate) => candidate.id === id);
        if (theme) theme.icon = icon;
    });
}
