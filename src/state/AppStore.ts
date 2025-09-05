// src/state/AppStore.ts
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ThinkSettings, DataSource, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@core/domain/schema';
import { DEFAULT_SETTINGS } from '@core/domain/schema';
import type ThinkPlugin from '../main';
import { VIEW_DEFAULT_CONFIGS } from '@features/settings/ui/components/view-editors/registry';
import { generateId, moveItemInArray, duplicateItemInArray } from '@core/utils/array';
import { TimerStateService } from '@core/services/TimerStateService';
import { appStore } from './storeRegistry';

export interface TimerState {
    id: string;
    taskId: string;
    startTime: number;
    elapsedSeconds: number;
    status: 'running' | 'paused';
}

export interface AppState {
    settings: ThinkSettings;
    timers: TimerState[];
    activeTimer?: TimerState;
}

export class AppStore {
    private _plugin!: ThinkPlugin;
    private _state!: AppState;
    private _listeners: Set<() => void> = new Set();

    public constructor() { }

    public init(plugin: ThinkPlugin, initialSettings: ThinkSettings) {
        this._plugin = plugin;
        this._state = {
            settings: initialSettings,
            timers: [],
        };
        this._deriveState();
    }
    
    private _deriveState() {
        this._state.activeTimer = this._state.timers.find(t => t.status === 'running');
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
        this._deriveState(); // 每次通知前都重新计算派生状态
        this._listeners.forEach(l => l());
    }
    
    public _updateSettingsAndPersist = async (updater: (draft: ThinkSettings) => void) => {
        const newSettings = structuredClone(this._state.settings);
        updater(newSettings);
        this._state.settings = newSettings;
        await this._plugin.saveData(this._state.settings);
        this._notify();
    }

    private _updateEphemeralState(updater: (draft: AppState) => void) {
        updater(this._state);
        this._notify();
    }

    public setInitialTimers(initialTimers: TimerState[]) {
        this._updateEphemeralState(draft => {
            draft.timers = initialTimers;
        });
    }

    private async _updateTimersAndPersist(updater: (draft: TimerState[]) => TimerState[]) {
        const newTimers = updater(structuredClone(this._state.timers));
        this._state.timers = newTimers;
        this._notify();
        // 注意：TimerStateService 仍然可以使用单例，因为它是一个非常简单的、无复杂依赖的服务
        await TimerStateService.instance.saveStateToFile(newTimers);
    }

    public addTimer = async (timer: Omit<TimerState, 'id'>) => {
        await this._updateTimersAndPersist(draft => {
            const newTimer: TimerState = { ...timer, id: generateId('timer') };
            draft.push(newTimer);
            return draft;
        });
    }

    public updateTimer = async (updatedTimer: TimerState) => {
        await this._updateTimersAndPersist(draft => {
            const index = draft.findIndex(t => t.id === updatedTimer.id);
            if (index !== -1) {
                draft[index] = updatedTimer;
            }
            return draft;
        });
    }

    public removeTimer = async (timerId: string) => {
        await this._updateTimersAndPersist(draft => {
            return draft.filter(t => t.id !== timerId);
        });
    }

    // --- 所有设置管理方法 ---
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
            const allItems: (Groupable & { id: string })[] = [...draft.groups, ...draft.dataSources, ...draft.viewInstances, ...draft.layouts];
            const itemToMove = allItems.find(i => i.id === itemId);
            if (!itemToMove) return;
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

    public reorderItems = async (reorderedSiblings: (Groupable & {isGroup?: boolean})[], itemType: 'group' | 'dataSource' | 'viewInstance' | 'layout') => {
        await this._updateSettingsAndPersist(draft => {
            const parentId = reorderedSiblings.length > 0 ? reorderedSiblings[0].parentId : undefined;

            let fullArray: (Groupable & {id: string})[];
            if (itemType === 'group') {
                fullArray = draft.groups;
            } else if (itemType === 'dataSource') {
                fullArray = draft.dataSources;
            } else if (itemType === 'viewInstance') {
                fullArray = draft.viewInstances;
            } else {
                fullArray = draft.layouts;
            }
            
            const otherItems = fullArray.filter(i => i.parentId !== parentId);
            
            const newFullArray = [...otherItems, ...reorderedSiblings];
            
            if (itemType === 'group') {
                draft.groups = newFullArray as Group[];
            } else if (itemType === 'dataSource') {
                draft.dataSources = newFullArray as DataSource[];
            } else if (itemType === 'viewInstance') {
                draft.viewInstances = newFullArray as ViewInstance[];
            } else {
                draft.layouts = newFullArray as Layout[];
            }
        });
    }

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

    public updateInputSettings = async (updates: Partial<InputSettings>) => {
        await this._updateSettingsAndPersist(draft => {
            draft.inputSettings = { ...draft.inputSettings, ...updates };
        });
    }

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

// [修改] 加固 useStore Hook
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = appStore;

    if (!store) {
        const safeFallbackState: AppState = {
            settings: DEFAULT_SETTINGS,
            timers: [],
            activeTimer: undefined,
        };
        console.warn("useStore 在 AppStore 注册前被调用。返回安全的备用状态。");
        return selector(safeFallbackState);
    }
    
    const memoizedSelector = useCallback(selector, []);
    
    const [state, setState] = useState(() => memoizedSelector(store.getState()));

    useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            const newStateSlice = memoizedSelector(store.getState());
            
            setState(currentStateSlice => {
                if (Object.is(currentStateSlice, newStateSlice)) {
                    return currentStateSlice;
                }
                console.log("一个组件因其订阅的状态变更而计划重渲染。", {
                    componentHint: memoizedSelector.toString().slice(0, 100)
                });
                return newStateSlice;
            });
        });

        const initialStateSlice = memoizedSelector(store.getState());
        if (!Object.is(state, initialStateSlice)) {
            setState(initialStateSlice);
        }

        return unsubscribe;
    }, [store, memoizedSelector]);

    return state;
}