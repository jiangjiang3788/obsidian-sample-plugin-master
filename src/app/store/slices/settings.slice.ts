// src/app/store/slices/settings.slice.ts
/**
 * SettingsSlice - Zustand Settings 状态切片
 * Role: Store Slice (状态管理)
 * 
 * Do:
 * - 管理通用 Settings 相关状态
 * - 提供 Settings 相关 actions
 * - 委托 IO 给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 持有 UI 逻辑
 */

import type { StateCreator } from 'zustand';
import type { ThinkSettings, InputSettings, ViewInstance } from '@/core/types/schema';
import type { AiSettings } from '@/core/types/ai-schema';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import { generateId } from '@core/utils/array';

// ============== 类型定义 ==============

export interface SettingsSliceState {
    // 临时 UI 状态
    isTimerWidgetVisible: boolean;
    settingsLoading: boolean;
    settingsError: string | null;
}

export interface SettingsSliceActions {
    // 悬浮计时器
    setFloatingTimerEnabled: (enabled: boolean) => Promise<void>;
    toggleTimerWidgetVisibility: () => void;
    setTimerWidgetVisible: (visible: boolean) => void;
    
    // 输入设置
    updateInputSettings: (updates: Partial<InputSettings>) => Promise<void>;
    
    // AI 设置
    updateAiSettings: (aiSettings: AiSettings) => Promise<void>;
    
    // 活跃主题路径
    updateActiveThemePaths: (paths: string[]) => Promise<void>;
    addActiveThemePath: (path: string) => Promise<void>;
    removeActiveThemePath: (path: string) => Promise<void>;
    
    // 通用设置更新
    updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<void>;
    batchUpdateSettings: (updates: Partial<ThinkSettings>) => Promise<void>;
    
    // ViewInstance CRUD
    addViewInstance: (title: string) => Promise<ViewInstance | null>;
    updateViewInstance: (id: string, updates: Partial<ViewInstance>) => Promise<void>;
    deleteViewInstance: (id: string) => Promise<void>;
    
    // 重排序
    reorderItems: (items: { id: string }[], type: string) => Promise<void>;
    
    // 查询方法
    getFloatingTimerEnabled: () => boolean;
    getActiveThemePaths: () => string[];
    getInputSettings: () => InputSettings | undefined;
    getAiSettings: () => AiSettings | undefined;
    getViewInstances: () => ViewInstance[];
    
    // 状态管理
    setSettingsError: (error: string | null) => void;
}

export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

// ============== Slice 创建器 ==============

/**
 * 创建 Settings Slice
 * @param settingsRepository 设置仓库（用于持久化）
 */
export function createSettingsSlice(
    settingsRepository: SettingsRepository
): StateCreator<
    SettingsSlice & { settings: ThinkSettings; isInitialized: boolean },
    [],
    [],
    SettingsSlice
