// src/app/store/slices/group.slice.ts
/**
 * GroupSlice - 分组状态切片
 * Role: Zustand Slice (状态管理)
 * 
 * Do:
 * - 管理 Group 相关状态
 * - 提供 Group CRUD actions
 * - 所有 IO 委托给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 持有 plugin 实例
 * 
 * Note: 使用 grp 前缀避免与 SettingsSlice 中的方法冲突
 */

import type { StateCreator } from 'zustand';
import type { ZustandAppStore } from '../useAppStore';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import type { Group, GroupType, Groupable } from '@/core/types/schema';

// 简单的 ID 生成函数
function generateId(prefix: string): string {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============== 类型定义 ==============

export interface GroupSlice {
    // Group CRUD Actions (使用 grp 前缀避免冲突)
    grpAddGroup: (name: string, parentId: string | null, type: GroupType) => Promise<Group | null>;
    grpUpdateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
    grpDeleteGroup: (id: string) => Promise<void>;
    grpDuplicateGroup: (groupId: string) => Promise<void>;
    grpMoveItem: (itemId: string, targetParentId: string | null) => Promise<void>;
    grpReorderItems: (reorderedSiblings: (Groupable & {isGroup?: boolean})[], itemType: 'group' | 'viewInstance' | 'layout') => Promise<void>;
}

// ============== Slice 工厂 ==============

/**
 * 创建 Group Slice
 * @param settingsRepository 设置仓库实例
 */
export function createGroupSlice(
    settingsRepository: SettingsRepository
): StateCreator<ZustandAppStore, [], [], GroupSlice> {
    return (set, get) => ({
        /**
         * 添加分组
         */
        grpAddGroup: async (name: string, parentId: string | null, type: GroupType): Promise<Group | null> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法添加分组');
                return null;
            }

            set({ isLoading: true, error: null });

            try {
                const newGroup: Group = {
                    id: generateId('group'),
                    name,
                    parentId,
                    type,
                };

                const newSettings = await settingsRepository.update(draft => {
                    if (!draft.groups) {
                        draft.groups = [];
                    }
                    draft.groups.push(newGroup);
                });

                set({ settings: newSettings, isLoading: false });
                return newGroup;
            } catch (error: any) {
                console.error('[GroupSlice] grpAddGroup 失败:', error);
                set({ error: error.message || '添加分组失败', isLoading: false });
                return null;
            }
        },

        /**
         * 更新分组
         */
        grpUpdateGroup: async (id: string, updates: Partial<Group>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法更新分组');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const group = draft.groups.find(g => g.id === id);
                    if (group) {
                        Object.assign(group, updates);
                    }
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[GroupSlice] grpUpdateGroup 失败:', error);
                set({ error: error.message || '更新分组失败', isLoading: false });
            }
        },

        /**
         * 删除分组
         * 将子分组和子项目的父ID更新为被删除分组的父ID
         */
        grpDeleteGroup: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法删除分组');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const groupToDelete = draft.groups.find(g => g.id === id);
                    if (!groupToDelete) return;
                    
                    const newParentId = groupToDelete.parentId;
                    
                    // 将子分组的父ID更新为被删除分组的父ID
                    draft.groups.forEach(g => {
                        if (g.parentId === id) g.parentId = newParentId;
                    });
                    
                    // 将所有子项目的父ID更新为被删除分组的父ID
                    const itemArrays: Groupable[][] = [draft.viewInstances, draft.layouts];
                    itemArrays.forEach(arr => {
                        arr.forEach(item => {
                            if (item.parentId === id) item.parentId = newParentId;
                        });
                    });
                    
                    // 删除分组
                    draft.groups = draft.groups.filter(g => g.id !== id);
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[GroupSlice] grpDeleteGroup 失败:', error);
                set({ error: error.message || '删除分组失败', isLoading: false });
            }
        },

        /**
         * 复制分组（深度复制，包括子分组和子项）
         */
        grpDuplicateGroup: async (groupId: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法复制分组');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const groupToDuplicate = draft.groups.find(g => g.id === groupId);
                    if (!groupToDuplicate) return;

                    const deepDuplicate = (originalGroupId: string, newParentId: string | null) => {
                        const originalGroup = draft.groups.find(g => g.id === originalGroupId);
                        if (!originalGroup) return;
                        
                        const newGroup: Group = {
                            ...JSON.parse(JSON.stringify(originalGroup)),
                            id: generateId('group'),
                            parentId: newParentId,
                            name: originalGroup.id === groupId ? `${originalGroup.name} (副本)` : originalGroup.name,
                        };
                        draft.groups.push(newGroup);

                        const getItemsArrayForType = (type: GroupType) => {
                            switch (type) {
                                case 'viewInstance': return { items: draft.viewInstances, prefix: 'view' };
                                case 'layout': return { items: draft.layouts, prefix: 'layout' };
                                default: return { items: [], prefix: 'item' };
                            }
                        };

                        const { items, prefix } = getItemsArrayForType(originalGroup.type);
                        const childItemsToDuplicate = items.filter(item => item.parentId === originalGroupId);
                        childItemsToDuplicate.forEach(item => {
                            const newItem = {
                                ...JSON.parse(JSON.stringify(item)),
                                id: generateId(prefix),
                                parentId: newGroup.id,
                            };
                            (items as Groupable[]).push(newItem);
                        });

                        const childGroupsToDuplicate = draft.groups.filter(g => g.parentId === originalGroupId);
                        childGroupsToDuplicate.forEach(childGroup => {
                            deepDuplicate(childGroup.id, newGroup.id);
                        });
                    };
                    
                    deepDuplicate(groupId, groupToDuplicate.parentId);
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[GroupSlice] grpDuplicateGroup 失败:', error);
                set({ error: error.message || '复制分组失败', isLoading: false });
            }
        },

        /**
         * 移动项目到指定分组
         */
        grpMoveItem: async (itemId: string, targetParentId: string | null): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法移动项目');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const allItems: (Groupable & { id: string })[] = [
                        ...draft.groups,
                        ...draft.viewInstances, 
                        ...draft.layouts
                    ];
                    const itemToMove = allItems.find(i => i.id === itemId);
                    if (!itemToMove) return;
                    
                    // 如果移动的是分组，检查是否会形成循环引用
                    if (itemId.startsWith('group_')) {
                        let currentParentId = targetParentId;
                        while (currentParentId) {
                            if (currentParentId === itemId) {
                                console.error("[GroupSlice] 不能将分组移动到其自己的子分组中。");
                                return;
                            }
                            currentParentId = draft.groups.find(g => g.id === currentParentId)?.parentId ?? null;
                        }
                    }
                    
                    itemToMove.parentId = targetParentId;
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[GroupSlice] grpMoveItem 失败:', error);
                set({ error: error.message || '移动项目失败', isLoading: false });
            }
        },

        /**
         * 重新排序项目
         */
        grpReorderItems: async (
            reorderedSiblings: (Groupable & {isGroup?: boolean})[], 
            itemType: 'group' | 'viewInstance' | 'layout'
        ): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[GroupSlice] Store 未初始化，无法重排序');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const newSettings = await settingsRepository.update(draft => {
                    const parentId = reorderedSiblings.length > 0 ? reorderedSiblings[0].parentId : undefined;

                    let fullArray: (Groupable & {id: string})[];
                    if (itemType === 'group') {
                        fullArray = draft.groups;
                    } else if (itemType === 'viewInstance') {
                        fullArray = draft.viewInstances;
                    } else {
                        fullArray = draft.layouts;
                    }
                    
                    const otherItems = fullArray.filter(i => i.parentId !== parentId);
                    const newFullArray = [...otherItems, ...reorderedSiblings];
                    
                    if (itemType === 'group') {
                        draft.groups = newFullArray as Group[];
                    } else if (itemType === 'viewInstance') {
                        draft.viewInstances = newFullArray as any[];
                    } else {
                        draft.layouts = newFullArray as any[];
                    }
                });

                set({ settings: newSettings, isLoading: false });
            } catch (error: any) {
                console.error('[GroupSlice] grpReorderItems 失败:', error);
                set({ error: error.message || '重排序失败', isLoading: false });
            }
        },
    });
}
