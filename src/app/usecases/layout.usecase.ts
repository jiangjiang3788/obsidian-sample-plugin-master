// src/app/usecases/layout.usecase.ts
/**
 * LayoutUseCase - 布局相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装布局相关的业务意图
 * - 调用 Zustand Store 的 actions
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';
import type { Layout } from '@/core/types/schema';

/**
 * 布局用例类
 * P1: UI 通过 UseCases 调用布局操作，不直接访问 Store
 */
export class LayoutUseCase {
    // ============== Layout CRUD ==============

    /**
     * 添加布局
     * @param name 布局名称
     * @param parentId 父级ID（可选）
     */
    async addLayout(name: string, parentId?: string | null): Promise<Layout | null> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[LayoutUseCase] Store 未初始化');
                return null;
            }
            
            return await state.addLayout(name, parentId);
        } catch (error) {
            console.error('[LayoutUseCase] addLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 更新布局
     * @param id 布局ID
     * @param updates 更新内容
     */
    async updateLayout(id: string, updates: Partial<Layout>): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[LayoutUseCase] Store 未初始化');
                return;
            }
            
            await state.updateLayout(id, updates);
        } catch (error) {
            console.error('[LayoutUseCase] updateLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 删除布局
     * @param id 布局ID
     */
    async deleteLayout(id: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) {
                console.error('[LayoutUseCase] Store 未初始化');
                return;
            }
            
            await state.deleteLayout(id);
        } catch (error) {
            console.error('[LayoutUseCase] deleteLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 移动布局（上/下）
     */
    async moveLayout(id: string, direction: 'up' | 'down'): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.moveLayout(id, direction);
        } catch (error) {
            console.error('[LayoutUseCase] moveLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 复制布局
     */
    async duplicateLayout(id: string): Promise<Layout | null> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return null;
            
            return await state.duplicateLayout(id);
        } catch (error) {
            console.error('[LayoutUseCase] duplicateLayout 失败:', error);
            throw error;
        }
    }

    // ============== 批量操作 ==============

    /**
     * 批量更新布局
     */
    async batchUpdateLayouts(layoutIds: string[], updates: Partial<Layout>): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchUpdateLayouts(layoutIds, updates);
        } catch (error) {
            console.error('[LayoutUseCase] batchUpdateLayouts 失败:', error);
            throw error;
        }
    }

    /**
     * 批量删除布局
     */
    async batchDeleteLayouts(layoutIds: string[]): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchDeleteLayouts(layoutIds);
        } catch (error) {
            console.error('[LayoutUseCase] batchDeleteLayouts 失败:', error);
            throw error;
        }
    }

    // ============== 层级操作 ==============

    /**
     * 移动布局到新的父级
     */
    async moveLayoutToParent(layoutId: string, newParentId: string | null): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.moveLayoutToParent(layoutId, newParentId);
        } catch (error) {
            console.error('[LayoutUseCase] moveLayoutToParent 失败:', error);
            throw error;
        }
    }

    // ============== ViewInstance 关联操作 ==============

    /**
     * 添加视图实例到布局
     */
    async addViewInstanceToLayout(layoutId: string, viewInstanceId: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.addViewInstanceToLayout(layoutId, viewInstanceId);
        } catch (error) {
            console.error('[LayoutUseCase] addViewInstanceToLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 从布局中移除视图实例
     */
    async removeViewInstanceFromLayout(layoutId: string, viewInstanceId: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.removeViewInstanceFromLayout(layoutId, viewInstanceId);
        } catch (error) {
            console.error('[LayoutUseCase] removeViewInstanceFromLayout 失败:', error);
            throw error;
        }
    }

    /**
     * 重排布局中的视图实例
     */
    async reorderViewInstancesInLayout(layoutId: string, viewInstanceIds: string[]): Promise<void> {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            
            if (!state.isInitialized) return;
            
            await state.reorderViewInstancesInLayout(layoutId, viewInstanceIds);
        } catch (error) {
            console.error('[LayoutUseCase] reorderViewInstancesInLayout 失败:', error);
            throw error;
        }
    }

    // ============== 查询方法 ==============

    /**
     * 获取所有布局
     */
    getLayouts(): Layout[] {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            return state.getLayouts();
        } catch (error) {
            console.error('[LayoutUseCase] getLayouts 失败:', error);
            return [];
        }
    }

    /**
     * 获取单个布局
     */
    getLayout(id: string): Layout | undefined {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            return state.getLayout(id);
        } catch (error) {
            console.error('[LayoutUseCase] getLayout 失败:', error);
            return undefined;
        }
    }

    /**
     * 根据父级获取布局列表
     */
    getLayoutsByParent(parentId: string | null): Layout[] {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            return state.getLayoutsByParent(parentId);
        } catch (error) {
            console.error('[LayoutUseCase] getLayoutsByParent 失败:', error);
            return [];
        }
    }

    /**
     * 获取顶级布局
     */
    getTopLevelLayouts(): Layout[] {
        try {
            const store = getAppStoreInstance();
            const state = store.getState();
            return state.getTopLevelLayouts();
        } catch (error) {
            console.error('[LayoutUseCase] getTopLevelLayouts 失败:', error);
            return [];
        }
    }
}

/**
 * 创建布局用例实例
 */
export function createLayoutUseCase(): LayoutUseCase {
    return new LayoutUseCase();
}
