// src/store/stores/ViewInstanceStore.ts
import type { ThinkSettings, ViewInstance } from '@core/types/domain/schema';
import { generateId, moveItemInArray, duplicateItemInArray } from '@core/utils/array';
import { arrayUtils } from '@core/utils/array';
import { VIEW_DEFAULT_CONFIGS } from '@features/settings/registry';

/**
 * ViewInstanceStore - 管理视图实例相关状态
 * 负责视图实例的增删改查、移动、复制等操作
 */
export class ViewInstanceStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 添加视图实例
    public addViewInstance = async (title: string, parentId: string | null = null) => {
        await this._updateSettings(draft => {
            draft.viewInstances.push({
                id: generateId('view'),
                title: title,
                viewType: 'BlockView',
                dataSourceId: '',
                viewConfig: JSON.parse(JSON.stringify(VIEW_DEFAULT_CONFIGS.BlockView)),
                collapsed: true,
                parentId
            });
        });
    }

    // 更新视图实例
    public updateViewInstance = async (id: string, updates: Partial<ViewInstance>) => {
        await this._updateSettings(draft => {
            const currentInstance = draft.viewInstances.find(vi => vi.id === id);
            if (currentInstance && updates.viewType && updates.viewType !== currentInstance.viewType) {
                updates.viewConfig = JSON.parse(JSON.stringify(VIEW_DEFAULT_CONFIGS[updates.viewType]));
            }
            draft.viewInstances = arrayUtils.updateById(draft.viewInstances, id, updates);
        });
    }

    // 删除视图实例
    public deleteViewInstance = async (id: string) => {
        await this._updateSettings(draft => {
            draft.viewInstances = draft.viewInstances.filter(vi => vi.id !== id);
            // 同时从所有布局中移除此视图实例
            draft.layouts.forEach(layout => {
                layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => vid !== id);
            });
        });
    }

    // 移动视图实例（上/下）
    public moveViewInstance = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettings(draft => {
            draft.viewInstances = moveItemInArray(draft.viewInstances, id, direction);
        });
    }

    // 复制视图实例
    public duplicateViewInstance = async (id: string) => {
        await this._updateSettings(draft => {
            draft.viewInstances = duplicateItemInArray(draft.viewInstances, id, 'title');
        });
    }

    // 获取视图实例列表
    public getViewInstances = (): ViewInstance[] => {
        return this._getSettings().viewInstances;
    }

    // 获取单个视图实例
    public getViewInstance = (id: string): ViewInstance | undefined => {
        return this._getSettings().viewInstances.find(vi => vi.id === id);
    }

    // 根据父ID获取视图实例列表
    public getViewInstancesByParent = (parentId: string | null): ViewInstance[] => {
        return this._getSettings().viewInstances.filter(vi => vi.parentId === parentId);
    }

    // 批量更新视图实例
    public batchUpdateViewInstances = async (
        viewInstanceIds: string[],
        updates: Partial<ViewInstance>
    ) => {
        await this._updateSettings(draft => {
            let instances = draft.viewInstances;
            viewInstanceIds.forEach(id => {
                instances = arrayUtils.updateById(instances, id, updates);
            });
            draft.viewInstances = instances;
        });
    }

    // 批量删除视图实例
    public batchDeleteViewInstances = async (viewInstanceIds: string[]) => {
        await this._updateSettings(draft => {
            draft.viewInstances = draft.viewInstances.filter(vi => !viewInstanceIds.includes(vi.id));
            // 同时从所有布局中移除这些视图实例
            draft.layouts.forEach(layout => {
                layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => !viewInstanceIds.includes(vid));
            });
        });
    }
}
