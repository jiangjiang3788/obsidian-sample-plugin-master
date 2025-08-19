// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
// [MOD] 导入所有需要的类型
import type { ThinkSettings, DataSource, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride } from '../main';
import type ThinkPlugin from '../main';
import { VIEW_DEFAULT_CONFIGS } from '@features/dashboard/settings/ModuleEditors/registry';

// 1. 定义 Store 中 state 的结构
export interface AppState {
    settings: ThinkSettings;
}

// 2. 实现 Store 类 (单例模式)
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
        await this._plugin.persistAll(this._state.settings);
        this._notify();
    }

    // ----- 行为 (Actions) ----- //

    private _generateId(prefix: string): string {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    // ----- 通用辅助函数 -----
    private _moveItemInArray<T extends { id: string }>(array: T[], id: string, direction: 'up' | 'down') {
        const index = array.findIndex(item => item.id === id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= array.length) return;

        const [movedItem] = array.splice(index, 1);
        array.splice(newIndex, 0, movedItem);
    }

    private _duplicateItemInArray<T extends { id: string, name?: string, title?: string }>(array: T[], id: string, nameField: 'name' | 'title' = 'name') {
        const index = array.findIndex(item => item.id === id);
        if (index === -1) return;

        const originalItem = array[index];
        const newItem = structuredClone(originalItem);
        newItem.id = this._generateId(originalItem.id.split('_')[0]);
        
        const currentName = (originalItem as any)[nameField] || '';
        (newItem as any)[nameField] = `${currentName} (副本)`;

        array.splice(index + 1, 0, newItem);
    }

    // -- DataSources Actions --
    public addDataSource = async (name: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.dataSources.push({ id: this._generateId('ds'), name, filters: [], sort: [] });
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

    // -- ViewInstances Actions --
    public addViewInstance = async (title: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.viewInstances.push({
                id: this._generateId('view'),
                title: title,
                viewType: 'BlockView',
                dataSourceId: '',
                viewConfig: structuredClone(VIEW_DEFAULT_CONFIGS.BlockView)
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

    // -- Layouts Actions --
    public addLayout = async (name: string) => {
        await this._updateSettingsAndPersist(draft => {
            draft.layouts.push({
                id: this._generateId('layout'),
                name,
                viewInstanceIds: [],
                displayMode: 'list',
                initialView: '月',
                initialDateFollowsNow: true,
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

    // -- [重构] InputSettings Actions --

    // BlockTemplate Actions
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
            // 级联删除所有相关的覆写
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

    // ThemeDefinition Actions
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
                // 如果路径已存在，则阻止更新
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
            // 级联删除所有相关的覆写
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => o.themeId !== id);
        });
    }
    public moveTheme = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettingsAndPersist(draft => {
            this._moveItemInArray(draft.inputSettings.themes, id, direction);
        });
    }

    // ThemeOverride Actions
    public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>) => {
        await this._updateSettingsAndPersist(draft => {
            const index = draft.inputSettings.overrides.findIndex(o => o.blockId === overrideData.blockId && o.themeId === overrideData.themeId);
            if (index > -1) {
                // 更新现有覆写
                const existingId = draft.inputSettings.overrides[index].id;
                draft.inputSettings.overrides[index] = { ...overrideData, id: existingId };
            } else {
                // 创建新覆写
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

// 3. 创建供 Preact 组件使用的 Hook
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = AppStore.instance;
    // 使用 JSON.stringify 进行简单的深比较，防止不必要的重复渲染
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