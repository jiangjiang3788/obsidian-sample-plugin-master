// src/app/store/slices/layout.slice.ts
/**
 * LayoutSlice - Zustand Layout 状态切片
 *
 * V11 收敛后：
 * - Slice 只保留 loading/error、查询和 action wiring。
 * - SettingsRepository 写入包装统一交给 settingsMutationRunner。
 * - Layout 数据结构变更交给 layoutSettingsMutations 纯函数。
 */

import type { StateCreator } from 'zustand';
import type { Layout, ThinkSettings, ViewPlacement } from '@core/types/public';
import type { SettingsRepository } from '@core/services/public';
import { devWarn } from '@core/utils/public';
import { createSettingsMutationRunner } from '../mutations/settingsMutationRunner';
import {
    addLayoutSettingsDraft,
    addLayoutSettingsViewInstance,
    batchDeleteLayoutSettingsDraft,
    batchPatchLayoutSettingsDraft,
    cloneLayoutSettingsDraft,
    deleteLayoutSettingsDraft,
    makeLayoutSettingsDraft,
    moveLayoutSettingsDraft,
    moveLayoutSettingsParentDraft,
    removeLayoutSettingsViewInstance,
    reorderLayoutSettingsDraft,
    reorderLayoutSettingsViewInstances,
    replaceLayoutSettingsViewPlacements,
    resetLayoutSettingsFreeform,
    patchLayoutSettingsDraft,
    updateLayoutSettingsViewPlacement,
} from '../mutations/layoutSettingsMutations';

export interface LayoutSliceState {
    layoutLoading: boolean;
    layoutError: string | null;
}

export interface LayoutSliceActions {
    addLayout: (name: string, parentId?: string | null) => Promise<Layout | null>;
    updateLayout: (id: string, updates: Partial<Layout>) => Promise<void>;
    deleteLayout: (id: string) => Promise<void>;
    moveLayout: (id: string, direction: 'up' | 'down') => Promise<void>;
    duplicateLayout: (id: string) => Promise<Layout | null>;
    reorderLayouts: (orderedIds: string[]) => Promise<void>;
    batchUpdateLayouts: (layoutIds: string[], updates: Partial<Layout>) => Promise<void>;
    batchDeleteLayouts: (layoutIds: string[]) => Promise<void>;
    moveLayoutToParent: (layoutId: string, newParentId: string | null) => Promise<void>;
    addViewInstanceToLayout: (layoutId: string, viewInstanceId: string) => Promise<void>;
    removeViewInstanceFromLayout: (layoutId: string, viewInstanceId: string) => Promise<void>;
    reorderViewInstancesInLayout: (layoutId: string, viewInstanceIds: string[]) => Promise<void>;
    updateViewPlacement: (layoutId: string, viewInstanceId: string, placement: ViewPlacement) => Promise<void>;
    updateViewPlacements: (layoutId: string, placements: Record<string, ViewPlacement>) => Promise<void>;
    resetFreeformLayout: (layoutId: string) => Promise<void>;
    getLayouts: () => Layout[];
    getLayout: (id: string) => Layout | undefined;
    getLayoutsByParent: (parentId: string | null) => Layout[];
    getTopLevelLayouts: () => Layout[];
    setLayoutError: (error: string | null) => void;
}

export type LayoutSlice = LayoutSliceState & LayoutSliceActions;

type LayoutSliceStoreState = LayoutSlice & { settings: ThinkSettings; isInitialized: boolean };

