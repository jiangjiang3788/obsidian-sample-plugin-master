// src/app/usecases/blocks.usecase.ts
/**
 * BlocksUseCase - Block 相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装 Block 相关的业务意图
 * - 调用 Zustand Store 的 actions
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 * - 在此处实现重排序逻辑（逻辑集中在 Zustand action）
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';

/**
 * Block 用例类
 * P0 止血点：UI 不再直接调用 appStore['_updateSettingsAndPersist']
 */
export class BlocksUseCase {
    /**
     * 重排序 Blocks
     * @param activeId 被拖动的 Block ID
     * @param overId 目标位置的 Block ID
     */
    async reorderBlocks(activeId: string, overId: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法重排序 Block');
                return;
            }
            
            await state.reorderBlocks(activeId, overId);
        } catch (error) {
            console.error('[BlocksUseCase] reorderBlocks 失败:', error);
            throw error;
        }
    }
}

/**
 * 创建 Block 用例实例
 */
export function createBlocksUseCase(): BlocksUseCase {
    return new BlocksUseCase();
}
