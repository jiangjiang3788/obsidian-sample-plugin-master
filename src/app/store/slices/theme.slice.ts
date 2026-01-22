// src/app/store/slices/theme.slice.ts
/**
 * ThemeSlice - Zustand Theme 状态切片
 * Role: Store Slice (状态管理)
 * 
 * Do:
 * - 管理 Theme 相关的辅助状态（loading/error）
 * - 提供 Theme 相关 actions（委托给 SettingsRepository）
 * - 提供查询方法
 * 
 * Don't:
 * - 直接写 settings（由 ServiceManager 订阅 SettingsRepository 统一更新）
 * - 直接进行 IO 操作
 * - 持有 UI 逻辑
 * 
 * S2 规范：
 * - SettingsRepository 是 settings 的唯一写入口
 * - Zustand store 只是订阅者，由 ServiceManager 同步
 */

import type { StateCreator } from 'zustand';
import type { ThinkSettings, ThemeDefinition, ThemeOverride } from '@core/public';
import type { SettingsRepository } from '@core/public';
import type { ActiveStatus } from '@core/public';
import { generateId } from '@core/public';
import { createSliceMeta } from '@core/public';

// ============== 类型定义 ==============

export interface ThemeSliceState {
    // Theme 数据从 settings.inputSettings.themes 读取
    // 这里只定义辅助状态
    themeLoading: boolean;
    themeError: string | null;
}

export interface ThemeSliceActions {
    // Theme CRUD
    addTheme: (path: string) => Promise<ThemeDefinition | null>;
    updateTheme: (id: string, updates: Partial<ThemeDefinition>) => Promise<void>;
    deleteTheme: (id: string) => Promise<void>;
    
    // Theme 批量操作
    batchUpdateThemes: (themeIds: string[], updates: Partial<ThemeDefinition>) => Promise<void>;
    batchDeleteThemes: (themeIds: string[]) => Promise<void>;
    batchUpdateThemeStatus: (themeIds: string[], status: ActiveStatus) => Promise<void>;
    batchUpdateThemeIcon: (themeIds: string[], icon: string) => Promise<void>;
    
    // Override 操作
    upsertOverride: (overrideData: Omit<ThemeOverride, 'id'>) => Promise<ThemeOverride | null>;
    deleteOverride: (blockId: string, themeId: string) => Promise<void>;
    batchUpsertOverrides: (overrides: Array<Omit<ThemeOverride, 'id'>>) => Promise<void>;
    batchDeleteOverrides: (selections: Array<{blockId: string; themeId: string}>) => Promise<void>;
    batchSetOverrideStatus: (cells: Array<{ themeId: string; blockId: string }>, status: 'inherit' | 'override' | 'disabled') => Promise<void>;
    
    // 查询方法
    getThemes: () => ThemeDefinition[];
    getTheme: (id: string) => ThemeDefinition | undefined;
    getOverrides: () => ThemeOverride[];
    getOverride: (blockId: string, themeId: string) => ThemeOverride | undefined;
    
    // 状态管理
    setThemeError: (error: string | null) => void;
}

export type ThemeSlice = ThemeSliceState & ThemeSliceActions;

// ============== Slice 创建器 ==============

/**
 * 创建 Theme Slice
 * @param settingsRepository 设置仓库（用于持久化）
 * @param getSettings 获取当前设置的函数
 */
export function createThemeSlice(
    settingsRepository: SettingsRepository
): StateCreator<
    ThemeSlice & { settings: ThinkSettings; isInitialized: boolean },
    [],
    [],
    ThemeSlice
