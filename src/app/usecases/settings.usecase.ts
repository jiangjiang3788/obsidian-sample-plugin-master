// src/app/usecases/settings.usecase.ts
/**
 * SettingsUseCase - 设置相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装设置相关的业务意图（仅 settings 域：AI设置、计时器等）
 * - 调用 Zustand Store 的 actions
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 * - 直接修改 settings 数据结构
 * - ⛔ 使用全局单例（禁止 getAppStoreInstance）
 * 
 * NOTE: ViewInstance CRUD 请使用 useCases.viewInstance.*
 * NOTE: reorderItems 请使用 useCases.group.reorderItems
 */

import type { AiSettings } from '@core/public';
import type { AppStoreApi } from './index';

/**
 * 设置用例类
 * P0 止血点：UI 通过 useCases 调用
 */
export class SettingsUseCase {
    private store: AppStoreApi;

    constructor(store: AppStoreApi) {
        this.store = store;
    }

    /**
     * 设置悬浮计时器启用状态
     * @param enabled 是否启用
     */
    async setFloatingTimerEnabled(enabled: boolean): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                console.error('[SettingsUseCase] Store 未初始化，无法设置悬浮计时器状态');
                return;
            }
            
            await state.setFloatingTimerEnabled(enabled);
            
            // [新增] 同步更新 UI 可见性
            // 当用户在设置中明确启用/禁用时，UI 状态应立即跟随
            state.ui.setTimerWidgetVisible(enabled);
        } catch (error) {
            console.error('[SettingsUseCase] setFloatingTimerEnabled 失败:', error);
            throw error;
        }
    }

    /**
     * 切换计时器悬浮窗可见性（临时状态，不持久化）
     */
    async toggleTimerWidgetVisibility(): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                console.error('[SettingsUseCase] Store 未初始化，无法切换计时器可见性');
                return;
            }

            console.log("[计时器浮窗] 命令：toggleTimerWidgetVisibility 触发", { enabled: state.settings.floatingTimerEnabled, visible: state.ui.isTimerWidgetVisible });
            
            if (!state.settings.floatingTimerEnabled) {
                await state.setFloatingTimerEnabled(true);
                state.ui.setTimerWidgetVisible(true);
                console.log("[计时器浮窗] 未启用 -> 已启用并设为可见");
                return;
            } else {
                state.ui.toggleTimerWidgetVisible();
                console.log("[计时器浮窗] 已启用 -> 切换可见性为", state.ui.isTimerWidgetVisible);
            }
        } catch (error) {
            console.error('[SettingsUseCase] toggleTimerWidgetVisibility 失败:', error);
        }
    }

    /**
     * 更新 AI 设置
     * P0 止血点：UI 不再直接调用 appStore._updateSettingsAndPersist
     * @param aiSettings 完整的 AI 设置对象
     */
    async updateAiSettings(aiSettings: AiSettings): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                console.error('[SettingsUseCase] Store 未初始化，无法更新 AI 设置');
                return;
            }
            
            await state.updateAiSettings(aiSettings);
        } catch (error) {
            console.error('[SettingsUseCase] updateAiSettings 失败:', error);
            throw error;
        }
    }
}

/**
 * 创建设置用例实例
 * @param store Zustand Store 实例
 */
export function createSettingsUseCase(store: AppStoreApi): SettingsUseCase {
    return new SettingsUseCase(store);
}
