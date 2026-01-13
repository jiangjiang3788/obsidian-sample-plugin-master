// src/app/usecases/index.ts
/**
 * UseCases 统一导出
 * Role: UseCase (应用层入口)
 * 
 * Do:
 * - 提供统一的 UseCase 创建入口
 * - 作为 UI 层调用业务逻辑的唯一入口
 * - 通过 createUseCases(store) 显式注入 store
 * 
 * Don't:
 * - 引入 UI/Obsidian API（保持可测试性）
 * - 持有状态
 * - 使用全局单例（禁止 getAppStoreInstance）
 * 
 * ⚠️ P0-2 架构约束：
 * - UI 层必须通过 UseCases 调用业务逻辑
 * - UI 通过 UseCases 调用业务逻辑
 * - 禁止 UI 直接调用 appStore['_updateSettingsAndPersist']
 * - 禁止 UI 直接调用 Zustand Store actions
 * - ⛔ 禁止使用全局单例
 */

import type { InjectionToken } from 'tsyringe';
import { SettingsUseCase, createSettingsUseCase } from './settings.usecase';
import { BlocksUseCase, createBlocksUseCase } from './blocks.usecase';
import { ThemeUseCase, createThemeUseCase } from './theme.usecase';
import { LayoutUseCase, createLayoutUseCase } from './layout.usecase';
import { ViewInstanceUseCase, createViewInstanceUseCase } from './viewinstance.usecase';
import { TimerUseCase, createTimerUseCase } from './timer.usecase';

/**
 * Zustand Store 类型（用于 createUseCases 参数）
 */
export type AppStoreApi = ReturnType<typeof import('@/app/store/useAppStore').createAppStore>;

/**
 * UseCases 集合接口
 */
export interface UseCases {
    settings: SettingsUseCase;
    blocks: BlocksUseCase;
    theme: ThemeUseCase;
    layout: LayoutUseCase;
    viewInstance: ViewInstanceUseCase;
    timer: TimerUseCase;
}

/**
 * UseCases DI Token
 * 用于从 DI 容器中获取 UseCases 单例
 */
export const USECASES_TOKEN: InjectionToken<UseCases> = 'UseCases';

/**
 * 创建 UseCases 实例
 * 
 * ⚠️ P0-2 架构约束：
 * - 必须由 ServiceManager 调用，显式传入 store
 * - 禁止使用全局单例
 * - store 通过闭包传递给各个 UseCase
 * 
 * @param store Zustand Store 实例
 * @returns UseCases 集合
 */
export function createUseCases(store: AppStoreApi): UseCases {
    return {
        settings: createSettingsUseCase(store),
        blocks: createBlocksUseCase(store),
        theme: createThemeUseCase(store),
        layout: createLayoutUseCase(store),
        viewInstance: createViewInstanceUseCase(store),
        timer: createTimerUseCase(store),
    };
}

// 导出具体的 UseCase 类型
export { SettingsUseCase } from './settings.usecase';
export { BlocksUseCase } from './blocks.usecase';
export { ThemeUseCase } from './theme.usecase';
export { LayoutUseCase } from './layout.usecase';
export { ViewInstanceUseCase } from './viewinstance.usecase';
export { TimerUseCase } from './timer.usecase';

// 重新导出 useUseCases hook（从 AppStoreContext）
export { useUseCases } from '@/app/AppStoreContext';
