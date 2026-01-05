// src/app/store/slices/layout.slice.ts
/**
 * LayoutSlice - Zustand Layout 状态切片
 * Role: Store Slice (状态管理)
 * 
 * Do:
 * - 管理 Layout 相关状态
 * - 提供 Layout 相关 actions
 * - 委托 IO 给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 持有 UI 逻辑
 */

import type { StateCreator } from 'zustand';
import type { ThinkSettings, Layout } from '@/core/types/schema';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import { generateId, moveItemInArray } from '@core/utils/array';

// ============== 类型定义 ==============

export interface LayoutSliceState {
    layoutLoading: boolean;
    layoutError: string | null;
}

export interface LayoutSliceActions {
    // Layout CRUD
    addLayout: (name: string, parentId?: string | null) => Promise<Layout | null>;
    updateLayout: (id: string, updates: Partial<Layout>) => Promise<void>;
    deleteLayout: (id: string) => Promise<void>;
    moveLayout: (id: string, direction: 'up' | 'down') => Promise<void>;
    duplicateLayout: (id: string) => Promise<Layout | null>;
    
    // 批量操作
    batchUpdateLayouts: (layoutIds: string[], updates: Partial<Layout>) => Promise<void>;
    batchDeleteLayouts: (layoutIds: string[]) => Promise<void>;
    
    // 层级操作
    moveLayoutToParent: (layoutId: string, newParentId: string | null) => Promise<void>;
    
    // ViewInstance 关联操作
    addViewInstanceToLayout: (layoutId: string, viewInstanceId: string) => Promise<void>;
    removeViewInstanceFromLayout: (layoutId: string, viewInstanceId: string) => Promise<void>;
    reorderViewInstancesInLayout: (layoutId: string, viewInstanceIds: string[]) => Promise<void>;
    
    // 查询方法
    getLayouts: () => Layout[];
    getLayout: (id: string) => Layout | undefined;
    getLayoutsByParent: (parentId: string | null) => Layout[];
    getTopLevelLayouts: () => Layout[];
    
    // 状态管理
    setLayoutError: (error: string | null) => void;
}

export type LayoutSlice = LayoutSliceState & LayoutSliceActions;

// ============== Slice 创建器 ==============

/**
 * 创建 Layout Slice
 * @param settingsRepository 设置仓库（用于持久化）
 */
export function createLayoutSlice(
    settingsRepository: SettingsRepository
): StateCreator<
    LayoutSlice & { settings: ThinkSettings; isInitialized: boolean },
    [],
    [],
    LayoutSlice
