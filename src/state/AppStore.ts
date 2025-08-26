// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
import type { ThinkSettings, DataSource, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@core/domain/schema';
import type ThinkPlugin from '../main';
// [修正] 将导入路径从旧的 dashboard 目录更新到新的 settings 目录
import { VIEW_DEFAULT_CONFIGS } from '@features/settings/ui/components/view-editors/registry';
import { generateId, moveItemInArray, duplicateItemInArray } from '@core/utils/array';

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
    
    // --- 分组管理 (Group Management) ---
    public addGroup = async (name: string, parentId: string | null, type: GroupType) => {
        await this._updateSettingsAndPersist(draft => {
            const newGroup: Group = { id: generateId('group'), name, parentId, type };
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

            draft.groups.forEach(g => {
                if (g.parentId === id) g.parentId = newParentId;
            });
            const itemArrays: Groupable[][] = [draft.dataSources, draft.viewInstances, draft.layouts];
            itemArrays.forEach(arr => {
                arr.forEach(item => {
                    if (item.parentId === id) item.parentId = newParentId;
                });
            });

            draft.groups = draft.groups.filter(g => g.id !== id);
        });
    }
    
	public duplicateGroup = async (groupId: string) => {
		await this._updateSettingsAndPersist(draft => {
			const groupToDuplicate = draft.groups.find(g => g.id === groupId);
			if (!groupToDuplicate) return;

			const deepDuplicate = (originalGroupId: string, newParentId: string | null) => {
				const originalGroup = draft.groups.find(g => g.id === originalGroupId);
				if (!originalGroup) return;

				const newGroup: Group = {
					...structuredClone(originalGroup),
					id: generateId('group'),
					parentId: newParentId,
					name: originalGroup.id === groupId ? `${originalGroup.name} (副本)` : originalGroup.name,
				};
				draft.groups.push(newGroup);

				const getItemsArrayForType = (type: GroupType) => {
					switch (type) {
						case 'dataSource': return { items: draft.dataSources, prefix: 'ds' };
						case 'viewInstance': return { items: draft.viewInstances, prefix: 'view' };
						case 'layout': return { items: draft.layouts, prefix: 'layout' };
						default: return { items: [], prefix: 'item' };
					}
				};

				const { items, prefix } = getItemsArrayForType(originalGroup.type);
				const childItemsToDuplicate = items.filter(item => item.parentId === originalGroupId);
				childItemsToDuplicate.forEach(item => {
					const newItem = {
						...structuredClone(item),
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

    public moveItem = async (itemId: string, targetParentId: string | null) => {
        await this._updateSettingsAndPersist(draft => {
            const allItems: (Groupable & {id: string})[] = [...draft.groups, ...draft.dataSources, ...draft.viewInstances, ...draft.layouts];
            const itemToMove = allItems.find(i => i.id === itemId);

            if (!itemToMove) return;

            if (itemId.startsWith('group_')) {
                let currentParentId = targetParentId;
                while(currentParentId) {
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

    // --- 数据源管理 (DataSource Management) ---
    public addDataSource = async (name: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
            draft.dataSources.push({ id: generateId('ds'), name, filters: [], sort: [], parentId });
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
            draft.dataSources = moveItemInArray(draft.dataSources, id, direction);
        });
    }
    public duplicateDataSource = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.dataSources = duplicateItemInArray(draft.dataSources, id, 'name');
        });
    }

    // --- 视图管理 (ViewInstance Management) ---
    public addViewInstance = async (title: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
            draft.viewInstances.push({
                id: generateId('view'),
                title: title,
                viewType: 'BlockView',
                dataSourceId: '',
                viewConfig: structuredClone(VIEW_DEFAULT_CONFIGS.BlockView),
                collapsed: true,
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
            draft.viewInstances = moveItemInArray(draft.viewInstances, id, direction);
        });
    }
    public duplicateViewInstance = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.viewInstances = duplicateItemInArray(draft.viewInstances, id, 'title');
        });
    }

    // --- 布局管理 (Layout Management) ---
    public addLayout = async (name: string, parentId: string | null = null) => {
        await this._updateSettingsAndPersist(draft => {
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
            draft.layouts = moveItemInArray(draft.layouts, id, direction);
        });
    }
    public duplicateLayout = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.layouts = duplicateItemInArray(draft.layouts, id, 'name');
        });
    }
    
    // --- 快速输入设置管理 (InputSettings Management) ---
    public addBlock = async (name: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.inputSettings.blocks.push({
                id: generateId('blk'),
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
            draft.inputSettings.blocks = moveItemInArray(draft.inputSettings.blocks, id, direction);
        });
    }
    public duplicateBlock = async (id: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.inputSettings.blocks = duplicateItemInArray(draft.inputSettings.blocks, id, 'name');
        });
    }
    
    public addTheme = async (path: string) => {
        await this._updateSettingsAndPersist(draft => {
            if (path && !draft.inputSettings.themes.some(t => t.path === path)) {
                draft.inputSettings.themes.push({ id: generateId('thm'), path, icon: '' });
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
    
    public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>) => {
        await this._updateSettingsAndPersist(draft => {
            const index = draft.inputSettings.overrides.findIndex(o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId);
            if (index > -1) {
                const existingId = draft.inputSettings.overrides[index].id;
                draft.inputSettings.overrides[index] = { ...overrideData, id: existingId };
            } else {
                const newOverride: ThemeOverride = {
                    id: generateId('ovr'),
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