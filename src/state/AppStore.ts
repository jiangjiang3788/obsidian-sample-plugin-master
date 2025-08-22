// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
// [修改] 导入新增的 Group 和 GroupType 类型
import type { ThinkSettings, DataSource, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@core/domain/schema';
import type ThinkPlugin from '../main';
import { VIEW_DEFAULT_CONFIGS } from '@features/dashboard/settings/ModuleEditors/registry';

// ... AppState, AppStore 类的定义保持不变 ...
export interface AppState {
    settings: ThinkSettings;
}

export class AppStore {
    private static _instance: AppStore;
    private _plugin!: ThinkPlugin;
    private _state!: AppState;
    private _listeners: Set<() => void> = new Set();

    private constructor() { }

    public static get instance(): AppStore {
        if (!AppStore._instance) {
            AppStore._instance = new AppStore();
        }
        return AppStore._instance;
    }

    public init(plugin: ThinkPlugin, initialSettings: ThinkSettings) {
        this._plugin = plugin;
        this._state = { settings: initialSettings };
    }

    public getState(): AppState {
        return this._state;
    }

    public getSettings(): ThinkSettings {
        return this._state.settings;
    }

    public subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    private _notify() {
        this._listeners.forEach(l => l());
    }

    private async _updateSettingsAndPersist(updater: (draft: ThinkSettings) => void) {
        const newSettings = structuredClone(this._state.settings);
        updater(newSettings);
        this._state.settings = newSettings;
        
        await this._plugin.saveData(this._state.settings);
        
        this._notify();
    }
    
    private _generateId(prefix: string): string {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    // --- [修改] 通用工具函数，现在可以处理带 parentId 的项 ---
    private _moveItemInArray<T extends Groupable>(array: T[], id: string, direction: 'up' | 'down') {
        const siblings = array.filter(item => item.parentId === array.find(i => i.id === id)?.parentId);
        const index = siblings.findIndex(item => item.id === id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= siblings.length) return;
        
        const originalIndexInFullArray = array.findIndex(item => item.id === id);
        const targetIndexInFullArray = array.findIndex(item => item.id === siblings[newIndex].id);

        if(originalIndexInFullArray > -1 && targetIndexInFullArray > -1) {
            const [movedItem] = array.splice(originalIndexInFullArray, 1);
            array.splice(targetIndexInFullArray, 0, movedItem);
        }
    }

    private _duplicateItemInArray<T extends Groupable & { name?: string, title?: string }>(array: T[], id: string, nameField: 'name' | 'title' = 'name') {
        const index = array.findIndex(item => item.id === id);
        if (index === -1) return;

        const originalItem = array[index];
        const newItem = structuredClone(originalItem);
        newItem.id = this._generateId(originalItem.id.split('_')[0]);
        
        const currentName = (originalItem as any)[nameField] || '';
        (newItem as any)[nameField] = `${currentName} (副本)`;
        // 复制的项应与原项在同一分组下
        newItem.parentId = originalItem.parentId;

        array.splice(index + 1, 0, newItem);
    }

    // --- [新增] 分组管理 Actions ---
    public addGroup = async (name: string, parentId: string | null, type: GroupType) => {
        await this._updateSettingsAndPersist(draft => {
            const newGroup: Group = { id: this._generateId('group'), name, parentId, type };
            draft.groups.push(newGroup);
        });
    }

    public updateGroup = async (id: string, updates: Partial<Group>) => {
        await this._updateSettingsAndPersist(draft => {
            const group = draft.groups.find(g => g.id === id);
            if (group) {
                Object.assign(group, updates);
            }
        });
    }

    public deleteGroup = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            const groupToDelete = draft.groups.find(g => g.id === id);
            if (!groupToDelete) return;

            const newParentId = groupToDelete.parentId;

            // 移动子分组
            draft.groups.forEach(g => {
                if (g.parentId === id) g.parentId = newParentId;
            });
            // 移动子配置项
            const itemArrays: Groupable[][] = [draft.dataSources, draft.viewInstances, draft.layouts];
            itemArrays.forEach(arr => {
                arr.forEach(item => {
                    if (item.parentId === id) item.parentId = newParentId;
                });
            });

            // 删除分组
            draft.groups = draft.groups.filter(g => g.id !== id);
        });
    }
    
    // --- [新增] 通用移动 Action ---
    public moveItem = async (itemId: string, targetParentId: string | null) => {
        await this._updateSettingsAndPersist(draft => {
            const allItems: (Groupable & {id: string})[] = [...draft.groups, ...draft.dataSources, ...draft.viewInstances, ...draft.layouts];
            const itemToMove = allItems.find(i => i.id === itemId);

            if (!itemToMove) return;

            // 防循环校验：如果要移动的是一个分组，确保目标不是它的子孙
            if (itemId.startsWith('group_')) {
                let currentParentId = targetParentId;
                while(currentParentId) {
                    if (currentParentId === itemId) {
                        console.error("不能将分组移动到其自己的子分组中。");
                        // 在实际应用中可以 new Notice() 提示用户
                        return; 
                    }
                    currentParentId = draft.groups.find(g => g.id === currentParentId)?.parentId ?? null;
                }
            }

            itemToMove.parentId = targetParentId;
        });
    }


    // --- [修改] 数据源、视图、布局 Actions ---
    public addDataSource = async (name: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
            draft.dataSources.push({ id: this._generateId('ds'), name, filters: [], sort: [], parentId });
        });
    }
    public updateDataSource = async (id: string, updates: Partial<DataSource>) => {
        await this._updateSettingsAndPersist(draft => {
            const index = draft.dataSources.findIndex(ds => ds.id === id);
            if (index !== -1) {
                draft.dataSources[index] = { ...draft.dataSources[index], ...updates };
            }
        });
    }
    public deleteDataSource = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.dataSources = draft.dataSources.filter(ds => ds.id !== id);
            draft.viewInstances.forEach(vi => {
                if (vi.dataSourceId === id) {
                    vi.dataSourceId = '';
                }
            });
        });
    }
    public moveDataSource = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettingsAndPersist(draft => {
            this._moveItemInArray(draft.dataSources, id, direction);
        });
    }
    public duplicateDataSource = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            this._duplicateItemInArray(draft.dataSources, id, 'name');
        });
    }

    public addViewInstance = async (title: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
            draft.viewInstances.push({
                id: this._generateId('view'),
                title: title,
                viewType: 'BlockView',
                dataSourceId: '',
                viewConfig: structuredClone(VIEW_DEFAULT_CONFIGS.BlockView),
                parentId
            });
        });
    }
    public updateViewInstance = async (id: string, updates: Partial<ViewInstance>) => {
        await this._updateSettingsAndPersist(draft => {
            const index = draft.viewInstances.findIndex(vi => vi.id === id);
            if (index !== -1) {
                if (updates.viewType && updates.viewType !== draft.viewInstances[index].viewType) {
                    updates.viewConfig = structuredClone(VIEW_DEFAULT_CONFIGS[updates.viewType]);
                }
                draft.viewInstances[index] = { ...draft.viewInstances[index], ...updates };
            }
        });
    }
    public deleteViewInstance = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.viewInstances = draft.viewInstances.filter(vi => vi.id !== id);
            draft.layouts.forEach(layout => {
                layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => vid !== id);
            });
        });
    }
    public moveViewInstance = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettingsAndPersist(draft => {
            this._moveItemInArray(draft.viewInstances, id, direction);
        });
    }
    public duplicateViewInstance = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            this._duplicateItemInArray(draft.viewInstances, id, 'title');
        });
    }

    public addLayout = async (name: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
            draft.layouts.push({
                id: this._generateId('layout'),
                name,
                viewInstanceIds: [],
                displayMode: 'list',
                initialView: '月',
                initialDateFollowsNow: true,
                parentId
            });
        });
    }
    public updateLayout = async (id: string, updates: Partial<Layout>) => {
        await this._updateSettingsAndPersist(draft => {
            const index = draft.layouts.findIndex(l => l.id === id);
            if (index !== -1) {
                draft.layouts[index] = { ...draft.layouts[index], ...updates };
            }
        });
    }
    public deleteLayout = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.layouts = draft.layouts.filter(l => l.id !== id);
        });
    }
    public moveLayout = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettingsAndPersist(draft => {
            this._moveItemInArray(draft.layouts, id, direction);
        });
    }
    public duplicateLayout = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            this._duplicateItemInArray(draft.layouts, id, 'name');
        });
    }

