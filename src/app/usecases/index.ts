// src/app/usecases/index.ts
/**
 * UseCases 统一导出
 * Role: UseCase (应用层入口)
 * 
 * Do:
 * - 提供统一的 UseCase 创建入口
 * - 作为 UI 层调用业务逻辑的唯一入口
 * 
 * Don't:
 * - 引入 UI/Obsidian API（保持可测试性）
 * - 持有状态
 * 
 * ⚠️ P1 边界防护：
 * - UI 层必须通过 UseCases 调用业务逻辑
 * - 禁止 UI 直接调用 AppStore 的私有方法
 * - 禁止 UI 直接调用 appStore['_updateSettingsAndPersist']
 * - 禁止 UI 直接调用 Zustand Store actions
 */

import type { InjectionToken } from 'tsyringe';
import { SettingsUseCase, createSettingsUseCase } from './settings.usecase';
import { BlocksUseCase, createBlocksUseCase } from './blocks.usecase';
import { ThemeUseCase, createThemeUseCase } from './theme.usecase';
import { LayoutUseCase, createLayoutUseCase } from './layout.usecase';
import { GroupUseCase, createGroupUseCase } from './group.usecase';
import { ViewInstanceUseCase, createViewInstanceUseCase } from './viewInstance.usecase';

/**
 * UseCases 集合接口
 */
export interface UseCases {
    settings: SettingsUseCase;
    blocks: BlocksUseCase;
    theme: ThemeUseCase;
    layout: LayoutUseCase;
    group: GroupUseCase;
    viewInstance: ViewInstanceUseCase;
}

/**
 * UseCases DI Token
 * 用于从 DI 容器中获取 UseCases 单例
 */
export const USECASES_TOKEN: InjectionToken<UseCases> = 'UseCases';

/**
 * 创建 UseCases 实例
 * 由 ServiceManager 调用，传递给 UI 层
 * 
 * ⚠️ 注意：此函数应该只在 ServiceManager 中调用一次
 */
export function createUseCases(): UseCases {
    return {
        settings: createSettingsUseCase(),
        blocks: createBlocksUseCase(),
        theme: createThemeUseCase(),
        layout: createLayoutUseCase(),
        group: createGroupUseCase(),
        viewInstance: createViewInstanceUseCase(),
    };
}

// 导出具体的 UseCase 类型
export { SettingsUseCase } from './settings.usecase';
export { BlocksUseCase } from './blocks.usecase';
export { ThemeUseCase } from './theme.usecase';
export { LayoutUseCase } from './layout.usecase';
export { GroupUseCase } from './group.usecase';
export { ViewInstanceUseCase } from './viewInstance.usecase';

// 重新导出 useUseCases hook（从 AppStoreContext）
export { useUseCases } from '@/app/AppStoreContext';
