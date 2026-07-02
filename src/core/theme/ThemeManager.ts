import type { IThemeMatcher, Item, Theme } from '@core/types/public';
import { findThemePathByPartialMatch } from './themeMatching';
import {
    buildThemeHierarchy,
    calculateThemeCollectionStats,
    createManagedTheme,
    extractExplicitThemeFromItem,
    findParentThemeId,
    findThemeByPath,
    groupThemesByStatus,
    sortActiveThemes,
    updateThemeCounterFromId,
    type ManagedTheme,
    type ThemeCollectionStats,
} from './themeManagerSemantics';

/**
 * Theme runtime registry and matcher.
 *
 * The service owns mutable theme state, while matching / grouping / hierarchy
 * rules live in core/theme pure semantics modules. This keeps settings UI from
 * owning domain matching behavior.
 */
export class ThemeManager implements IThemeMatcher {
    private readonly themes: Map<string, ManagedTheme> = new Map();
    private themeIdCounter = 0;

    addDefaultThemes(): void {
        this.addPredefinedTheme('工作', '💼');
        this.addPredefinedTheme('生活', '🏠');
        this.addPredefinedTheme('学习', '📚');
        this.addPredefinedTheme('健康', '💪');
        this.addPredefinedTheme('项目', '📁');
    }

    addPredefinedTheme(path: string, icon?: string): Theme {
        const existing = findThemeByPath(this.themes.values(), path);
        if (existing) {
            existing.icon = icon || existing.icon;
            existing.source = 'predefined';
            existing.status = 'active';
            existing.originallyPredefined = true;
            return existing;
        }

        const theme = createManagedTheme({
            id: this.generateThemeId(),
            path,
            icon,
            parentId: this.findParentTheme(path),
            status: 'active',
            source: 'predefined',
            usageCount: 0,
            order: this.themes.size,
            originallyPredefined: true,
        });
        this.themes.set(theme.id, theme);
        return theme;
    }

    discoverTheme(path: string): Theme {
        if (!path || path.trim() === '') {
            throw new Error('主题路径不能为空');
        }

        const existing = findThemeByPath(this.themes.values(), path);
        if (existing) {
            existing.usageCount++;
            existing.lastUsed = Date.now();
            return existing;
        }

        const theme = createManagedTheme({
            id: this.generateThemeId(),
            path,
            parentId: this.findParentTheme(path),
            status: 'inactive',
            source: 'discovered',
            usageCount: 1,
            lastUsed: Date.now(),
            order: this.themes.size,
        });
        this.themes.set(theme.id, theme);
        return theme;
    }

    activateTheme(path: string): void {
        const theme = findThemeByPath(this.themes.values(), path);
        if (theme) {
            theme.status = 'active';
            if (theme.source === 'discovered') {
                theme.source = 'predefined';
            }
        }
    }

    deactivateTheme(path: string): void {
        const theme = findThemeByPath(this.themes.values(), path);
        if (theme && !theme.originallyPredefined) {
            theme.status = 'inactive';
        }
    }

    getActiveThemes(): Theme[] {
        return sortActiveThemes(this.themes.values());
    }

    getAllThemes(): { active: Theme[]; inactive: Theme[]; discovered: Theme[] } {
        return groupThemesByStatus(this.themes.values());
    }

    extractTheme(item: Item): string | null {
        return extractExplicitThemeFromItem(item);
    }

    findThemeByPartialMatch(headerText: string): string | null {
        return findThemePathByPartialMatch(Array.from(this.themes.values()), headerText);
    }

    scanDataForThemes(items: Item[]): void {
        const themeSet = new Set<string>();
        for (const item of items) {
            const theme = this.extractTheme(item);
            if (theme) themeSet.add(theme);
        }
        for (const themePath of themeSet) {
            this.discoverTheme(themePath);
        }
    }

    getThemeStats(): ThemeCollectionStats {
        return calculateThemeCollectionStats(this.themes.values());
    }

    removeTheme(path: string): boolean {
        const theme = findThemeByPath(this.themes.values(), path);
        if (theme && !theme.originallyPredefined) {
            return this.themes.delete(theme.id);
        }
        return false;
    }

    updateThemeIcon(path: string, icon: string): void {
        const theme = findThemeByPath(this.themes.values(), path);
        if (theme) {
            theme.icon = icon;
        }
    }

    getThemeHierarchy(): Map<string | null, Theme[]> {
        return buildThemeHierarchy(this.themes.values());
    }

    clearThemes(): void {
        this.themes.clear();
        this.themeIdCounter = 0;
    }

    exportThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    importThemes(themes: Theme[]): void {
        for (const theme of themes) {
            if (!this.themes.has(theme.id)) {
                this.themes.set(theme.id, theme as ManagedTheme);
                this.themeIdCounter = updateThemeCounterFromId(theme.id, this.themeIdCounter);
            }
        }
    }

    getThemeByPath(path: string): Theme | undefined {
        return findThemeByPath(this.themes.values(), path);
    }

    updateThemeUsage(path: string): void {
        const theme = this.getThemeByPath(path);
        if (theme) {
            theme.usageCount++;
            theme.lastUsed = Date.now();
        }
    }

    private generateThemeId(): string {
        return `theme_${++this.themeIdCounter}`;
    }

    private findParentTheme(path: string): string | null {
        return findParentThemeId(this.themes.values(), path);
    }
}
