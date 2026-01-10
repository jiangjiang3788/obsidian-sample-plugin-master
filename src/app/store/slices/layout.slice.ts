// src/app/store/slices/layout.slice.ts
/**
 * LayoutSlice - Zustand Layout 状态切片
 * Role: Store Slice (状态管理) - 底层实现
 * 
 * 【S2 规范】Settings 真同源
 * - SettingsRepository 是 settings 的唯一写入口
 * - 本 Slice 只调用 settingsRepository.update()，不直接写 settings
 * - settings 由 ServiceManager 订阅 SettingsRepository 后统一同步到 Zustand
 * - 本 Slice 只管理辅助状态：layoutLoading、layoutError
 * 
 * 【S5 规范】唯一写入口
 * ⚠️ Layout actions 仅作为 useCases.layout 的底层实现！
 * - features 层必须通过 useCases.layout.* 调用布局相关操作
 * - 例如：useCases.layout.addLayout() 内部转调 slice.addLayout()
 * 
 * Do:
 * - 管理 Layout 相关辅助状态（loading/error）
 * - 提供 Layout 相关 actions，委托写操作给 SettingsRepository
 * - 委托 IO 给 SettingsRepository
 * - 作为 layout.usecase.ts 的底层实现被调用
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 直接写 settings（禁止 set({ settings: ... })）
 * - 持有 UI 逻辑
 * - 被 features 层（src/features/*）直接 import 使用
 */

import type { StateCreator } from 'zustand';
import type { ThinkSettings, Layout } from '@/core/types/schema';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import { generateId } from '@/shared/utils/array';
import { moveItemInArray } from '@core/utils/array';
import { createSliceMeta } from '@/shared/types/ActionMeta';

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
    reorderLayouts: (orderedIds: string[]) => Promise<void>;
    
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

                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    if (!draft.layouts) {
                        draft.layouts = [];
                    }
                    draft.layouts.push(newLayout);
                }, createSliceMeta('layout.addLayout'));

                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === id);
                    if (layout) {
                        Object.assign(layout, updates);
                    }
                }, createSliceMeta('layout.updateLayout'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.layouts = draft.layouts?.filter(l => l.id !== id) || [];
                }, createSliceMeta('layout.deleteLayout'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.layouts = moveItemInArray(draft.layouts || [], id, direction);
                }, createSliceMeta('layout.moveLayout'));
                set({ layoutLoading: false });
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

                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    if (!draft.layouts) {
                        draft.layouts = [];
                    }
                    draft.layouts.push(newLayout);
                }, createSliceMeta('layout.duplicateLayout'));

                set({ layoutLoading: false });
                return newLayout;
            } catch (error: any) {
                console.error('[LayoutSlice] duplicateLayout 失败:', error);
                set({ layoutError: error.message || '复制布局失败', layoutLoading: false });
                return null;
            }
        },

        reorderLayouts: async (orderedIds: string[]): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[LayoutSlice] Store 未初始化');
                return;
            }

            set({ layoutLoading: true, layoutError: null });

            try {
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layouts = draft.layouts || [];
                    const layoutMap = new Map(layouts.map(l => [l.id, l]));
                    // 按 orderedIds 顺序重排，保留未在 orderedIds 中的 layouts
                    const reordered = orderedIds
                        .map(id => layoutMap.get(id))
                        .filter((l): l is Layout => l !== undefined);
                    // 添加未在 orderedIds 中的剩余 layouts
                    const orderedSet = new Set(orderedIds);
                    const remaining = layouts.filter(l => !orderedSet.has(l.id));
                    draft.layouts = [...reordered, ...remaining];
                }, createSliceMeta('layout.reorderLayouts'));
                set({ layoutLoading: false });
            } catch (error: any) {
                console.error('[LayoutSlice] reorderLayouts 失败:', error);
                set({ layoutError: error.message || '重排布局失败', layoutLoading: false });
            }
        },

        // ============== 批量操作 ==============

        batchUpdateLayouts: async (layoutIds: string[], updates: Partial<Layout>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) return;

            set({ layoutLoading: true, layoutError: null });

            try {
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    layoutIds.forEach(id => {
                        const layout = draft.layouts?.find(l => l.id === id);
                        if (layout) {
                            Object.assign(layout, updates);
                        }
                    });
                }, createSliceMeta('layout.batchUpdateLayouts'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    draft.layouts = draft.layouts?.filter(l => !layoutIdSet.has(l.id)) || [];
                }, createSliceMeta('layout.batchDeleteLayouts'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.parentId = newParentId;
                    }
                }, createSliceMeta('layout.moveLayoutToParent'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout && !layout.viewInstanceIds.includes(viewInstanceId)) {
                        layout.viewInstanceIds.push(viewInstanceId);
                    }
                }, createSliceMeta('layout.addViewInstanceToLayout'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.viewInstanceIds = layout.viewInstanceIds.filter(id => id !== viewInstanceId);
                    }
                }, createSliceMeta('layout.removeViewInstanceFromLayout'));
                set({ layoutLoading: false });
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
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                // S1: 传入 ActionMeta 用于 dev 日志
                await settingsRepository.update(draft => {
                    const layout = draft.layouts?.find(l => l.id === layoutId);
                    if (layout) {
                        layout.viewInstanceIds = viewInstanceIds;
                    }
                }, createSliceMeta('layout.reorderViewInstancesInLayout'));
                set({ layoutLoading: false });
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
