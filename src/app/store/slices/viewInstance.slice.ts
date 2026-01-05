// src/app/store/slices/viewInstance.slice.ts
/**
 * ViewInstanceSlice - 视图实例状态切片
 * Role: Zustand Slice (状态管理)
 * 
 * Do:
 * - 管理 ViewInstance 相关状态
 * - 提供 ViewInstance CRUD actions
 * - 所有 IO 委托给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 持有 plugin 实例
 * 
 * Note: 使用 vi 前缀避免与 SettingsSlice 中的方法冲突
 */

import type { StateCreator } from 'zustand';
import type { ZustandAppStore } from '../useAppStore';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import type { ViewInstance } from '@/core/types/schema';
import { VIEW_DEFAULT_CONFIGS } from '@features/settings/registry';

// 简单的 ID 生成函数
function generateId(prefix: string): string {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============== 类型定义 ==============

export interface ViewInstanceSlice {
    // ViewInstance CRUD Actions (使用 vi 前缀避免与 SettingsSlice 冲突)
    viAddViewInstance: (title: string, parentId?: string | null) => Promise<ViewInstance | null>;
    viUpdateViewInstance: (id: string, updates: Partial<ViewInstance>) => Promise<void>;
    viDeleteViewInstance: (id: string) => Promise<void>;
    viMoveViewInstance: (id: string, direction: 'up' | 'down') => Promise<void>;
    viDuplicateViewInstance: (id: string) => Promise<ViewInstance | null>;
}

// ============== Slice 工厂 ==============

/**
 * 创建 ViewInstance Slice
 * @param settingsRepository 设置仓库实例
 */
export function createViewInstanceSlice(
    settingsRepository: SettingsRepository
): StateCreator<ZustandAppStore, [], [], ViewInstanceSlice> {
    return (set, get) => ({
        /**
         * 添加视图实例
         */
        viAddViewInstance: async (title: string, parentId: string | null = null): Promise<ViewInstance | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ViewInstanceSlice] Store 未初始化，无法添加视图实例');
                return null;
            }

            set({ isLoading: true, error: null });

            try {
                const newViewInstance: ViewInstance = {
                    id: generateId('view'),
                    title: title,
                    viewType: 'BlockView',
                    dataSourceId: '',
                    viewConfig: JSON.parse(JSON.stringify(VIEW_DEFAULT_CONFIGS.BlockView)),
                    collapsed: true,
                    parentId,
                };

                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.viewInstances) {
                        draft.viewInstances = [];
                    }
                    draft.viewInstances.push(newViewInstance);
                });

                set({ settings: newSettings, isLoading: false });
                return newViewInstance;
            } catch (error: any) {
                console.error('[ViewInstanceSlice] viAddViewInstance 失败:', error);
                set({ error: error.message || '添加视图实例失败', isLoading: false });
                return null;
            }
        },

        /**
         * 更新视图实例
         */
        viUpdateViewInstance: async (id: string, updates: Partial<ViewInstance>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ViewInstanceSlice] Store 未初始化，无法更新视图实例');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const viewInstances = draft.viewInstances || [];
                    const index = viewInstances.findIndex(vi => vi.id === id);
                    if (index !== -1) {
                        const currentInstance = viewInstances[index];
                        // 如果 viewType 改变，需要重置 viewConfig
                        if (updates.viewType && updates.viewType !== currentInstance.viewType) {
                            updates.viewConfig = JSON.parse(JSON.stringify(VIEW_DEFAULT_CONFIGS[updates.viewType]));
                        }
                        Object.assign(viewInstances[index], updates);
                    }
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[ViewInstanceSlice] viUpdateViewInstance 失败:', error);
                set({ error: error.message || '更新视图实例失败', isLoading: false });
            }
        },

        /**
         * 删除视图实例
         */
        viDeleteViewInstance: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ViewInstanceSlice] Store 未初始化，无法删除视图实例');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    draft.viewInstances = draft.viewInstances.filter(vi => vi.id !== id);
                    // 同时从所有布局中移除此视图实例
                    draft.layouts.forEach(layout => {
                        layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => vid !== id);
                    });
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[ViewInstanceSlice] viDeleteViewInstance 失败:', error);
                set({ error: error.message || '删除视图实例失败', isLoading: false });
            }
        },

        /**
         * 移动视图实例（上/下）
         */
        viMoveViewInstance: async (id: string, direction: 'up' | 'down'): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ViewInstanceSlice] Store 未初始化，无法移动视图实例');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const viewInstances = draft.viewInstances || [];
                    const index = viewInstances.findIndex(vi => vi.id === id);
                    if (index === -1) return;

                    const newIndex = direction === 'up' ? index - 1 : index + 1;
                    if (newIndex < 0 || newIndex >= viewInstances.length) return;

                    const [removed] = viewInstances.splice(index, 1);
                    viewInstances.splice(newIndex, 0, removed);
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[ViewInstanceSlice] viMoveViewInstance 失败:', error);
                set({ error: error.message || '移动视图实例失败', isLoading: false });
            }
        },

        /**
         * 复制视图实例
         */
        viDuplicateViewInstance: async (id: string): Promise<ViewInstance | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[ViewInstanceSlice] Store 未初始化，无法复制视图实例');
                return null;
            }

            const viewInstances = state.settings.viewInstances || [];
            const source = viewInstances.find(vi => vi.id === id);
            if (!source) {
                console.error('[ViewInstanceSlice] 找不到要复制的视图实例:', id);
                return null;
            }

            set({ isLoading: true, error: null });

            try {
                const newViewInstance: ViewInstance = {
                    ...JSON.parse(JSON.stringify(source)),
                    id: generateId('view'),
                    title: `${source.title} (副本)`,
                };

                const newSettings = await settingsRepository.update(draft => {
                    const viewInstances = draft.viewInstances || [];
                    const sourceIndex = viewInstances.findIndex(vi => vi.id === id);
                    if (sourceIndex !== -1) {
                        viewInstances.splice(sourceIndex + 1, 0, newViewInstance);
                    } else {
                        viewInstances.push(newViewInstance);
                    }
                });

                set({ settings: newSettings, isLoading: false });
                return newViewInstance;
            } catch (error: any) {
                console.error('[ViewInstanceSlice] viDuplicateViewInstance 失败:', error);
                set({ error: error.message || '复制视图实例失败', isLoading: false });
                return null;
            }
        },
    });
}