> {
    return (set, get) => ({
        // ============== 初始状态 ==============
        layoutLoading: false,
        layoutError: null,

        // ============== Layout CRUD ==============

        addLayout: async (name: string, parentId: string | null = null): Promise<Layout | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return null;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                const newLayout: Layout = {
                    id: generateId('layout'),
                    name,
                    viewInstanceIds: [],
                    displayMode: 'list',
                    initialView: '月',
                    initialDateFollowsNow: true,
                    parentId
                };

                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.layouts) {
                        draft.layouts = [];
                    }
                    draft.layouts.push(newLayout);
                });

                set({ settings: newSettings, layoutLoading: false });
                return newLayout;
            } catch (error: any) {
                console.error('[LayoutSlice] addLayout 失败:', error);
                set({ layoutError: error.message || '添加布局失败', layoutLoading: false });
                return null;
            }
        },

        updateLayout: async (id: string, updates: Partial<Layout>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === id);
                    if (layout) {
                        Object.assign(layout, updates);
                    }
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] updateLayout 失败:', error);
                set({ layoutError: error.message || '更新布局失败', layoutLoading: false });
            }
        },

        deleteLayout: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.layouts = draft.layouts?.filter(l => l.id !== id) || [];
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] deleteLayout 失败:', error);
                set({ layoutError: error.message || '删除布局失败', layoutLoading: false });
            }
        },

        moveLayout: async (id: string, direction: 'up' | 'down'): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.layouts = moveItemInArray(draft.layouts || [], id, direction);
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] moveLayout 失败:', error);
                set({ layoutError: error.message || '移动布局失败', layoutLoading: false });
            }
        },

        duplicateLayout: async (id: string): Promise<Layout | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return null;
            }

            const original = state.settings.layouts?.find(l => l.id === id);
            if (!original) {
                console.warn(`[LayoutSlice] 找不到ID为 ${id} 的布局`);
                return null;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                const newLayout: Layout = {
                    ...original,
                    id: generateId('layout'),
                    name: `${original.name} (副本)`
                };

                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.layouts) {
                        draft.layouts = [];
                    }
                    draft.layouts.push(newLayout);
                });

                set({ settings: newSettings, layoutLoading: false });
                return newLayout;
            } catch (error: any) {
                console.error('[LayoutSlice] duplicateLayout 失败:', error);
                set({ layoutError: error.message || '复制布局失败', layoutLoading: false });
                return null;
            }
        },

        // ============== 批量操作 ==============

        batchUpdateLayouts: async (layoutIds: string[], updates: Partial<Layout>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    layoutIds.forEach(id => {
                        const layout = draft.layouts?.find(l => l.id === id);
                        if (layout) {
                            Object.assign(layout, updates);
                        }
                    });
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] batchUpdateLayouts 失败:', error);
                set({ layoutError: error.message || '批量更新布局失败', layoutLoading: false });
            }
        },

        batchDeleteLayouts: async (layoutIds: string[]): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const layoutIdSet = new Set(layoutIds);
                const newSettings = await settingsRepository.update(draft => {
                    draft.layouts = draft.layouts?.filter(l => !layoutIdSet.has(l.id)) || [];
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] batchDeleteLayouts 失败:', error);
                set({ layoutError: error.message || '批量删除布局失败', layoutLoading: false });
            }
        },

        // ============== 层级操作 ==============

        moveLayoutToParent: async (layoutId: string, newParentId: string | null): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.parentId = newParentId;
                    }
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] moveLayoutToParent 失败:', error);
                set({ layoutError: error.message || '移动布局失败', layoutLoading: false });
            }
        },

        // ============== ViewInstance 关联操作 ==============

        addViewInstanceToLayout: async (layoutId: string, viewInstanceId: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout && !layout.viewInstanceIds.includes(viewInstanceId)) {
                        layout.viewInstanceIds.push(viewInstanceId);
                    }
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] addViewInstanceToLayout 失败:', error);
                set({ layoutError: error.message || '添加视图实例失败', layoutLoading: false });
            }
        },

        removeViewInstanceFromLayout: async (layoutId: string, viewInstanceId: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.viewInstanceIds = layout.viewInstanceIds.filter(id => id !== viewInstanceId);
                    }
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] removeViewInstanceFromLayout 失败:', error);
                set({ layoutError: error.message || '移除视图实例失败', layoutLoading: false });
            }
        },

        reorderViewInstancesInLayout: async (layoutId: string, viewInstanceIds: string[]): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.viewInstanceIds = viewInstanceIds;
                    }
                });
                set({ settings: newSettings, layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] reorderViewInstancesInLayout 失败:', error);
                set({ layoutError: error.message || '重排视图实例失败', layoutLoading: false });
            }
        },

        // ============== 查询方法 ==============

        getLayouts: (): Layout[] => {
            const state = get();
            return state.settings.layouts || [];
        },

        getLayout: (id: string): Layout | undefined => {
            const state = get();
            return state.settings.layouts?.find(l => l.id === id);
        },

        getLayoutsByParent: (parentId: string | null): Layout[] => {
            const state = get();
            return (state.settings.layouts || []).filter(l => l.parentId === parentId);
        },

        getTopLevelLayouts: (): Layout[] => {
            const state = get();
            return (state.settings.layouts || []).filter(l => !l.parentId);
        },

        // ============== 状态管理 ==============

        setLayoutError: (error: string | null) => {
            set({ layoutError: error });
        },
    });
}
