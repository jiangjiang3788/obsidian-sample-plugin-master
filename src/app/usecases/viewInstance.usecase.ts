// src/app/usecases/viewInstance.usecase.ts
/**
 * ViewInstanceUseCase - 视图实例相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装视图实例相关的业务意图
 * - 调用 Zustand store 的 viewInstance actions
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';
import type { ViewInstance } from '@/core/types/schema';

/**
 * 视图实例用例类
 * P1: 封装 updateViewInstance 等操作，UI 通过 UseCase 调用
 */
export class ViewInstanceUseCase {
    /**
     * 添加视图实例
     */
    async addViewInstance(title: string, parentId: string | null = null): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().viAddViewInstance(title, parentId);
        } catch (error) {
            console.error('[ViewInstanceUseCase] addViewInstance 失败:', error);
            throw error;
        }
    }

    /**
     * 更新视图实例
     */
    async updateViewInstance(id: string, updates: Partial<ViewInstance>): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().viUpdateViewInstance(id, updates);
        } catch (error) {
            console.error('[ViewInstanceUseCase] updateViewInstance 失败:', error);
            throw error;
        }
    }

    /**
     * 删除视图实例
     */
    async deleteViewInstance(id: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().viDeleteViewInstance(id);
        } catch (error) {
            console.error('[ViewInstanceUseCase] deleteViewInstance 失败:', error);
            throw error;
        }
    }

    /**
     * 移动视图实例（上下移动）
     */
    async moveViewInstance(id: string, direction: 'up' | 'down'): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().viMoveViewInstance(id, direction);
        } catch (error) {
            console.error('[ViewInstanceUseCase] moveViewInstance 失败:', error);
            throw error;
        }
    }

    /**
     * 复制视图实例
     */
    async duplicateViewInstance(id: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().viDuplicateViewInstance(id);
        } catch (error) {
            console.error('[ViewInstanceUseCase] duplicateViewInstance 失败:', error);
            throw error;
        }
    }
}

/**
 * 创建视图实例用例实例
 */
export function createViewInstanceUseCase(): ViewInstanceUseCase {
    return new ViewInstanceUseCase();
}
