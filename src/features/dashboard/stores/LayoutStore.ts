// src/store/stores/LayoutStore.ts
import type { ThinkSettings, Layout } from '@core/types/domain/schema';
import { generateId, moveItemInArray, duplicateItemInArray } from '@core/utils/array';
import { arrayUtils } from '@core/utils/array';

/**
 * LayoutStore - 管理布局相关状态
 * 负责布局的增删改查、移动、复制等操作
 */
export class LayoutStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 添加布局
    public addLayout = async (name: string, parentId: string | null = null) => {
        await this._updateSettings(draft => {
            draft.layouts.push({
                id: generateId('layout'),
                name,
                viewInstanceIds: [],
                displayMode: 'list',
                initialView: '月',
                initialDateFollowsNow: true,
                parentId
            });
        });
    }

    // 更新布局
    public updateLayout = async (id: string, updates: Partial<Layout>) => {
        await this._updateSettings(draft => {
            draft.layouts = arrayUtils.updateById(draft.layouts, id, updates);
        });
    }

    // 删除布局
    public deleteLayout = async (id: string) => {
        await this._updateSettings(draft => {
            draft.layouts = arrayUtils.removeByIds(draft.layouts, [id]);
        });
    }

    // 移动布局（上/下）
    public moveLayout = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettings(draft => {
            draft.layouts = moveItemInArray(draft.layouts, id, direction);
        });
    }

    // 复制布局
    public duplicateLayout = async (id: string) => {
        await this._updateSettings(draft => {
            draft.layouts = duplicateItemInArray(draft.layouts, id, 'name');
        });
    }

    // 批量更新布局
    public batchUpdateLayouts = async (
        layoutIds: string[],
        updates: Partial<Layout>
    ) => {
        await this._updateSettings(draft => {
            let layouts = draft.layouts;
            layoutIds.forEach(id => {
                layouts = arrayUtils.updateById(layouts, id, updates);
            });
            draft.layouts = layouts;
        });
    }

    // 批量删除布局
    public batchDeleteLayouts = async (layoutIds: string[]) => {
        await this._updateSettings(draft => {
            draft.layouts = arrayUtils.removeByIds(draft.layouts, layoutIds);
        });
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

    // 获取布局列表
    public getLayouts = (): Layout[] => {
        return this._getSettings().layouts;
    }

    // 获取单个布局
    public getLayout = (id: string): Layout | undefined => {
        return this._getSettings().layouts.find(l => l.id === id);
    }

    // 根据父ID获取布局列表
    public getLayoutsByParent = (parentId: string | null): Layout[] => {
        return this._getSettings().layouts.filter(l => l.parentId === parentId);
    }

    // 获取布局中的视图实例ID列表
    public getLayoutViewInstances = (layoutId: string): string[] => {
        const layout = this.getLayout(layoutId);
        return layout?.viewInstanceIds || [];
    }
}
