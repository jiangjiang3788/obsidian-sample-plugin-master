// src/store/stores/ThemeStore.ts
import type { ThinkSettings, ThemeDefinition, ThemeOverride } from '../../lib/types/domain/schema';
import { generateId, moveItemInArray, duplicateItemInArray } from '../../lib/utils/core/array';

/**
 * ThemeStore - 管理主题相关状态
 * 负责主题的增删改查、批量操作等
 */
export class ThemeStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 添加主题
    public addTheme = async (path: string) => {
        await this._updateSettings(draft => {
            if (path && !draft.inputSettings.themes.some(t => t.path === path)) {
                draft.inputSettings.themes.push({ id: generateId('thm'), path, icon: '' });
            }
        });
    }

    // 更新主题
    public updateTheme = async (id: string, updates: Partial<ThemeDefinition>) => {
        await this._updateSettings(draft => {
            const index = draft.inputSettings.themes.findIndex(t => t.id === id);
            if (index > -1) {
                if (updates.path && draft.inputSettings.themes.some(t => t.path === updates.path && t.id !== id)) {
                    console.warn(`主题路径 "${updates.path}" 已存在。`);
                    return;
                }
                draft.inputSettings.themes[index] = { ...draft.inputSettings.themes[index], ...updates };
            }
        });
    }

    // 删除主题
    public deleteTheme = async (id: string) => {
        await this._updateSettings(draft => {
            draft.inputSettings.themes = draft.inputSettings.themes.filter(t => t.id !== id);
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => o.themeId !== id);
        });
    }

    // 批量更新主题
    public batchUpdateThemes = async (
        themeIds: string[], 
        updates: Partial<ThemeDefinition>
    ) => {
        await this._updateSettings(draft => {
            themeIds.forEach(id => {
                const index = draft.inputSettings.themes.findIndex(t => t.id === id);
                if (index > -1) {
                    Object.assign(draft.inputSettings.themes[index], updates);
                }
            });
        });
    }

    // 批量删除主题
    public batchDeleteThemes = async (themeIds: string[]) => {
        await this._updateSettings(draft => {
            draft.inputSettings.themes = draft.inputSettings.themes.filter(
                t => !themeIds.includes(t.id)
            );
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                o => !themeIds.includes(o.themeId)
            );
        });
    }

    // 批量更新主题状态
    public batchUpdateThemeStatus = async (themeIds: string[], status: 'active' | 'archived') => {
        await this._updateSettings(draft => {
            const themePaths = themeIds.map(id => draft.inputSettings.themes.find(t => t.id === id)?.path).filter(Boolean) as string[];
            
            if (!draft.activeThemePaths) {
                draft.activeThemePaths = [];
            }

            if (status === 'active') {
                themePaths.forEach(path => {
                    if (!draft.activeThemePaths!.includes(path)) {
                        draft.activeThemePaths!.push(path);
                    }
                });
            } else { // 'archived'
                draft.activeThemePaths = draft.activeThemePaths!.filter(path => !themePaths.includes(path));
            }
        });
    }

    // 批量更新主题图标
    public batchUpdateThemeIcon = async (themeIds: string[], icon: string) => {
        await this._updateSettings(draft => {
            themeIds.forEach(id => {
                const theme = draft.inputSettings.themes.find(t => t.id === id);
                if (theme) {
                    theme.icon = icon;
                }
            });
        });
    }

    // 批量设置覆盖状态
    public batchSetOverrideStatus = async (
        cells: Array<{ themeId: string; blockId: string }>,
        status: 'inherit' | 'override' | 'disabled'
    ) => {
        await this._updateSettings(draft => {
            if (status === 'inherit') {
                const cellKeys = new Set(cells.map(c => `${c.themeId}:${c.blockId}`));
                draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                    o => !cellKeys.has(`${o.themeId}:${o.blockId}`)
                );
            } else { // 'override' or 'disabled'
                cells.forEach(cell => {
                    const existingIndex = draft.inputSettings.overrides.findIndex(
                        o => o.blockId === cell.blockId && o.themeId === cell.themeId
                    );
                    
                    if (existingIndex > -1) {
                        const existingOverride = draft.inputSettings.overrides[existingIndex];
                        if (status === 'disabled') {
                            existingOverride.disabled = true;
                        } else { // 'override'
                           delete existingOverride.disabled;
                        }
                    } else {
                        // Only create new override if not inheriting
                        const newOverride: Partial<ThemeOverride> & { themeId: string; blockId: string } = {
                            themeId: cell.themeId,
                            blockId: cell.blockId,
                        };
                        if (status === 'disabled') {
                            newOverride.disabled = true;
                        }
                        draft.inputSettings.overrides.push({
                            ...newOverride,
                            id: generateId('ovr')
                        } as ThemeOverride);
                    }
                });
            }
        });
    }

    // 更新或插入覆盖配置
    public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>) => {
        await this._updateSettings(draft => {
            const index = draft.inputSettings.overrides.findIndex(o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId);
            if (index > -1) {
                const existingId = draft.inputSettings.overrides[index].id;
                draft.inputSettings.overrides[index] = { ...overrideData, id: existingId };
            } else {
                const newOverride: ThemeOverride = {
                    id: generateId('ovr'),
                    ...overrideData,
                };
                draft.inputSettings.overrides.push(newOverride);
            }
        });
    }

    // 删除覆盖配置
    public deleteOverride = async (blockId: string, themeId: string) => {
        await this._updateSettings(draft => {
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                o => !(o.blockId === blockId && o.themeId === themeId)
            );
        });
    }

    // 批量更新覆盖配置
    public batchUpsertOverrides = async (
        overrides: Array<Omit<ThemeOverride, 'id'>>
    ) => {
        await this._updateSettings(draft => {
            overrides.forEach(override => {
                const existingIndex = draft.inputSettings.overrides.findIndex(
                    o => o.blockId === override.blockId && o.themeId === override.themeId
                );
                
                if (existingIndex > -1) {
                    // 更新现有覆盖
                    const existingId = draft.inputSettings.overrides[existingIndex].id;
                    draft.inputSettings.overrides[existingIndex] = {
                        ...override,
                        id: existingId
                    };
                } else {
                    // 添加新覆盖
                    draft.inputSettings.overrides.push({
                        ...override,
                        id: generateId('ovr')
                    });
                }
            });
        });
    }

    // 批量删除覆盖配置
    public batchDeleteOverrides = async (
        selections: Array<{blockId: string; themeId: string}>
    ) => {
        await this._updateSettings(draft => {
            selections.forEach(({ blockId, themeId }) => {
                draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                    o => !(o.blockId === blockId && o.themeId === themeId)
                );
            });
        });
    }

    // 获取主题列表
    public getThemes = (): ThemeDefinition[] => {
        return this._getSettings().inputSettings.themes;
    }

    // 获取单个主题
    public getTheme = (id: string): ThemeDefinition | undefined => {
        return this._getSettings().inputSettings.themes.find(t => t.id === id);
    }

    // 获取覆盖配置列表
    public getOverrides = (): ThemeOverride[] => {
        return this._getSettings().inputSettings.overrides;
    }

    // 获取特定主题和块的覆盖配置
    public getOverride = (blockId: string, themeId: string): ThemeOverride | undefined => {
        return this._getSettings().inputSettings.overrides.find(
            o => o.blockId === blockId && o.themeId === themeId
        );
    }
}
