// src/state/AppStore.ts
import { useState, useEffect } from 'preact/hooks';
import type { ThinkSettings, DashboardConfig } from '../main';
import type ThinkPlugin from '../main';
import { dayjs } from '@core/utils/date';

// 1. 定义 Store 中 state 的结构
export interface AppState {
  settings: ThinkSettings;
  // 仪表盘 UI 状态 (可按需添加更多)
  dashboardState: {
    view: string;
    dateISO: string;
    keyword: string;
  };
}

// 2. 实现 Store 类 (单例模式)
export class AppStore {
  private static _instance: AppStore;
  private _plugin!: ThinkPlugin;
  private _state!: AppState;
  private _listeners: Set<() => void> = new Set();

  private constructor() {
    // 私有构造函数
  }

  public static get instance(): AppStore {
    if (!AppStore._instance) {
      AppStore._instance = new AppStore();
    }
    return AppStore._instance;
  }

  // 初始化 Store，由 main.ts 在 onload 时调用
  public init(plugin: ThinkPlugin, initialSettings: ThinkSettings) {
    this._plugin = plugin;
    this._state = {
      settings: initialSettings,
      dashboardState: {
        view: initialSettings.dashboards?.[0]?.initialView || '月',
        dateISO: (initialSettings.dashboards?.[0]?.initialDate ? dayjs(initialSettings.dashboards?.[0]?.initialDate) : dayjs()).format('YYYY-MM-DD'),
        keyword: '',
      }
    };
  }

  // ----- 选择器 (Selectors) ----- //
  public getState(): AppState {
    return this._state;
  }

  public getSettings(): ThinkSettings {
    return this._state.settings;
  }

  // ----- 订阅机制 ----- //
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify() {
    this._listeners.forEach(l => l());
  }
  
  // ----- 核心: 统一的状态更新与持久化 ----- //
  private _updateState(updater: (draft: AppState) => void) {
    updater(this._state);
    this._notify();
  }

  private async _updateSettingsAndPersist(updater: (draft: ThinkSettings) => void) {
    const newSettings = structuredClone(this._state.settings);
    updater(newSettings);
    this._state.settings = newSettings;
    // 调用插件的持久化方法，这将触发后续的重渲染
    await this._plugin.persistAll(this._state.settings);
    this._notify();
  }

  // ----- 行为 (Actions) ----- //

  public updateInputSettings = async (newInputSettings: ThinkSettings['inputSettings']) => {
    await this._updateSettingsAndPersist(draft => {
      draft.inputSettings = newInputSettings;
    });
  }

  public addDashboard = async (name: string = '新仪表盘') => {
    await this._updateSettingsAndPersist(draft => {
      let finalName = name;
      let n = 1;
      // 确保名称唯一
      while (draft.dashboards.some(d => d.name === finalName)) {
        finalName = `${name}${n++}`;
      }
      draft.dashboards.push({ name: finalName, modules: [] });
    });
  }

  public deleteDashboard = async (idx: number) => {
    await this._updateSettingsAndPersist(draft => {
      if (idx >= 0 && idx < draft.dashboards.length) {
        draft.dashboards.splice(idx, 1);
      }
    });
  }

  public updateDashboard = async (idx: number, newDashData: DashboardConfig) => {
    await this._updateSettingsAndPersist(draft => {
        if (idx >= 0 && idx < draft.dashboards.length) {
            draft.dashboards[idx] = newDashData;
        }
    });
  }
}

// 3. 创建供 Preact 组件使用的 Hook
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = AppStore.instance;
    const [slice, setSlice] = useState(() => selector(store.getState()));

    useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            const newSlice = selector(store.getState());
            // 使用 JSON.stringify 进行简单的深比较，防止不必要的重复渲染
            setSlice(currentSlice => {
                if (JSON.stringify(newSlice) !== JSON.stringify(currentSlice)) {
                    return newSlice;
                }
                return currentSlice;
            });
        });
        return unsubscribe;
    }, [store, selector]);

    return slice;
}