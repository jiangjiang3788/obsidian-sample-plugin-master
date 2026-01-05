// src/app/usecases/group.usecase.ts
/**
 * GroupUseCase - 分组相关用例
 * Role: UseCase (应用层)
 * 
 * Do:
 * - 封装分组相关的业务意图
 * - 调用 Zustand Store 的 group actions（SSOT）
 * - 统一错误处理
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 */

import { getAppStoreInstance } from '@/app/store/useAppStore';
import type { Group, GroupType, Groupable } from '@/core/types/schema';

/**
 * 分组用例类
 * P1: 封装 moveItem 等分组操作，UI 通过 UseCase 调用
 * 已迁移到 Zustand Store (SSOT)
 */
export class GroupUseCase {
    /**
     * 移动项目到新的父级
     * @param itemId 项目ID
     * @param targetParentId 目标父级ID（null 表示移到顶级）
     */
    async moveItem(itemId: string, targetParentId: string | null): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().grpMoveItem(itemId, targetParentId);
        } catch (error) {
            console.error('[GroupUseCase] moveItem 失败:', error);
            throw error;
        }
    }

    /**
     * 添加分组
     */
    async addGroup(name: string, parentId: string | null, type: GroupType): Promise<Group | null> {
        try {
            const store = getAppStoreInstance();
            return await store.getState().grpAddGroup(name, parentId, type);
        } catch (error) {
            console.error('[GroupUseCase] addGroup 失败:', error);
            throw error;
        }
    }

    /**
     * 更新分组
     */
    async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().grpUpdateGroup(id, updates);
        } catch (error) {
            console.error('[GroupUseCase] updateGroup 失败:', error);
            throw error;
        }
    }

    /**
     * 删除分组
     */
    async deleteGroup(id: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().grpDeleteGroup(id);
        } catch (error) {
            console.error('[GroupUseCase] deleteGroup 失败:', error);
            throw error;
        }
    }

    /**
     * 复制分组
     */
    async duplicateGroup(groupId: string): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().grpDuplicateGroup(groupId);
        } catch (error) {
            console.error('[GroupUseCase] duplicateGroup 失败:', error);
            throw error;
        }
    }

    /**
     * 重排序项目
     */
    async reorderItems(
        reorderedSiblings: (Groupable & { isGroup?: boolean })[],
        itemType: 'group' | 'viewInstance' | 'layout'
    ): Promise<void> {
        try {
            const store = getAppStoreInstance();
            await store.getState().grpReorderItems(reorderedSiblings, itemType);
        } catch (error) {
            console.error('[GroupUseCase] reorderItems 失败:', error);
            throw error;
        }
    }
}

/**
 * 创建分组用例实例
 */
export function createGroupUseCase(): GroupUseCase {
    return new GroupUseCase();
}
