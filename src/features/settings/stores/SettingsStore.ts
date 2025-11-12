// src/store/stores/SettingsStore.ts
import type { ThinkSettings, InputSettings } from '@core/types/domain/schema';

/**
 * SettingsStore - 管理应用设置
 * 负责通用设置的读取和更新
 */
export class SettingsStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 获取所有设置
    public getSettings = (): ThinkSettings => {
        return this._getSettings();
    }

    // 更新输入设置
    public updateInputSettings = async (updates: Partial<InputSettings>) => {
        await this._updateSettings(draft => {
            draft.inputSettings = { ...draft.inputSettings, ...updates };
        });
    }

    // 获取输入设置
    public getInputSettings = (): InputSettings => {
        return this._getSettings().inputSettings;
    }

    // 更新悬浮计时器启用状态
    public updateFloatingTimerEnabled = async (enabled: boolean) => {
        await this._updateSettings(draft => {
            draft.floatingTimerEnabled = enabled;
        });
    }

    // 获取悬浮计时器启用状态
    public getFloatingTimerEnabled = (): boolean => {
        return this._getSettings().floatingTimerEnabled;
    }

    // 更新活跃主题路径
    public updateActiveThemePaths = async (paths: string[]) => {
        await this._updateSettings(draft => {
            draft.activeThemePaths = paths;
        });
    }

    // 获取活跃主题路径
    public getActiveThemePaths = (): string[] => {
        return this._getSettings().activeThemePaths || [];
    }

    // 添加活跃主题路径
    public addActiveThemePath = async (path: string) => {
        await this._updateSettings(draft => {
            if (!draft.activeThemePaths) {
                draft.activeThemePaths = [];
            }
            if (!draft.activeThemePaths.includes(path)) {
                draft.activeThemePaths.push(path);
            }
        });
    }

    // 移除活跃主题路径
    public removeActiveThemePath = async (path: string) => {
        await this._updateSettings(draft => {
            if (draft.activeThemePaths) {
                draft.activeThemePaths = draft.activeThemePaths.filter(p => p !== path);
            }
        });
    }

    // 批量更新设置
    public batchUpdateSettings = async (updates: Partial<ThinkSettings>) => {
        await this._updateSettings(draft => {
            Object.assign(draft, updates);
        });
    }
}
