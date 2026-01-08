// src/features/dashboard/stores/GroupStore.ts
/**
 * @deprecated 【S5 已移除】Group 功能已在 S5 移除。
 * Layout/ViewInstance 现使用扁平列表管理。
 * 禁止使用此文件，请使用：
 * - useCases.layout.* (布局和视图写操作)
 * - useZustandAppStore(state => state.settings) (读操作)
 * 
 * 任何尝试实例化此类都会直接抛出异常。
 */

import type { ThinkSettings, Group, GroupType, Groupable } from '@/core/types/schema';

const DEPRECATED_ERROR = 'GroupStore is deprecated. Group feature has been removed in S5. Use useCases.layout instead.';

/**
 * @deprecated Group feature removed in S5
 * @throws Error always - this store is disabled
 */
export class GroupStore {
    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        throw new Error(DEPRECATED_ERROR);
    }

    // 所有方法都不会被执行，因为构造函数会抛出异常
    public addGroup = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public updateGroup = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public deleteGroup = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public duplicateGroup = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public moveItem = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public reorderItems = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchUpdateGroups = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchDeleteGroups = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchMoveItems = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public getGroups = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getGroup = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getGroupsByParent = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getGroupsByType = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getChildGroups = (): never => { throw new Error(DEPRECATED_ERROR); };
    public canMoveToParent = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getGroupPath = (): never => { throw new Error(DEPRECATED_ERROR); };
}

// ============== 原始实现已移除，详见 S5 迁移说明 ==============