export function createLayoutSlice(
    settingsRepository: SettingsRepository,
): StateCreator<LayoutSliceStoreState, [], [], LayoutSlice> {
    return (set, get) => {
        const setLayoutStatus = (loading: boolean, error: string | null): void => {
            set({ layoutLoading: loading, layoutError: error });
        };
        const runLayoutMutation = createSettingsMutationRunner({
            sliceName: 'LayoutSlice',
            repository: settingsRepository,
            getState: get,
            setStatus: setLayoutStatus,
        });

        return {
            layoutLoading: false,
            layoutError: null,

            addLayout: async (name: string, parentId: string | null = null): Promise<Layout | null> => {
                const newLayout = makeLayoutSettingsDraft(name, parentId);
                const result = await runLayoutMutation({
                    action: 'layout.addLayout',
                    fallbackError: '添加布局失败',
                    mutate: (draft) => addLayoutSettingsDraft(draft, newLayout),
                    onSuccess: () => newLayout,
                    onUninitialized: () => null,
                    onError: () => null,
                });
                return result ?? null;
            },

            updateLayout: async (id: string, updates: Partial<Layout>): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.updateLayout',
                    fallbackError: '更新布局失败',
                    mutate: (draft) => patchLayoutSettingsDraft(draft, id, updates),
                });
            },

            deleteLayout: async (id: string): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.deleteLayout',
                    fallbackError: '删除布局失败',
                    mutate: (draft) => deleteLayoutSettingsDraft(draft, id),
                });
            },

            moveLayout: async (id: string, direction: 'up' | 'down'): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.moveLayout',
                    fallbackError: '移动布局失败',
                    mutate: (draft) => moveLayoutSettingsDraft(draft, id, direction),
                });
            },

            duplicateLayout: async (id: string): Promise<Layout | null> => {
                const original = get().settings.layouts?.find((layout) => layout.id === id);
                if (!original) {
                    devWarn(`[LayoutSlice] 找不到ID为 ${id} 的布局`);
                    return null;
                }

                const newLayout = cloneLayoutSettingsDraft(original);
                const result = await runLayoutMutation({
                    action: 'layout.duplicateLayout',
                    fallbackError: '复制布局失败',
                    mutate: (draft) => addLayoutSettingsDraft(draft, newLayout),
                    onSuccess: () => newLayout,
                    onUninitialized: () => null,
                    onError: () => null,
                });
                return result ?? null;
            },

            reorderLayouts: async (orderedIds: string[]): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.reorderLayouts',
                    fallbackError: '重排布局失败',
                    mutate: (draft) => reorderLayoutSettingsDraft(draft, orderedIds),
                });
            },

            batchUpdateLayouts: async (layoutIds: string[], updates: Partial<Layout>): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.batchUpdateLayouts',
                    fallbackError: '批量更新布局失败',
                    mutate: (draft) => batchPatchLayoutSettingsDraft(draft, layoutIds, updates),
                });
            },

            batchDeleteLayouts: async (layoutIds: string[]): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.batchDeleteLayouts',
                    fallbackError: '批量删除布局失败',
                    mutate: (draft) => batchDeleteLayoutSettingsDraft(draft, layoutIds),
                });
            },

            moveLayoutToParent: async (layoutId: string, newParentId: string | null): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.moveLayoutToParent',
                    fallbackError: '移动布局失败',
                    mutate: (draft) => moveLayoutSettingsParentDraft(draft, layoutId, newParentId),
                });
            },

            addViewInstanceToLayout: async (layoutId: string, viewInstanceId: string): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.addViewInstanceToLayout',
                    fallbackError: '添加视图实例失败',
                    mutate: (draft) => addLayoutSettingsViewInstance(draft, layoutId, viewInstanceId),
                });
            },

            removeViewInstanceFromLayout: async (layoutId: string, viewInstanceId: string): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.removeViewInstanceFromLayout',
                    fallbackError: '移除视图实例失败',
                    mutate: (draft) => removeLayoutSettingsViewInstance(draft, layoutId, viewInstanceId),
                });
            },

            reorderViewInstancesInLayout: async (layoutId: string, viewInstanceIds: string[]): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.reorderViewInstancesInLayout',
                    fallbackError: '重排视图实例失败',
                    mutate: (draft) => reorderLayoutSettingsViewInstances(draft, layoutId, viewInstanceIds),
                });
            },

            updateViewPlacement: async (
                layoutId: string,
                viewInstanceId: string,
                placement: ViewPlacement,
            ): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.updateViewPlacement',
                    fallbackError: '更新自由布局位置失败',
                    mutate: (draft) => updateLayoutSettingsViewPlacement(draft, layoutId, viewInstanceId, placement),
                });
            },

            updateViewPlacements: async (
                layoutId: string,
                placements: Record<string, ViewPlacement>,
            ): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.updateViewPlacements',
                    fallbackError: '批量更新自由布局位置失败',
                    mutate: (draft) => replaceLayoutSettingsViewPlacements(draft, layoutId, placements),
                });
            },

            resetFreeformLayout: async (layoutId: string): Promise<void> => {
                await runLayoutMutation({
                    action: 'layout.resetFreeformLayout',
                    fallbackError: '重置自由布局失败',
                    mutate: (draft) => resetLayoutSettingsFreeform(draft, layoutId),
                });
            },

            getLayouts: (): Layout[] => get().settings.layouts || [],
            getLayout: (id: string): Layout | undefined => get().settings.layouts?.find((layout) => layout.id === id),
            getLayoutsByParent: (parentId: string | null): Layout[] => (
                get().settings.layouts || []
            ).filter((layout) => layout.parentId === parentId),
            getTopLevelLayouts: (): Layout[] => (
                get().settings.layouts || []
            ).filter((layout) => !layout.parentId),

            setLayoutError: (error: string | null): void => {
                set({ layoutError: error });
            },
        };
    };
}
