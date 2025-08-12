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
    // 使用 structuredClone 避免直接修改 state 引用，虽然在当前实现中不是必须的，但是个好习惯
    const newSettings = structuredClone(this._state.settings);
    updater(newSettings);
    this._state.settings = newSettings;
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

  // [FIX] 允许传入一个预设的名称
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

// 3. 创建供 React 组件使用的 Hook
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = AppStore.instance;

    // 使用 useState 来持有从 store 选择出的状态切片
    const [slice, setSlice] = useState(() => selector(store.getState()));

    useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            const newSlice = selector(store.getState());
            // 使用函数式更新来比较前后 state，避免不必要的渲染
            setSlice(currentSlice => {
                // 进行浅比较，如果选择的是对象或数组，这可能不足够
                // 但对于 dashboards 和 inputSettings 这种通常整个替换的场景是有效的
                if (JSON.stringify(newSlice) !== JSON.stringify(currentSlice)) {
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