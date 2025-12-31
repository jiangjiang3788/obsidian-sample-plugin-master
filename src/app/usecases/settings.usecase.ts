// src/app/usecases/settings.usecase.ts
/**
 * SettingsUseCase - 设置相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装设置相关的业务意图
 * - 调用 Zustand Store 的 actions
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 * - 直接修改 settings 数据结构
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';
import type { AiSettings } from '@/core/types/ai-schema';

/**
 * 设置用例类
 * P0 止血点：UI 不再直接调用 AppStore.updateFloatingTimerEnabled
 */
export class SettingsUseCase {
    /**
     * 设置悬浮计时器启用状态
     * @param enabled 是否启用
     */
    async setFloatingTimerEnabled(enabled: boolean): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[SettingsUseCase] Store 未初始化，无法设置悬浮计时器状态');
                return;
            }
            
            await state.setFloatingTimerEnabled(enabled);
        } catch (error) {
            console.error('[SettingsUseCase] setFloatingTimerEnabled 失败:', error);
            throw error;
        }
    }

    /**
     * 切换计时器悬浮窗可见性（临时状态，不持久化）
     */
    toggleTimerWidgetVisibility(): void {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[SettingsUseCase] Store 未初始化，无法切换计时器可见性');
                return;
            }
            
            state.toggleTimerWidgetVisibility();
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
            const store = getAppStoreInstance();
            const state = store.getState();
            
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
 */
export function createSettingsUseCase(): SettingsUseCase {
    return new SettingsUseCase();
}
