/**
 * AppStore
 * Role: Store (状态聚合器) - 应用级状态管理中心
 * Dependencies: 所有子 Store (TimerStore, ThemeStore, etc.), ThinkPlugin (用于持久化)
 * 
 * Do:
 * - 持有并暴露所有子 Store 的实例 (theme, layout, timer, etc.)
 * - 聚合应用的总状态 (AppState)
 * - 提供统一的订阅机制，以便 React 组件 (useStore) 可以监听全局状态变化
 * - 协调设置的持久化 (_updateSettingsAndPersist)
 * - 管理一些不属于任何子 Store 的临时 UI 状态 (isTimerWidgetVisible)
 * 
 * Don't:
 * - 具体的业务逻辑 (所有业务逻辑都委托给相应的子 Store)
 */
import { useState, useEffect, useCallback } from 'preact/hooks';
import { singleton, inject } from 'tsyringe';
import type { ThinkSettings, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@/core/types/schema';
import { DEFAULT_SETTINGS } from '@/core/types/schema';
import type ThinkPlugin from '@main';
import { VIEW_DEFAULT_CONFIGS } from '@/features/settings/registry';
import { generateId, moveItemInArray, duplicateItemInArray } from '@core/utils/array';
import { appStore } from '@/app/storeRegistry';
import { SETTINGS_TOKEN, ISettingsProvider } from '@/core/services/types';
import { ThemeStore } from '@features/settings/ThemeStore';
import { TimerStore, type TimerState } from '@features/timer/TimerStore';
import { LayoutStore } from '@/features/settings/LayoutStore';
import { ViewInstanceStore } from '@/features/settings/ViewInstanceStore';
import { BlockStore } from '@/features/settings/BlockStore';
import { GroupStore } from '@/features/settings/GroupStore';
import { SettingsStore } from '@features/settings/SettingsStore';

export interface AppState {
    settings: ThinkSettings;
    // [移除] timers和activeTimer已移到TimerStore管理
    // [新增] 悬浮计时器是否可见的临时状态
    isTimerWidgetVisible: boolean;
    // [新增] TimerStore实例
    timer: TimerStore;
}

@singleton()
export class AppStore implements ISettingsProvider {
    private _plugin?: ThinkPlugin;
    private _state: AppState;
    private _listeners: Set<() => void> = new Set();

    // 子Store实例
    public readonly theme: ThemeStore;
    public readonly layout: LayoutStore;
    public readonly group: GroupStore;
    public readonly settings: SettingsStore;
    public readonly timer: TimerStore;
    public readonly viewInstance: ViewInstanceStore;
    public readonly block: BlockStore;

    public constructor(
        @inject(SETTINGS_TOKEN) initialSettings: ThinkSettings,
        @inject(TimerStore) timerStore: TimerStore
    ) {
        // 初始化子Store
        this.timer = timerStore;
        // 订阅 TimerStore 的变化以触发 AppStore 的更新
        this.timer.subscribe(this._notify.bind(this));

        this.theme = new ThemeStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        this.layout = new LayoutStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        this.group = new GroupStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        this.settings = new SettingsStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        this.viewInstance = new ViewInstanceStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        this.block = new BlockStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );

        this._state = {
            settings: initialSettings,
            // [新增] 初始化时，可见性取决于设置项
            isTimerWidgetVisible: initialSettings.floatingTimerEnabled,
            // [新增] TimerStore实例
            timer: this.timer,
        };
    }

    public setPlugin(plugin: ThinkPlugin) {
        this._plugin = plugin;
    }
    
    // [移除] _deriveState不再需要，activeTimer由TimerStore直接管理

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
    
    public _updateSettingsAndPersist = async (updater: (draft: ThinkSettings) => void) => {
        if (!this._plugin) {
            console.error("AppStore: 插件实例未设置，无法保存设置。");
            return;
        }
        const newSettings = JSON.parse(JSON.stringify(this._state.settings));
        updater(newSettings);
        this._state.settings = newSettings;
        try {
            await this._plugin.saveData(this._state.settings);
        } catch (error) {
            console.error("AppStore: 保存设置失败", error);
            // 不重新抛出错误，让应用继续运行
        }
        this._notify();
    }

    private _updateEphemeralState(updater: (draft: AppState) => void) {
        updater(this._state);
        this._notify();
    }
    
    // [新增] 用于切换悬浮窗可见性的方法 (不保存)
    public toggleTimerWidgetVisibility = () => {
        this._updateEphemeralState(draft => {
            draft.isTimerWidgetVisible = !draft.isTimerWidgetVisible;
        });
    }

    // [新增] 用于更新永久设置的方法 (会保存)
    public updateFloatingTimerEnabled = async (enabled: boolean) => {
        await this._updateSettingsAndPersist(draft => {
            draft.floatingTimerEnabled = enabled;
        });
        // 当用户启用或禁用时，同步更新当前的可见状态
        this._updateEphemeralState(draft => {
            draft.isTimerWidgetVisible = enabled;
        });
    }

    // --- Timer相关方法委托给TimerStore ---
    public setInitialTimers(initialTimers: TimerState[]) {
        this.timer.setInitialTimers(initialTimers);
    }

    public addTimer = async (timer: Omit<TimerState, 'id'>) => {
        return this.timer.addTimer(timer);
    }

    public updateTimer = async (updatedTimer: TimerState) => {
        return this.timer.updateTimer(updatedTimer);
    }

    public removeTimer = async (timerId: string) => {
        return this.timer.removeTimer(timerId);
    }

    // 获取计时器列表（从TimerStore）
    public getTimers = (): TimerState[] => {
        return this.timer.getTimers();
    }

    // 获取活跃计时器（从TimerStore）
    public getActiveTimer = (): TimerState | undefined => {
        return this.timer.getActiveTimer();
    }
    // --- Group相关方法委托给GroupStore ---
    public addGroup = async (name: string, parentId: string | null, type: GroupType) => {
        return this.group.addGroup(name, parentId, type);
    }

    public updateGroup = async (id: string, updates: Partial<Group>) => {
        return this.group.updateGroup(id, updates);
    }

    public deleteGroup = async (id: string) => {
        return this.group.deleteGroup(id);
    }

    public duplicateGroup = async (groupId: string) => {
        return this.group.duplicateGroup(groupId);
    }

    public moveItem = async (itemId: string, targetParentId: string | null) => {
        return this.group.moveItem(itemId, targetParentId);
    }

    public reorderItems = async (reorderedSiblings: (Groupable & {isGroup?: boolean})[], itemType: 'group' | 'viewInstance' | 'layout') => {
        return this.group.reorderItems(reorderedSiblings, itemType);
    }

    // --- ViewInstance相关方法委托给ViewInstanceStore ---
    public addViewInstance = async (title: string, parentId: string | null = null) => {
        return this.viewInstance.addViewInstance(title, parentId);
    }

    public updateViewInstance = async (id: string, updates: Partial<ViewInstance>) => {
        return this.viewInstance.updateViewInstance(id, updates);
    }

    public deleteViewInstance = async (id: string) => {
        return this.viewInstance.deleteViewInstance(id);
    }

    public moveViewInstance = async (id: string, direction: 'up' | 'down') => {
        return this.viewInstance.moveViewInstance(id, direction);
    }

    public duplicateViewInstance = async (id: string) => {
        return this.viewInstance.duplicateViewInstance(id);
    }

    // --- Layout相关方法委托给LayoutStore ---
    public addLayout = async (name: string, parentId: string | null = null) => {
        return this.layout.addLayout(name, parentId);
    }

    public updateLayout = async (id: string, updates: Partial<Layout>) => {
        return this.layout.updateLayout(id, updates);
    }

    public deleteLayout = async (id: string) => {
        return this.layout.deleteLayout(id);
    }

    public moveLayout = async (id: string, direction: 'up' | 'down') => {
        return this.layout.moveLayout(id, direction);
    }

    public duplicateLayout = async (id: string) => {
        return this.layout.duplicateLayout(id);
    }

    // --- Settings相关方法委托给SettingsStore ---
    public updateInputSettings = async (updates: Partial<InputSettings>) => {
        return this.settings.updateInputSettings(updates);
    }

    // --- Block相关方法委托给BlockStore ---
    public addBlock = async (name: string) => {
        return this.block.addBlock(name);
    }

    public updateBlock = async (id: string, updates: Partial<BlockTemplate>) => {
        return this.block.updateBlock(id, updates);
    }

    public deleteBlock = async (id: string) => {
        return this.block.deleteBlock(id);
    }

    public moveBlock = async (id: string, direction: 'up' | 'down') => {
        return this.block.moveBlock(id, direction);
    }

    public duplicateBlock = async (id: string) => {
        return this.block.duplicateBlock(id);
    }

    // --- Theme相关方法委托给ThemeStore ---
    public addTheme = async (path: string) => {
        return this.theme.addTheme(path);
    }

    public updateTheme = async (id: string, updates: Partial<ThemeDefinition>) => {
        return this.theme.updateTheme(id, updates);
    }

    public deleteTheme = async (id: string) => {
        return this.theme.deleteTheme(id);
    }

    public batchUpdateThemes = async (themeIds: string[], updates: Partial<ThemeDefinition>) => {
        return this.theme.batchUpdateThemes(themeIds, updates);
    }

    public batchDeleteThemes = async (themeIds: string[]) => {
        return this.theme.batchDeleteThemes(themeIds);
    }

    public batchUpdateThemeStatus = async (themeIds: string[], status: 'active' | 'archived') => {
        return this.theme.batchUpdateThemeStatus(themeIds, status);
    }

    public batchUpdateThemeIcon = async (themeIds: string[], icon: string) => {
        return this.theme.batchUpdateThemeIcon(themeIds, icon);
    }

    public batchSetOverrideStatus = async (
        cells: Array<{ themeId: string; blockId: string }>,
        status: 'inherit' | 'override' | 'disabled'
    ) => {
        return this.theme.batchSetOverrideStatus(cells, status);
    }

    public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>) => {
        return this.theme.upsertOverride(overrideData);
    }

    public deleteOverride = async (blockId: string, themeId: string) => {
        return this.theme.deleteOverride(blockId, themeId);
    }

    public batchUpsertOverrides = async (overrides: Array<Omit<ThemeOverride, 'id'>>) => {
        return this.theme.batchUpsertOverrides(overrides);
    }

    public batchDeleteOverrides = async (selections: Array<{blockId: string; themeId: string}>) => {
        return this.theme.batchDeleteOverrides(selections);
    }
}
export function useStore<T>(selector: (state: AppState) => T): T {
    const store = appStore;

    if (!store) {
        // 创建一个临时的 TimerStore 实例作为备用
        // 注意：这里我们需要模拟 TimerStateService，或者简单地传入 null/undefined 并忽略错误，
        // 因为这只是一个备用状态。为了类型安全，我们使用类型断言。
        const fallbackTimerStore = new TimerStore({} as any);
        const safeFallbackState: AppState = {
            settings: DEFAULT_SETTINGS,
            // [移除] timers和activeTimer
            isTimerWidgetVisible: true,
            // [新增] TimerStore实例
            timer: fallbackTimerStore,
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
