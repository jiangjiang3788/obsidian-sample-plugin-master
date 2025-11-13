// src/store/stores/LayoutStore.ts
import type { ThinkSettings, Layout } from '@core/types/domain/schema';
import { moveItemInArray, duplicateItemInArray } from '@core/utils/array';
import { HierarchicalStoreOperations, type StoreKit } from '@core/utils/StoreOperations';

/**
 * LayoutStore - 管理布局相关状态
 * 负责布局的增删改查、移动、复制等操作
 * 
 * 使用StoreOperations工具类减少重复代码
 * 支持层级结构（parentId）
 */
export class LayoutStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;
    
    // 使用层级化的通用CRUD操作
    private _layoutOperations: StoreKit<Layout>;
    private _hierarchicalQueries: ReturnType<typeof HierarchicalStoreOperations.createHierarchicalQueries<Layout>>;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
        
        // 初始化通用操作
        this._layoutOperations = HierarchicalStoreOperations.createStoreKit<Layout>(
            updateSettings,
            getSettings,
            'layouts',
            'layout'
        );
        
        this._hierarchicalQueries = HierarchicalStoreOperations.createHierarchicalQueries<Layout>(
            getSettings,
            'layouts'
        );
    }

    // 添加布局 - 使用通用操作
    public addLayout = async (name: string, parentId: string | null = null): Promise<Layout> => {
        return await this._layoutOperations.add({
            name,
            viewInstanceIds: [],
            displayMode: 'list',
            initialView: '月',
            initialDateFollowsNow: true,
            parentId
        });
    }

    // 更新布局 - 使用通用操作
    public updateLayout = async (id: string, updates: Partial<Layout>): Promise<void> => {
        await this._layoutOperations.update(id, updates);
    }

    // 删除布局 - 使用通用操作
    public deleteLayout = async (id: string): Promise<void> => {
        await this._layoutOperations.delete(id);
    }

    // 移动布局（上/下） - 保留原有逻辑，因为涉及兄弟节点排序
    public moveLayout = async (id: string, direction: 'up' | 'down'): Promise<void> => {
        await this._updateSettings(draft => {
            draft.layouts = moveItemInArray(draft.layouts, id, direction);
        });
    }

    // 复制布局 - 保留原有逻辑，因为需要特殊的复制逻辑
    public duplicateLayout = async (id: string): Promise<Layout | null> => {
        const original = this._layoutOperations.getById(id);
        if (!original) {
            console.warn(`找不到ID为 ${id} 的布局`);
            return null;
        }

        return await this._layoutOperations.add({
            ...original,
            name: `${original.name} (副本)`,
            // 保持相同的父级
            parentId: original.parentId
        });
    }

    // 批量更新布局 - 使用通用批量操作
    public batchUpdateLayouts = async (
        layoutIds: string[],
        updates: Partial<Layout>
    ): Promise<void> => {
        const updateData = layoutIds.map(id => ({ id, data: updates }));
        await this._layoutOperations.batchUpdate(updateData);
    }

    // 批量删除布局 - 使用通用批量操作
    public batchDeleteLayouts = async (layoutIds: string[]): Promise<void> => {
        await this._layoutOperations.batchDelete(layoutIds);
    }

    // 移动布局到新的父级 - 使用层级操作工具
    public moveToParent = async (layoutId: string, newParentId: string | null): Promise<void> => {
        await HierarchicalStoreOperations.moveToParent<Layout>(
            this._updateSettings,
            'layouts',
            layoutId,
            newParentId
        );
    }

    // 为布局添加视图实例
    public addViewInstanceToLayout = async (layoutId: string, viewInstanceId: string) => {
        await this._updateSettings(draft => {
            const layout = draft.layouts.find(l => l.id === layoutId);
            if (layout && !layout.viewInstanceIds.includes(viewInstanceId)) {
                layout.viewInstanceIds.push(viewInstanceId);
            }
        });
    }

    // 从布局中移除视图实例
    public removeViewInstanceFromLayout = async (layoutId: string, viewInstanceId: string) => {
        await this._updateSettings(draft => {
            const layout = draft.layouts.find(l => l.id === layoutId);
            if (layout) {
                layout.viewInstanceIds = layout.viewInstanceIds.filter(id => id !== viewInstanceId);
            }
        });
    }

    // 重新排序布局中的视图实例
    public reorderViewInstances = async (layoutId: string, viewInstanceIds: string[]) => {
        await this._updateSettings(draft => {
            const layout = draft.layouts.find(l => l.id === layoutId);
            if (layout) {
                layout.viewInstanceIds = viewInstanceIds;
            }
        });
    }

    // 获取布局列表 - 使用通用查询操作
    public getLayouts = (): Layout[] => {
        return this._layoutOperations.getAll();
    }

    // 获取单个布局 - 使用通用查询操作
    public getLayout = (id: string): Layout | undefined => {
        return this._layoutOperations.getById(id);
    }

    // 根据父ID获取布局列表 - 使用层级查询操作
    public getLayoutsByParent = (parentId: string | null): Layout[] => {
        return this._hierarchicalQueries.getChildren(parentId);
    }

    // 获取顶级布局（没有父级的布局）
    public getTopLevelLayouts = (): Layout[] => {
        return this._hierarchicalQueries.getTopLevel();
    }

    // 检查布局是否有子布局
    public hasChildren = (layoutId: string): boolean => {
        return this._hierarchicalQueries.hasChildren(layoutId);
    }

    // 获取布局中的视图实例ID列表
    public getLayoutViewInstances = (layoutId: string): string[] => {
        const layout = this.getLayout(layoutId);
        return layout?.viewInstanceIds || [];
    }

    // 新增：检查布局是否存在
    public layoutExists = (id: string): boolean => {
        return this._layoutOperations.exists(id);
    }

    // 新增：根据名称查找布局
    public findLayoutsByName = (name: string): Layout[] => {
        return this._layoutOperations.findBy(layout => layout.name.includes(name));
    }

    // 新增：获取布局数量
    public getLayoutCount = (): number => {
        return this._layoutOperations.count();
    }

    // 新增：根据显示模式查找布局
    public getLayoutsByDisplayMode = (displayMode: string): Layout[] => {
        return this._layoutOperations.findBy(layout => layout.displayMode === displayMode);
    }
}