public addBlock = async (name: string) => {
    await this._updateSettingsAndPersist(draft => {
        draft.inputSettings.blocks.push({
            id: this._generateId('blk'),
            name,
            fields: [],
            outputTemplate: ``,
            targetFile: ``,
            appendUnderHeader: '',
        });
    });
}
public updateBlock = async (id: string, updates: Partial<BlockTemplate>) => {
    await this._updateSettingsAndPersist(draft => {
        const index = draft.inputSettings.blocks.findIndex(b => b.id === id);
        if (index > -1) {
            draft.inputSettings.blocks[index] = { ...draft.inputSettings.blocks[index], ...updates };
        }
    });
}
public deleteBlock = async (id: string) => {
    await this._updateSettingsAndPersist(draft => {
        draft.inputSettings.blocks = draft.inputSettings.blocks.filter(b => b.id !== id);
        draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => o.blockId !== id);
    });
}
public moveBlock = async (id: string, direction: 'up' | 'down') => {
    await this._updateSettingsAndPersist(draft => {
        this._moveItemInArray(draft.inputSettings.blocks, id, direction);
    });
}
public duplicateBlock = async (id: string) => {
    await this._updateSettingsAndPersist(draft => {
        this._duplicateItemInArray(draft.inputSettings.blocks, id, 'name');
    });
}

