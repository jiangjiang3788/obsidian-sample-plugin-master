// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
import type { ThinkSettings, DataSource, ViewInstance, Layout, InputTemplate, InputSettings } from '../main'; // 导入新类型
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

  // ----- [NEW] Generic Reusable Helper Functions -----
  private _moveItemInArray<T extends { id: string }>(array: T[], id: string, direction: 'up' | 'down') {
    const index = array.findIndex(item => item.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= array.length) return;

    const [movedItem] = array.splice(index, 1);
    array.splice(newIndex, 0, movedItem);
  }

  private _duplicateItemInArray<T extends { id: string, name: string }>(array: T[], id: string) {
    const index = array.findIndex(item => item.id === id);
    if (index === -1) return;

    const originalItem = array[index];
    const newItem = structuredClone(originalItem);
    newItem.id = this._generateId(originalItem.id.split('_')[0]);
    newItem.name = `${originalItem.name} (Copy)`;

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
      // 同时需要处理引用了此数据源的视图
      draft.viewInstances.forEach(vi => {
        if (vi.dataSourceId === id) {
          vi.dataSourceId = ''; // 或设置为一个默认值
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
      this._duplicateItemInArray(draft.dataSources, id);
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
        // 当视图类型改变时，重置其专属配置
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
      // 同时需要处理引用了此视图的布局
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
      // 视图的复制逻辑特殊，因为它的 `name` 字段是 `title`
      const index = draft.viewInstances.findIndex(item => item.id === id);
      if (index === -1) return;
      const originalItem: any = draft.viewInstances[index];
      const newItem = structuredClone(originalItem);
      newItem.id = this._generateId('view');
      newItem.title = `${originalItem.title} (Copy)`;
      draft.viewInstances.splice(index + 1, 0, newItem);
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
      this._duplicateItemInArray(draft.layouts, id);
    });
  }

  // -- InputSettings Actions --
  // [重构] 替换旧的 updateInputSettings

  /**
   * 更新整个 inputSettings 对象，通常用于初始化或整体重置
   */
  public updateInputSettings = async (newInputSettings: InputSettings) => {
    await this._updateSettingsAndPersist(draft => {
      draft.inputSettings = newInputSettings;
    });
  }

  /**
   * 更新 Block 类型列表
   */
  public updateBlockTypes = async (newBlockTypes: string[]) => {
    await this._updateSettingsAndPersist(draft => {
        // 安全地处理 undefined
        if (!draft.inputSettings) draft.inputSettings = { blockTypes: [], themePaths: [], templates: [] };
        
        const oldBlockTypes = new Set(draft.inputSettings.blockTypes || []);
        const newBlockTypesSet = new Set(newBlockTypes);
        
        // 找出被删除的 block 类型
        const deletedTypes = [...oldBlockTypes].filter(t => !newBlockTypesSet.has(t));

        // 从 templates 中移除与已删除 block 类型相关的模板
        if (deletedTypes.length > 0) {
            draft.inputSettings.templates = (draft.inputSettings.templates || []).filter(template => {
                const type = template.name.split('#type:')[1];
                return !deletedTypes.includes(type);
            });
        }
        draft.inputSettings.blockTypes = newBlockTypes;
    });
  }

  /**
   * 更新主题路径列表
   */
  public updateThemePaths = async (newThemePaths: string[]) => {
    await this._updateSettingsAndPersist(draft => {
        if (!draft.inputSettings) draft.inputSettings = { blockTypes: [], themePaths: [], templates: [] };

        const oldThemePaths = new Set(draft.inputSettings.themePaths || []);
        const newThemePathsSet = new Set(newThemePaths);

        const deletedPaths = [...oldThemePaths].filter(p => !newThemePathsSet.has(p));

        // 删除与已删除主题路径相关的模板
        if (deletedPaths.length > 0) {
            draft.inputSettings.templates = (draft.inputSettings.templates || []).filter(template => {
                const theme = template.name.split('#type:')[0].replace('theme:', '');
                return !deletedPaths.includes(theme);
            });
        }
        draft.inputSettings.themePaths = newThemePaths;
    });
  }

  /**
   * 更新或创建一个模板
   * 如果模板ID已存在，则更新；否则，添加新模板。
   */
  public upsertTemplate = async (template: InputTemplate) => {
    await this._updateSettingsAndPersist(draft => {
      if (!draft.inputSettings) draft.inputSettings = { blockTypes: [], themePaths: [], templates: [] };
      const index = draft.inputSettings.templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        draft.inputSettings.templates[index] = template;
      } else {
        draft.inputSettings.templates.push(template);
      }
    });
  }

  /**
   * 根据唯一名称删除一个模板
   */
  public deleteTemplateByName = async (name: string) => {
      await this._updateSettingsAndPersist(draft => {
          if (!draft.inputSettings) return;
          draft.inputSettings.templates = (draft.inputSettings.templates || []).filter(t => t.name !== name);
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