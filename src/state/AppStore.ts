// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
import type { ThinkSettings, DataSource, ViewInstance, Layout } from '../main';
import type ThinkPlugin from '../main';
import { dayjs } from '@core/utils/date';
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

  private constructor() {}

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
    // 使用 structuredClone 确保我们操作的是一个全新的对象
    const newSettings = structuredClone(this._state.settings);
    updater(newSettings);
    this._state.settings = newSettings;
    
    // 调用插件的持久化方法, 这将触发后续的重渲染
    await this._plugin.persistAll(this._state.settings);
    
    // 通知所有监听者
    this._notify();
  }

  // ----- 行为 (Actions) ----- //
  
  private _generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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
      // 同时需要处理引用了此数据源的视图
      draft.viewInstances.forEach(vi => {
        if (vi.dataSourceId === id) {
          vi.dataSourceId = ''; // 或设置为一个默认值
        }
      });
    });
  }

  // -- ViewInstances Actions --
  public addViewInstance = async (name: string) => {
    await this._updateSettingsAndPersist(draft => {
      draft.viewInstances.push({
        id: this._generateId('view'),
        title: name,
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
        draft.viewInstances[index] = { ...draft.viewInstances[index], ...updates };
      }
    });
  }
  public deleteViewInstance = async (id: string) => {
    await this._updateSettingsAndPersist(draft => {
      draft.viewInstances = draft.viewInstances.filter(vi => vi.id !== id);
       // 同时需要处理引用了此视图的布局
      draft.layouts.forEach(layout => {
        layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => vid !== id);
      });
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
        initialDateFollowsNow: true, // [MOD] 新增字段的默认值
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

  // -- InputSettings Actions --
  public updateInputSettings = async (newInputSettings: ThinkSettings['inputSettings']) => {
    await this._updateSettingsAndPersist(draft => {
      draft.inputSettings = newInputSettings;
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