public addTheme = async (path: string) => {
    await this._updateSettingsAndPersist(draft => {
        if (path && !draft.inputSettings.themes.some(t => t.path === path)) {
            draft.inputSettings.themes.push({ id: this._generateId('thm'), path, icon: '' });
        }
    });
}
public updateTheme = async (id: string, updates: Partial<ThemeDefinition>) => {
    await this._updateSettingsAndPersist(draft => {
        const index = draft.inputSettings.themes.findIndex(t => t.id === id);
        if (index > -1) {
            if (updates.path && draft.inputSettings.themes.some(t => t.path === updates.path && t.id !== id)) {
                console.warn(`主题路径 "${updates.path}" 已存在。`);
                return;
            }
            draft.inputSettings.themes[index] = { ...draft.inputSettings.themes[index], ...updates };
        }
    });
}
public deleteTheme = async (id: string) => {
    await this._updateSettingsAndPersist(draft => {
        draft.inputSettings.themes = draft.inputSettings.themes.filter(t => t.id !== id);
        draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => o.themeId !== id);
    });
}
public moveTheme = async (id: string, direction: 'up' | 'down') => {
    await this._updateSettingsAndPersist(draft => {
        this._moveItemInArray(draft.inputSettings.themes, id, direction);
    });
}

public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>) => {
    await this._updateSettingsAndPersist(draft => {
        const index = draft.inputSettings.overrides.findIndex(o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId);
        if (index > -1) {
            const existingId = draft.inputSettings.overrides[index].id;
            draft.inputSettings.overrides[index] = { ...overrideData, id: existingId };
        } else {
            const newOverride: ThemeOverride = {
                id: this._generateId('ovr'),
                ...overrideData,
            };
            draft.inputSettings.overrides.push(newOverride);
        }
    });
}
public deleteOverride = async (blockId: string, themeId: string) => {
    await this._updateSettingsAndPersist(draft => {
        draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
            o => !(o.blockId === blockId && o.themeId === themeId)
        );
    });
}
}


export function useStore<T>(selector: (state: AppState) => T): T {
const store = AppStore.instance;
const getSnapshot = () => JSON.stringify(selector(store.getState()));

const [state, setState] = useState(getSnapshot());

useEffect(() => {
    const unsubscribe = store.subscribe(() => {
        const newSnapshot = getSnapshot();
        if (newSnapshot !== state) {
            setState(newSnapshot);
        }
    });
    return unsubscribe;
}, [store, selector, state]);

return JSON.parse(state);
}