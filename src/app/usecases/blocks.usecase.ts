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
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';
import type { BlockTemplate } from '@/core/types/schema';

/**
 * Block 用例类
 * P1: 提供完整的 Block CRUD 操作
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

    /**
     * 添加新 Block
     * @param name Block 名称
     * @returns 新创建的 Block 或 undefined
     */
    async addBlock(name: string): Promise<BlockTemplate | undefined> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法添加 Block');
                return undefined;
            }
            
            return await state.addBlock(name);
        } catch (error) {
            console.error('[BlocksUseCase] addBlock 失败:', error);
            throw error;
        }
    }

    /**
     * 更新 Block
     * @param id Block ID
     * @param updates 更新内容
     */
    async updateBlock(id: string, updates: Partial<BlockTemplate>): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法更新 Block');
                return;
            }
            
            await state.updateBlock(id, updates);
        } catch (error) {
            console.error('[BlocksUseCase] updateBlock 失败:', error);
            throw error;
        }
    }

    /**
     * 删除 Block
     * @param id Block ID
     */
    async deleteBlock(id: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法删除 Block');
                return;
            }
            
            await state.deleteBlock(id);
        } catch (error) {
            console.error('[BlocksUseCase] deleteBlock 失败:', error);
            throw error;
        }
    }

    /**
     * 复制 Block
     * @param id 要复制的 Block ID
     * @returns 新创建的 Block 副本或 undefined
     */
    async duplicateBlock(id: string): Promise<BlockTemplate | undefined> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法复制 Block');
                return undefined;
            }
            
            return await state.duplicateBlock(id);
        } catch (error) {
            console.error('[BlocksUseCase] duplicateBlock 失败:', error);
            throw error;
        }
    }

    /**
     * 移动 Block
     * @param id Block ID
     * @param direction 移动方向
     */
    async moveBlock(id: string, direction: 'up' | 'down'): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[BlocksUseCase] Store 未初始化，无法移动 Block');
                return;
            }
            
            await state.moveBlock(id, direction);
        } catch (error) {
            console.error('[BlocksUseCase] moveBlock 失败:', error);
            throw error;
        }
    }

    /**
     * 获取最新的 Block 列表
     * @returns Block 列表
     */
    getBlocks(): BlockTemplate[] {
        const store = getAppStoreInstance();
        const state = store.getState();
        return state.settings.inputSettings?.blocks || [];
    }
}

/**
 * 创建 Block 用例实例
 */
export function createBlocksUseCase(): BlocksUseCase {
    return new BlocksUseCase();
}