> {
    return (set, get) => ({
        // ============== 初始状态 ==============
        isTimerWidgetVisible: false,
        settingsLoading: false,
        settingsError: null,

        // ============== 悬浮计时器 ==============

        setFloatingTimerEnabled: async (enabled: boolean): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.floatingTimerEnabled = enabled;
                });
                // 同步更新临时可见状态
                set({ 
                    settings: newSettings, 
                    isTimerWidgetVisible: enabled,
                    settingsLoading: false 
                });
            } catch (error: any) {
                console.error('[SettingsSlice] setFloatingTimerEnabled 失败:', error);
                set({ 
                    settingsError: error.message || '设置悬浮计时器状态失败',
                    settingsLoading: false 
                });
            }
        },

        toggleTimerWidgetVisibility: (): void => {
            set(state => ({
                isTimerWidgetVisible: !state.isTimerWidgetVisible
            }));
        },

        setTimerWidgetVisible: (visible: boolean): void => {
            set({ isTimerWidgetVisible: visible });
        },

        // ============== 输入设置 ==============

        updateInputSettings: async (updates: Partial<InputSettings>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.inputSettings = { ...draft.inputSettings, ...updates };
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] updateInputSettings 失败:', error);
                set({ 
                    settingsError: error.message || '更新输入设置失败',
                    settingsLoading: false 
                });
            }
        },

        // ============== AI 设置 ==============

        updateAiSettings: async (aiSettings: AiSettings): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.aiSettings = aiSettings;
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] updateAiSettings 失败:', error);
                set({ 
                    settingsError: error.message || 'AI 设置更新失败',
                    settingsLoading: false 
                });
            }
        },

        // ============== 活跃主题路径 ==============

        updateActiveThemePaths: async (paths: string[]): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.activeThemePaths = paths;
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] updateActiveThemePaths 失败:', error);
                set({ settingsError: error.message || '更新活跃主题路径失败', settingsLoading: false });
            }
        },

        addActiveThemePath: async (path: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.activeThemePaths) {
                        draft.activeThemePaths = [];
                    }
                    if (!draft.activeThemePaths.includes(path)) {
                        draft.activeThemePaths.push(path);
                    }
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] addActiveThemePath 失败:', error);
                set({ settingsError: error.message || '添加活跃主题路径失败', settingsLoading: false });
            }
        },

        removeActiveThemePath: async (path: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    if (draft.activeThemePaths) {
                        draft.activeThemePaths = draft.activeThemePaths.filter(p => p !== path);
                    }
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] removeActiveThemePath 失败:', error);
                set({ settingsError: error.message || '移除活跃主题路径失败', settingsLoading: false });
            }
        },

        // ============== 通用设置更新 ==============

        updateSettings: async (mutator: (draft: ThinkSettings) => void): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化，无法更新设置');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(mutator);
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] updateSettings 失败:', error);
                set({ 
                    settingsError: error.message || '更新设置失败',
                    settingsLoading: false 
                });
            }
        },

        batchUpdateSettings: async (updates: Partial<ThinkSettings>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    Object.assign(draft, updates);
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] batchUpdateSettings 失败:', error);
                set({ settingsError: error.message || '批量更新设置失败', settingsLoading: false });
            }
        },

        // ============== 查询方法 ==============

        getFloatingTimerEnabled: (): boolean => {
            const state = get();
            return state.settings.floatingTimerEnabled ?? false;
        },

        getActiveThemePaths: (): string[] => {
            const state = get();
            return state.settings.activeThemePaths || [];
        },

        getInputSettings: (): InputSettings | undefined => {
            const state = get();
            return state.settings.inputSettings;
        },

        getAiSettings: (): AiSettings | undefined => {
            const state = get();
            return state.settings.aiSettings;
        },

        // ============== ViewInstance CRUD ==============

        addViewInstance: async (title: string): Promise<ViewInstance | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return null;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newViewInstance: ViewInstance = {
                    id: generateId('view'),
                    title,
                    viewType: 'BlockView',
                    parentId: null,
                };

                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.viewInstances) {
                        draft.viewInstances = [];
                    }
                    draft.viewInstances.push(newViewInstance);
                });
                set({ settings: newSettings, settingsLoading: false });
                return newViewInstance;
            } catch (error: any) {
                console.error('[SettingsSlice] addViewInstance 失败:', error);
                set({ 
                    settingsError: error.message || '添加视图实例失败',
                    settingsLoading: false 
                });
                return null;
            }
        },

        updateViewInstance: async (id: string, updates: Partial<ViewInstance>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const idx = draft.viewInstances?.findIndex(v => v.id === id) ?? -1;
                    if (idx !== -1 && draft.viewInstances) {
                        draft.viewInstances[idx] = { ...draft.viewInstances[idx], ...updates };
                    }
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] updateViewInstance 失败:', error);
                set({ 
                    settingsError: error.message || '更新视图实例失败',
                    settingsLoading: false 
                });
            }
        },

        deleteViewInstance: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    if (draft.viewInstances) {
                        draft.viewInstances = draft.viewInstances.filter(v => v.id !== id);
                    }
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] deleteViewInstance 失败:', error);
                set({ 
                    settingsError: error.message || '删除视图实例失败',
                    settingsLoading: false 
                });
            }
        },

        // ============== 重排序 ==============

        reorderItems: async (items: { id: string }[], type: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[SettingsSlice] Store 未初始化');
                return;
            }

            set({ settingsLoading: true, settingsError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    if (type === 'layout' && draft.layouts) {
                        // 根据 items 的顺序重排 layouts
                        const orderedIds = items.map(i => i.id);
                        draft.layouts.sort((a, b) => {
                            const aIdx = orderedIds.indexOf(a.id);
                            const bIdx = orderedIds.indexOf(b.id);
                            if (aIdx === -1) return 1;
                            if (bIdx === -1) return -1;
                            return aIdx - bIdx;
                        });
                    } else if (type === 'group' && draft.groups) {
                        const orderedIds = items.map(i => i.id);
                        draft.groups.sort((a, b) => {
                            const aIdx = orderedIds.indexOf(a.id);
                            const bIdx = orderedIds.indexOf(b.id);
                            if (aIdx === -1) return 1;
                            if (bIdx === -1) return -1;
                            return aIdx - bIdx;
                        });
                    } else if (type === 'viewInstance' && draft.viewInstances) {
                        const orderedIds = items.map(i => i.id);
                        draft.viewInstances.sort((a, b) => {
                            const aIdx = orderedIds.indexOf(a.id);
                            const bIdx = orderedIds.indexOf(b.id);
                            if (aIdx === -1) return 1;
                            if (bIdx === -1) return -1;
                            return aIdx - bIdx;
                        });
                    }
                });
                set({ settings: newSettings, settingsLoading: false });
            } catch (error: any) {
                console.error('[SettingsSlice] reorderItems 失败:', error);
                set({ 
                    settingsError: error.message || '重排序失败',
                    settingsLoading: false 
                });
            }
        },

        // ============== 查询方法（续） ==============

        getViewInstances: (): ViewInstance[] => {
            const state = get();
            return state.settings.viewInstances || [];
        },

        // ============== 状态管理 ==============

        setSettingsError: (error: string | null) => {
            set({ settingsError: error });
        },
    });
}
