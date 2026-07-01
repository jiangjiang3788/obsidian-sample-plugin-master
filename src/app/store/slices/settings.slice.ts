// src/app/store/slices/settings.slice.ts
/**
 * SettingsSlice - Zustand Settings 状态切片
 *
 * V11 收敛后：
 * - Slice 只保留 settingsLoading/settingsError、查询和 action wiring。
 * - 通用 settings 数据变更进入 generalSettingsMutations。
 * - SettingsRepository 写入包装统一交给 settingsMutationRunner。
 */

import type { StateCreator } from 'zustand';
import type { AiSettings, InputSettings, ThinkSettings } from '@core/types/public';
import type { SettingsRepository } from '@core/services/public';
import { createSettingsMutationRunner } from '../mutations/settingsMutationRunner';
import {
    addActiveThemePathDraft,
    patchInputSettingsDraft,
    patchSettingsDraft,
    removeActiveThemePathDraft,
    replaceActiveThemePathsDraft,
    replaceAiSettingsDraft,
    setFloatingTimerEnabledDraft,
} from '../mutations/generalSettingsMutations';

export interface SettingsSliceState {
    settingsLoading: boolean;
    settingsError: string | null;
}

export interface SettingsSliceActions {
    setFloatingTimerEnabled: (enabled: boolean) => Promise<void>;
    updateInputSettings: (updates: Partial<InputSettings>) => Promise<void>;
    updateAiSettings: (aiSettings: AiSettings) => Promise<void>;
    updateActiveThemePaths: (paths: string[]) => Promise<void>;
    addActiveThemePath: (path: string) => Promise<void>;
    removeActiveThemePath: (path: string) => Promise<void>;
    updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<void>;
    batchUpdateSettings: (updates: Partial<ThinkSettings>) => Promise<void>;
    getFloatingTimerEnabled: () => boolean;
    getActiveThemePaths: () => string[];
    getInputSettings: () => InputSettings | undefined;
    getAiSettings: () => AiSettings | undefined;
    setSettingsError: (error: string | null) => void;
}

export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

type SettingsSliceStoreState = SettingsSlice & { settings: ThinkSettings; isInitialized: boolean };

export function createSettingsSlice(
    settingsRepository: SettingsRepository,
): StateCreator<SettingsSliceStoreState, [], [], SettingsSlice> {
    return (set, get) => {
        const setSettingsStatus = (loading: boolean, error: string | null): void => {
            set({ settingsLoading: loading, settingsError: error });
        };
        const runSettingsMutation = createSettingsMutationRunner({
            sliceName: 'SettingsSlice',
            repository: settingsRepository,
            getState: get,
            setStatus: setSettingsStatus,
        });

        return {
            settingsLoading: false,
            settingsError: null,

            setFloatingTimerEnabled: async (enabled: boolean): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.setFloatingTimerEnabled',
                    fallbackError: '设置悬浮计时器状态失败',
                    mutate: (draft) => setFloatingTimerEnabledDraft(draft, enabled),
                });
            },

            updateInputSettings: async (updates: Partial<InputSettings>): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.updateInputSettings',
                    fallbackError: '更新输入设置失败',
                    mutate: (draft) => patchInputSettingsDraft(draft, updates),
                });
            },

            updateAiSettings: async (aiSettings: AiSettings): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.updateAiSettings',
                    fallbackError: 'AI 设置更新失败',
                    mutate: (draft) => replaceAiSettingsDraft(draft, aiSettings),
                });
            },

            updateActiveThemePaths: async (paths: string[]): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.updateActiveThemePaths',
                    fallbackError: '更新活跃主题路径失败',
                    mutate: (draft) => replaceActiveThemePathsDraft(draft, paths),
                });
            },

            addActiveThemePath: async (path: string): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.addActiveThemePath',
                    fallbackError: '添加活跃主题路径失败',
                    mutate: (draft) => addActiveThemePathDraft(draft, path),
                });
            },

            removeActiveThemePath: async (path: string): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.removeActiveThemePath',
                    fallbackError: '移除活跃主题路径失败',
                    mutate: (draft) => removeActiveThemePathDraft(draft, path),
                });
            },

            updateSettings: async (mutator: (draft: ThinkSettings) => void): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.updateSettings',
                    fallbackError: '更新设置失败',
                    mutate: mutator,
                });
            },

            batchUpdateSettings: async (updates: Partial<ThinkSettings>): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.batchUpdateSettings',
                    fallbackError: '批量更新设置失败',
                    mutate: (draft) => patchSettingsDraft(draft, updates),
                });
            },

            getFloatingTimerEnabled: (): boolean => get().settings.floatingTimerEnabled ?? false,
            getActiveThemePaths: (): string[] => get().settings.activeThemePaths || [],
            getInputSettings: (): InputSettings | undefined => get().settings.inputSettings,
            getAiSettings: (): AiSettings | undefined => get().settings.aiSettings,

            setSettingsError: (error: string | null): void => {
                set({ settingsError: error });
            },
        };
    };
}
