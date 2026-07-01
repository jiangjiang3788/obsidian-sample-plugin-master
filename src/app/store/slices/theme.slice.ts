// src/app/store/slices/theme.slice.ts
/**
 * ThemeSlice - Zustand Theme 状态切片
 *
 * V11 收敛后：
 * - Slice 只保留 loading/error、查询和 action wiring。
 * - Theme 路径/排序/批量变更进入 themeSettingsMutations。
 * - SettingsRepository 写入包装统一交给 settingsMutationRunner。
 */

import type { StateCreator } from 'zustand';
import type { ActiveStatus, ThemeDefinition, ThinkSettings } from '@core/types/public';
import type { SettingsRepository } from '@core/services/public';
import { devWarn } from '@core/utils/public';
import { createSettingsMutationRunner } from '../mutations/settingsMutationRunner';
import {
    addThemeSettingsDraft,
    batchDeleteThemeSettingsDraft,
    batchPatchThemeSettingsDraft,
    batchSetThemeSettingsIcon,
    batchSetThemeSettingsStatus,
    deleteThemeSettingsDraft,
    makeThemeSettingsDraft,
    normalizeThemeSettingsPath,
    patchThemeSettingsDraft,
    reorderThemeSettingsSiblings,
    themeSettingsPathExists,
} from '../mutations/themeSettingsMutations';

export interface ThemeSliceState {
    themeLoading: boolean;
    themeError: string | null;
}

export interface ThemeSliceActions {
    addTheme: (path: string) => Promise<ThemeDefinition | null>;
    updateTheme: (id: string, updates: Partial<ThemeDefinition>) => Promise<void>;
    deleteTheme: (id: string) => Promise<void>;
    reorderThemeSiblings: (orderedThemeIds: string[], parentKey?: string) => Promise<void>;
    batchUpdateThemes: (themeIds: string[], updates: Partial<ThemeDefinition>) => Promise<void>;
    batchDeleteThemes: (themeIds: string[]) => Promise<void>;
    batchUpdateThemeStatus: (themeIds: string[], status: ActiveStatus) => Promise<void>;
    batchUpdateThemeIcon: (themeIds: string[], icon: string) => Promise<void>;
    getThemes: () => ThemeDefinition[];
    getTheme: (id: string) => ThemeDefinition | undefined;
    setThemeError: (error: string | null) => void;
}

export type ThemeSlice = ThemeSliceState & ThemeSliceActions;

type ThemeSliceStoreState = ThemeSlice & { settings: ThinkSettings; isInitialized: boolean };

export function createThemeSlice(
    settingsRepository: SettingsRepository,
): StateCreator<ThemeSliceStoreState, [], [], ThemeSlice> {
    return (set, get) => {
        const setThemeStatus = (loading: boolean, error: string | null): void => {
            set({ themeLoading: loading, themeError: error });
        };
        const runThemeMutation = createSettingsMutationRunner({
            sliceName: 'ThemeSlice',
            repository: settingsRepository,
            getState: get,
            setStatus: setThemeStatus,
        });

        return {
            themeLoading: false,
            themeError: null,

            addTheme: async (path: string): Promise<ThemeDefinition | null> => {
                const normalizedPath = normalizeThemeSettingsPath(path);
                if (!normalizedPath) {
                    devWarn('[ThemeSlice] 主题路径不能为空');
                    return null;
                }

                const existingThemes = get().settings.inputSettings?.themes || [];
                if (themeSettingsPathExists(existingThemes, normalizedPath)) {
                    devWarn(`[ThemeSlice] 主题路径 "${normalizedPath}" 已存在`);
                    return null;
                }

                const newTheme = makeThemeSettingsDraft(normalizedPath, existingThemes);
                const result = await runThemeMutation({
                    action: 'theme.addTheme',
                    fallbackError: '添加主题失败',
                    mutate: (draft) => addThemeSettingsDraft(draft, newTheme),
                    onSuccess: () => newTheme,
                    onUninitialized: () => null,
                    onError: () => null,
                });
                return result ?? null;
            },

            updateTheme: async (id: string, updates: Partial<ThemeDefinition>): Promise<void> => {
                const normalizedUpdates = updates.path
                    ? { ...updates, path: normalizeThemeSettingsPath(updates.path) }
                    : updates;

                if (normalizedUpdates.path) {
                    const existingThemes = get().settings.inputSettings?.themes || [];
                    if (themeSettingsPathExists(existingThemes, normalizedUpdates.path, id)) {
                        devWarn(`[ThemeSlice] 主题路径 "${normalizedUpdates.path}" 已存在`);
                        return;
                    }
                }

                await runThemeMutation({
                    action: 'theme.updateTheme',
                    fallbackError: '更新主题失败',
                    mutate: (draft) => patchThemeSettingsDraft(draft, id, normalizedUpdates),
                });
            },

            deleteTheme: async (id: string): Promise<void> => {
                await runThemeMutation({
                    action: 'theme.deleteTheme',
                    fallbackError: '删除主题失败',
                    mutate: (draft) => deleteThemeSettingsDraft(draft, id),
                });
            },

            reorderThemeSiblings: async (orderedThemeIds: string[], parentKey?: string): Promise<void> => {
                void parentKey;
                if (!orderedThemeIds || orderedThemeIds.length === 0) return;
                await runThemeMutation({
                    action: 'theme.reorderThemeSiblings',
                    fallbackError: '主题排序失败',
                    mutate: (draft) => reorderThemeSettingsSiblings(draft, orderedThemeIds),
                });
            },

            batchUpdateThemes: async (themeIds: string[], updates: Partial<ThemeDefinition>): Promise<void> => {
                await runThemeMutation({
                    action: 'theme.batchUpdateThemes',
                    fallbackError: '批量更新主题失败',
                    mutate: (draft) => batchPatchThemeSettingsDraft(draft, themeIds, updates),
                });
            },

            batchDeleteThemes: async (themeIds: string[]): Promise<void> => {
                await runThemeMutation({
                    action: 'theme.batchDeleteThemes',
                    fallbackError: '批量删除主题失败',
                    mutate: (draft) => batchDeleteThemeSettingsDraft(draft, themeIds),
                });
            },

            batchUpdateThemeStatus: async (themeIds: string[], status: ActiveStatus): Promise<void> => {
                await runThemeMutation({
                    action: 'theme.batchUpdateThemeStatus',
                    fallbackError: '批量更新主题状态失败',
                    mutate: (draft) => batchSetThemeSettingsStatus(draft, themeIds, status),
                });
            },

            batchUpdateThemeIcon: async (themeIds: string[], icon: string): Promise<void> => {
                await runThemeMutation({
                    action: 'theme.batchUpdateThemeIcon',
                    fallbackError: '批量更新主题图标失败',
                    mutate: (draft) => batchSetThemeSettingsIcon(draft, themeIds, icon),
                });
            },

            getThemes: (): ThemeDefinition[] => get().settings.inputSettings?.themes || [],
            getTheme: (id: string): ThemeDefinition | undefined => (
                get().settings.inputSettings?.themes?.find((theme) => theme.id === id)
            ),

            setThemeError: (error: string | null): void => {
                set({ themeError: error });
            },
        };
    };
}
