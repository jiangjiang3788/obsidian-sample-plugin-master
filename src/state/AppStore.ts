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
    updater(this._state.settings);
    await this._plugin.persistAll(this._state.settings);
    this._notify();
  }

  // ----- 行为 (Actions) ----- //

  // Dashboard UI Actions
  public setDashboardUiState = (patch: Partial<AppState['dashboardState']>) => {
    this._updateState(draft => {
        draft.dashboardState = { ...draft.dashboardState, ...patch };
    });
  }
  
  // Settings Actions
  public updateInputSettings = async (newInputSettings: ThinkSettings['inputSettings']) => {
    await this._updateSettingsAndPersist(draft => {
      draft.inputSettings = newInputSettings;
    });
  }

  public addDashboard = async () => {
    await this._updateSettingsAndPersist(draft => {
      let name = '新仪表盘', n = 1;
      while (draft.dashboards.some(d => d.name === name)) {
        name = `新仪表盘${n++}`;
      }
      draft.dashboards.push({ name, modules: [] });
    });
  }

  public deleteDashboard = async (idx: number) => {
    await this._updateSettingsAndPersist(draft => {
      draft.dashboards.splice(idx, 1);
    });
  }

  public updateDashboard = async (idx: number, newDashData: DashboardConfig) => {
    await this._updateSettingsAndPersist(draft => {
      draft.dashboards[idx] = newDashData;
    });
  }
}

// 3. 创建供 React 组件使用的 Hook
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = AppStore.instance;

    // 使用 useState 来持有从 store 选择出的状态切片
    const [slice, setSlice] = useState(() => selector(store.getState()));

    useEffect(() => {
        // 订阅 store 的变化
        const unsubscribe = store.subscribe(() => {
            const newSlice = selector(store.getState());
            // 关键优化：只有当选择的状态切片真正改变时才更新组件状态
            setSlice(currentSlice => {
                if (newSlice !== currentSlice) {
                    return newSlice;
                }
                return currentSlice;
            });
        });

        // 组件卸载时取消订阅
        return unsubscribe;
    }, [selector]); // 如果 selector 函数本身变化，则重新订阅

    return slice;
}