// src/app/usecases/group.usecase.ts
/**
 * GroupUseCase - 分组相关用例
 * 
 * 【S5 规范】⛔ Group 功能已完全禁用！
 * 
 * Group 移动/分组存在问题，当前策略是完全禁用。
 * Layout/ViewInstance 现使用扁平列表管理，通过 useCases.layout 操作。
 * 
 * 迁移指引：
 * - 添加布局 → useCases.layout.addLayout()
 * - 添加视图 → useCases.layout.addView()
 * - 移动布局 → useCases.layout.moveLayout()
 * - 移动视图 → useCases.layout.moveView()
 * - 重排布局 → useCases.layout.reorderLayouts()
 * 
 * @deprecated Group 功能已在 S5 移除
 * @internal 仅保留接口壳以避免 import 编译错误
 */

import type { Group, GroupType, Groupable } from '@/core/types/schema';

const DISABLED_ERROR = `
[S5 规范] Group 功能已完全禁用！

Group 移动/分组存在问题，当前策略是完全禁用。
请使用 useCases.layout 代替：

  import { createLayoutUseCase } from '@/app/usecases/layout.usecase';
  const layoutUseCase = createLayoutUseCase();
  
  // 布局操作
  await layoutUseCase.addLayout(name, parentId);
  await layoutUseCase.moveLayout(id, direction);
  await layoutUseCase.reorderLayouts(orderedIds);
  
  // 视图操作
  await layoutUseCase.addView(title, parentId);
  await layoutUseCase.moveView(id, direction);

详见: src/app/ARCH_CONSTRAINTS.md
`;

/**
 * 分组用例类
 * 
 * @deprecated 【硬禁用】所有方法直接抛出异常，禁止使用。
 */
export class GroupUseCase {
    constructor() {
        console.warn('[S5] GroupUseCase 已禁用，Group 功能已移除');
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async moveItem(_itemId: string, _targetParentId: string | null): Promise<void> {
        throw new Error(DISABLED_ERROR);
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async addGroup(_name: string, _parentId: string | null, _type: GroupType): Promise<Group | null> {
        throw new Error(DISABLED_ERROR);
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async updateGroup(_id: string, _updates: Partial<Group>): Promise<void> {
        throw new Error(DISABLED_ERROR);
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async deleteGroup(_id: string): Promise<void> {
        throw new Error(DISABLED_ERROR);
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async duplicateGroup(_groupId: string): Promise<void> {
        throw new Error(DISABLED_ERROR);
    }

    /**
     * @deprecated Group feature removed in S5
     * @throws Error always
     */
    async reorderItems(
        _reorderedSiblings: (Groupable & { isGroup?: boolean })[],
        _itemType: 'group' | 'viewInstance' | 'layout'
    ): Promise<void> {
        throw new Error(DISABLED_ERROR);
    }
}

/**
 * 创建分组用例实例
 * @deprecated Group feature removed in S5
 */
export function createGroupUseCase(): GroupUseCase {
    console.warn('[S5] createGroupUseCase 已禁用，Group 功能已移除');
    return new GroupUseCase();
}
