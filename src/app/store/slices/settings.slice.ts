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
import type { AiSettings, ThinkSettings } from '@core/types/public';
import type { SettingsRepository } from '@core/services/public';
import { createSettingsMutationRunner } from '../mutations/settingsMutationRunner';
import {
    patchSettingsDraft,
    replaceAiSettingsDraft,
    setFloatingTimerEnabledDraft,
} from '../mutations/generalSettingsMutations';

export interface SettingsSliceState {
    settingsLoading: boolean;
    settingsError: string | null;
}

export interface SettingsSliceActions {
    setFloatingTimerEnabled: (enabled: boolean) => Promise<void>;
    updateAiSettings: (aiSettings: AiSettings) => Promise<void>;
    updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<void>;
    batchUpdateSettings: (updates: Partial<ThinkSettings>) => Promise<void>;
    getFloatingTimerEnabled: () => boolean;
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

            updateAiSettings: async (aiSettings: AiSettings): Promise<void> => {
                await runSettingsMutation({
                    action: 'settings.updateAiSettings',
                    fallbackError: '智能助手设置更新失败',
                    mutate: (draft) => replaceAiSettingsDraft(draft, aiSettings),
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
            getAiSettings: (): AiSettings | undefined => get().settings.aiSettings,

            setSettingsError: (error: string | null): void => {
                set({ settingsError: error });
            },
        };
    };
}
