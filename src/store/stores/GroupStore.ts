// src/store/stores/GroupStore.ts
import type { ThinkSettings, Group, GroupType, Groupable } from '@/lib/types/domain/schema';
import { generateId } from '@/lib/utils/core/array';

/**
 * GroupStore - 管理分组相关状态
 * 负责分组的增删改查、移动、复制、层级管理等操作
 */
export class GroupStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 添加分组
    public addGroup = async (name: string, parentId: string | null, type: GroupType) => {
        await this._updateSettings(draft => {
            const newGroup: Group = { id: generateId('group'), name, parentId, type };
            draft.groups.push(newGroup);
        });
    }

    // 更新分组
    public updateGroup = async (id: string, updates: Partial<Group>) => {
        await this._updateSettings(draft => {
            const group = draft.groups.find(g => g.id === id);
            if (group) {
                Object.assign(group, updates);
            }
        });
    }

    // 删除分组
    public deleteGroup = async (id: string) => {
        await this._updateSettings(draft => {
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
    }

    // 复制分组（深度复制，包括子分组和子项）
    public duplicateGroup = async (groupId: string) => {
        await this._updateSettings(draft => {
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
    }

    // 移动项目到指定分组
    public moveItem = async (itemId: string, targetParentId: string | null) => {
        await this._updateSettings(draft => {
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
                        console.error("不能将分组移动到其自己的子分组中。");
                        return;
                    }
                    currentParentId = draft.groups.find(g => g.id === currentParentId)?.parentId ?? null;
                }
            }
            
            itemToMove.parentId = targetParentId;
        });
    }

    // 重新排序项目
    public reorderItems = async (
        reorderedSiblings: (Groupable & {isGroup?: boolean})[], 
        itemType: 'group' | 'viewInstance' | 'layout'
    ) => {
        await this._updateSettings(draft => {
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
    }

    // 批量更新分组
    public batchUpdateGroups = async (
        groupIds: string[],
        updates: Partial<Group>
    ) => {
        await this._updateSettings(draft => {
            groupIds.forEach(id => {
                const group = draft.groups.find(g => g.id === id);
                if (group) {
                    Object.assign(group, updates);
                }
            });
        });
    }

    // 批量删除分组
    public batchDeleteGroups = async (groupIds: string[]) => {
        for (const id of groupIds) {
            await this.deleteGroup(id);
        }
    }

    // 批量移动项目
    public batchMoveItems = async (itemIds: string[], targetParentId: string | null) => {
        for (const itemId of itemIds) {
            await this.moveItem(itemId, targetParentId);
        }
    }

    // 获取分组列表
    public getGroups = (): Group[] => {
        return this._getSettings().groups;
    }

    // 获取单个分组
    public getGroup = (id: string): Group | undefined => {
        return this._getSettings().groups.find(g => g.id === id);
    }

    // 根据父ID获取分组列表
    public getGroupsByParent = (parentId: string | null): Group[] => {
        return this._getSettings().groups.filter(g => g.parentId === parentId);
    }

    // 根据类型获取分组列表
    public getGroupsByType = (type: GroupType): Group[] => {
        return this._getSettings().groups.filter(g => g.type === type);
    }

    // 获取分组的所有子分组（递归）
    public getChildGroups = (groupId: string): Group[] => {
        const groups = this._getSettings().groups;
        const children: Group[] = [];
        
        const findChildren = (parentId: string) => {
            const directChildren = groups.filter(g => g.parentId === parentId);
            children.push(...directChildren);
            directChildren.forEach(child => findChildren(child.id));
        };
        
        findChildren(groupId);
        return children;
    }

    // 检查是否可以移动到目标分组（避免循环引用）
    public canMoveToParent = (itemId: string, targetParentId: string | null): boolean => {
        if (!itemId.startsWith('group_')) return true;
        if (targetParentId === null) return true;
        if (itemId === targetParentId) return false;
        
        const groups = this._getSettings().groups;
        let currentParentId = targetParentId;
        
        while (currentParentId) {
            if (currentParentId === itemId) return false;
            currentParentId = groups.find(g => g.id === currentParentId)?.parentId ?? null;
        }
        
        return true;
    }

    // 获取分组路径（面包屑导航）
    public getGroupPath = (groupId: string): Group[] => {
        const groups = this._getSettings().groups;
        const path: Group[] = [];
        
        let currentId: string | null = groupId;
        while (currentId) {
            const group = groups.find(g => g.id === currentId);
            if (!group) break;
            path.unshift(group);
            currentId = group.parentId;
        }
        
        return path;
    }
}
