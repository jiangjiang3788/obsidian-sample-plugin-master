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
 * ⚠️ P0 边界防护：
 * - UI 层必须通过 UseCases 调用业务逻辑
 * - 禁止 UI 直接调用 AppStore 的私有方法
 * - 禁止 UI 直接调用 appStore['_updateSettingsAndPersist']
 */

import { SettingsUseCase, createSettingsUseCase } from './settings.usecase';
import { BlocksUseCase, createBlocksUseCase } from './blocks.usecase';

/**
 * UseCases 集合接口
 */
export interface UseCases {
    settings: SettingsUseCase;
    blocks: BlocksUseCase;
}

/**
 * 创建 UseCases 实例
 * 由 ServiceManager 调用，传递给 UI 层
 */
export function createUseCases(): UseCases {
    return {
        settings: createSettingsUseCase(),
        blocks: createBlocksUseCase(),
    };
}

// 导出具体的 UseCase 类型
export { SettingsUseCase } from './settings.usecase';
export { BlocksUseCase } from './blocks.usecase';