> {
    return (set, get) => ({
        // ============== 初始状态 ==============
        themeLoading: false,
        themeError: null,

        // ============== Theme CRUD ==============

        addTheme: async (path: string): Promise<ThemeDefinition | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ThemeSlice] Store 未初始化');
                return null;
            }

            if (!path) {
                console.warn('[ThemeSlice] 主题路径不能为空');
                return null;
            }

            // 检查路径是否已存在
            const existingThemes = state.settings.inputSettings?.themes || [];
            if (existingThemes.some(t => t.path === path)) {
                console.warn(`[ThemeSlice] 主题路径 "${path}" 已存在`);
                return null;
            }

            set({ themeLoading: true, themeError: null });

            try {
                const newTheme: ThemeDefinition = {
                    id: generateId('thm'),
                    path,
                    icon: ''
                };

                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    if (!draft.inputSettings.themes) {
                        draft.inputSettings.themes = [];
                    }
                    draft.inputSettings.themes.push(newTheme);
                }, createSliceMeta('theme.addTheme'));

                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
                return newTheme;
            } catch (error: any) {
                console.error('[ThemeSlice] addTheme 失败:', error);
                set({ themeError: error.message || '添加主题失败', themeLoading: false });
                return null;
            }
        },

        updateTheme: async (id: string, updates: Partial<ThemeDefinition>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ThemeSlice] Store 未初始化');
                return;
            }

            // 检查路径重复
            if (updates.path) {
                const existingThemes = state.settings.inputSettings?.themes || [];
                if (existingThemes.some(t => t.path === updates.path && t.id !== id)) {
                    console.warn(`[ThemeSlice] 主题路径 "${updates.path}" 已存在`);
                    return;
                }
            }

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const theme = draft.inputSettings.themes?.find(t => t.id === id);
                    if (theme) {
                        Object.assign(theme, updates);
                    }
                }, createSliceMeta('theme.updateTheme'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] updateTheme 失败:', error);
                set({ themeError: error.message || '更新主题失败', themeLoading: false });
            }
        },

        deleteTheme: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ThemeSlice] Store 未初始化');
                return;
            }

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    // 删除主题
                    draft.inputSettings.themes = draft.inputSettings.themes?.filter(t => t.id !== id) || [];
                    // 清理相关的 overrides
                    draft.inputSettings.overrides = draft.inputSettings.overrides?.filter(o => o.themeId !== id) || [];
                }, createSliceMeta('theme.deleteTheme'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] deleteTheme 失败:', error);
                set({ themeError: error.message || '删除主题失败', themeLoading: false });
            }
        },

        // ============== 批量操作 ==============

        batchUpdateThemes: async (themeIds: string[], updates: Partial<ThemeDefinition>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    themeIds.forEach(id => {
                        const theme = draft.inputSettings.themes?.find(t => t.id === id);
                        if (theme) {
                            Object.assign(theme, updates);
                        }
                    });
                }, createSliceMeta('theme.batchUpdateThemes'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchUpdateThemes 失败:', error);
                set({ themeError: error.message || '批量更新主题失败', themeLoading: false });
            }
        },

        batchDeleteThemes: async (themeIds: string[]): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                const themeIdSet = new Set(themeIds);
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.inputSettings.themes = draft.inputSettings.themes?.filter(t => !themeIdSet.has(t.id)) || [];
                    draft.inputSettings.overrides = draft.inputSettings.overrides?.filter(o => !themeIdSet.has(o.themeId)) || [];
                }, createSliceMeta('theme.batchDeleteThemes'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchDeleteThemes 失败:', error);
                set({ themeError: error.message || '批量删除主题失败', themeLoading: false });
            }
        },

        batchUpdateThemeStatus: async (themeIds: string[], status: ActiveStatus): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const themePaths = themeIds
                        .map(id => draft.inputSettings.themes?.find(t => t.id === id)?.path)
                        .filter(Boolean) as string[];

                    if (!draft.activeThemePaths) {
                        draft.activeThemePaths = [];
                    }

                    if (status === 'active') {
                        themePaths.forEach(path => {
                            if (!draft.activeThemePaths!.includes(path)) {
                                draft.activeThemePaths!.push(path);
                            }
                        });
                    } else {
                        draft.activeThemePaths = draft.activeThemePaths.filter(path => !themePaths.includes(path));
                    }
                }, createSliceMeta('theme.batchUpdateThemeStatus'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchUpdateThemeStatus 失败:', error);
                set({ themeError: error.message || '批量更新主题状态失败', themeLoading: false });
            }
        },

        batchUpdateThemeIcon: async (themeIds: string[], icon: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    themeIds.forEach(id => {
                        const theme = draft.inputSettings.themes?.find(t => t.id === id);
                        if (theme) {
                            theme.icon = icon;
                        }
                    });
                }, createSliceMeta('theme.batchUpdateThemeIcon'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchUpdateThemeIcon 失败:', error);
                set({ themeError: error.message || '批量更新主题图标失败', themeLoading: false });
            }
        },

        // ============== Override 操作 ==============

        upsertOverride: async (overrideData: Omit<ThemeOverride, 'id'>): Promise<ThemeOverride | null> => {
            const state = get();
            if (!state.isInitialized) return null;

            set({ themeLoading: true, themeError: null });

            try {
                let resultOverride: ThemeOverride | null = null;
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const existingIndex = draft.inputSettings.overrides?.findIndex(
                        o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId
                    ) ?? -1;

                    if (existingIndex > -1) {
                        Object.assign(draft.inputSettings.overrides![existingIndex], overrideData);
                        resultOverride = draft.inputSettings.overrides![existingIndex];
                    } else {
                        const newOverride: ThemeOverride = {
                            ...overrideData,
                            id: generateId('ovr')
                        } as ThemeOverride;
                        if (!draft.inputSettings.overrides) {
                            draft.inputSettings.overrides = [];
                        }
                        draft.inputSettings.overrides.push(newOverride);
                        resultOverride = newOverride;
                    }
                }, createSliceMeta('theme.upsertOverride'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
                return resultOverride;
            } catch (error: any) {
                console.error('[ThemeSlice] upsertOverride 失败:', error);
                set({ themeError: error.message || '更新覆盖配置失败', themeLoading: false });
                return null;
            }
        },

        deleteOverride: async (blockId: string, themeId: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.inputSettings.overrides = draft.inputSettings.overrides?.filter(
                        o => !(o.blockId === blockId && o.themeId === themeId)
                    ) || [];
                }, createSliceMeta('theme.deleteOverride'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] deleteOverride 失败:', error);
                set({ themeError: error.message || '删除覆盖配置失败', themeLoading: false });
            }
        },

        batchUpsertOverrides: async (overrides: Array<Omit<ThemeOverride, 'id'>>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    for (const overrideData of overrides) {
                        const existingIndex = draft.inputSettings.overrides?.findIndex(
                            o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId
                        ) ?? -1;

                        if (existingIndex > -1) {
                            Object.assign(draft.inputSettings.overrides![existingIndex], overrideData);
                        } else {
                            if (!draft.inputSettings.overrides) {
                                draft.inputSettings.overrides = [];
                            }
                            draft.inputSettings.overrides.push({
                                ...overrideData,
                                id: generateId('ovr')
                            } as ThemeOverride);
                        }
                    }
                }, createSliceMeta('theme.batchUpsertOverrides'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchUpsertOverrides 失败:', error);
                set({ themeError: error.message || '批量更新覆盖配置失败', themeLoading: false });
            }
        },

        batchDeleteOverrides: async (selections: Array<{blockId: string; themeId: string}>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                const selectionSet = new Set(selections.map(s => `${s.blockId}:${s.themeId}`));
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.inputSettings.overrides = draft.inputSettings.overrides?.filter(
                        o => !selectionSet.has(`${o.blockId}:${o.themeId}`)
                    ) || [];
                }, createSliceMeta('theme.batchDeleteOverrides'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchDeleteOverrides 失败:', error);
                set({ themeError: error.message || '批量删除覆盖配置失败', themeLoading: false });
            }
        },

        batchSetOverrideStatus: async (cells: Array<{ themeId: string; blockId: string }>, status: 'inherit' | 'override' | 'disabled'): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ themeLoading: true, themeError: null });

            try {
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    if (status === 'inherit') {
                        const cellKeys = new Set(cells.map(c => `${c.themeId}:${c.blockId}`));
                        draft.inputSettings.overrides = draft.inputSettings.overrides?.filter(
                            o => !cellKeys.has(`${o.themeId}:${o.blockId}`)
                        ) || [];
                    } else {
                        cells.forEach(cell => {
                            const existingIndex = draft.inputSettings.overrides?.findIndex(
                                o => o.blockId === cell.blockId && o.themeId === cell.themeId
                            ) ?? -1;

                            if (existingIndex > -1) {
                                if (status === 'disabled') {
                                    draft.inputSettings.overrides![existingIndex].disabled = true;
                                } else {
                                    delete draft.inputSettings.overrides![existingIndex].disabled;
                                }
                            } else {
                                if (!draft.inputSettings.overrides) {
                                    draft.inputSettings.overrides = [];
                                }
                                const newOverride: ThemeOverride = {
                                    id: generateId('ovr'),
                                    themeId: cell.themeId,
                                    blockId: cell.blockId,
                                } as ThemeOverride;
                                if (status === 'disabled') {
                                    newOverride.disabled = true;
                                }
                                draft.inputSettings.overrides.push(newOverride);
                            }
                        });
                    }
                }, createSliceMeta('theme.batchSetOverrideStatus'));
                // S2: settings 由 ServiceManager 订阅 SettingsRepository 统一更新
                set({ themeLoading: false });
            } catch (error: any) {
                console.error('[ThemeSlice] batchSetOverrideStatus 失败:', error);
                set({ themeError: error.message || '批量设置覆盖状态失败', themeLoading: false });
            }
        },

        // ============== 查询方法 ==============

        getThemes: (): ThemeDefinition[] => {
            const state = get();
            return state.settings.inputSettings?.themes || [];
        },

        getTheme: (id: string): ThemeDefinition | undefined => {
            const state = get();
            return state.settings.inputSettings?.themes?.find(t => t.id === id);
        },

        getOverrides: (): ThemeOverride[] => {
            const state = get();
            return state.settings.inputSettings?.overrides || [];
        },

        getOverride: (blockId: string, themeId: string): ThemeOverride | undefined => {
            const state = get();
            return state.settings.inputSettings?.overrides?.find(
                o => o.blockId === blockId && o.themeId === themeId
            );
        },

        // ============== 状态管理 ==============

        setThemeError: (error: string | null) => {
            set({ themeError: error });
        },
    });
}
