/**
 * AppStore
 * Role: Store (状态聚合器) - 应用级状态管理中心
 * 
 * ⚠️ 兼容层 (DEPRECATED)：
 * 此类保留作为过渡兼容层，新的状态管理已迁移到 Zustand slices。
 * 请勿在此类中新增业务逻辑。所有新功能应通过 UseCase 层调用 Zustand store。
 * 
 * 【S5 收口】
 * - LayoutStore、ViewInstanceStore、GroupStore 已禁用
 * - Layout/ViewInstance 的 CRUD 和 reorder 应通过 useCases.layout.* 调用
 * - AppStore 中的相关委托方法保留接口，但抛出 deprecated 错误
 * 
 * Dependencies: TimerStore, ThemeStore, SettingsStore, BlockStore, SettingsRepository
 * 
 * Do:
 * - 持有并暴露仍在使用的子 Store 的实例 (theme, timer, settings, block)
 * - 聚合应用的总状态 (AppState)
 * - 提供统一的订阅机制，以便 React 组件 (useStore) 可以监听全局状态变化
 * - 协调设置的更新（通过 SettingsRepository）
 * - 管理一些不属于任何子 Store 的临时 UI 状态 (isTimerWidgetVisible)
 * 
 * Don't:
 * - 直接进行 IO 操作（所有 IO 委托给 SettingsRepository）
 * - 持有 plugin 实例
 * - 实例化已禁用的 Store (LayoutStore, ViewInstanceStore, GroupStore)
 * - 新增任何新的业务逻辑（使用 UseCase + Zustand 替代）
 */
import { useState, useEffect, useCallback } from 'preact/hooks';
import { singleton, inject } from 'tsyringe';
import type { ThinkSettings, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@/core/types/schema';
import { SETTINGS_TOKEN, ISettingsProvider } from '@/core/services/types';
import { SettingsRepository } from '@/core/services/SettingsRepository';
import { useAppStore } from '@/app/AppStoreContext';
import { ThemeStore } from '@features/settings/ThemeStore';
import { TimerStore, type TimerState } from '@features/timer/TimerStore';
import { BlockStore } from '@/features/settings/BlockStore';
import { SettingsStore } from '@features/settings/SettingsStore';

// S5: Layout/ViewInstance/Group Store 已禁用，不再 import
const LAYOUT_DEPRECATED_ERROR = 'Layout operations through AppStore are deprecated. Use useCases.layout instead.';
const VIEW_INSTANCE_DEPRECATED_ERROR = 'ViewInstance operations through AppStore are deprecated. Use useCases.layout.addView/updateView/deleteView instead.';
const GROUP_DEPRECATED_ERROR = 'Group feature is disabled in S5. Use useCases.layout instead.';

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
    private _state: AppState;
    private _listeners: Set<() => void> = new Set();

    // 子Store实例
    // S5: layout、viewInstance、group 已禁用，不再持有实例
    public readonly theme: ThemeStore;
    public readonly settings: SettingsStore;
    public readonly timer: TimerStore;
    public readonly block: BlockStore;

    // SettingsRepository 注入
    private readonly settingsRepository: SettingsRepository;

    public constructor(
        @inject(SETTINGS_TOKEN) initialSettings: ThinkSettings,
        @inject(TimerStore) timerStore: TimerStore,
        @inject(SettingsRepository) settingsRepository: SettingsRepository
    ) {
        this.settingsRepository = settingsRepository;
        
        // 初始化 SettingsRepository 的设置
        this.settingsRepository.setInitialSettings(initialSettings);

        // 初始化子Store
        this.timer = timerStore;
        // 订阅 TimerStore 的变化以触发 AppStore 的更新
        this.timer.subscribe(this._notify.bind(this));

        this.theme = new ThemeStore(
            this._updateSettingsAndPersist.bind(this),
            this.getSettings.bind(this)
        );
        // S5: layout、viewInstance、group 已禁用，不再实例化
        // this.layout = new LayoutStore(...);
        // this.viewInstance = new ViewInstanceStore(...);
        // this.group = new GroupStore(...);
        this.settings = new SettingsStore(
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
    
    /**
     * 更新设置并持久化
     * 使用 SettingsRepository 的 immer/produce 更新
     */
    public _updateSettingsAndPersist = async (updater: (draft: ThinkSettings) => void) => {
        try {
            // 通过 SettingsRepository 更新（使用 immer）
            const newSettings = await this.settingsRepository.update(updater);
            this._state.settings = newSettings;
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

    /**
     * @deprecated MIGRATION - 仅迁移期使用
     * 从 SettingsRepository 同步设置到 AppStore
     * 不做持久化、不触发 repository.update（避免循环）
     */
    public __syncSettingsFromRepo(settings: ThinkSettings): void {
        this._state.settings = settings;
        // 同步派生状态：如果 floatingTimerEnabled 变为 false，则关闭 widget
        if (!settings.floatingTimerEnabled) {
            this._state.isTimerWidgetVisible = false;
        }
        this._notify();
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
    // --- Group相关方法 - S5 已禁用 ---
    /** @deprecated Group feature disabled in S5 */
    public addGroup = async (name: string, parentId: string | null, type: GroupType): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    /** @deprecated Group feature disabled in S5 */
    public updateGroup = async (id: string, updates: Partial<Group>): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    /** @deprecated Group feature disabled in S5 */
    public deleteGroup = async (id: string): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    /** @deprecated Group feature disabled in S5 */
    public duplicateGroup = async (groupId: string): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    /** @deprecated Group feature disabled in S5 */
    public moveItem = async (itemId: string, targetParentId: string | null): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    /** @deprecated Group feature disabled in S5 */
    public reorderItems = async (reorderedSiblings: (Groupable & {isGroup?: boolean})[], itemType: 'group' | 'viewInstance' | 'layout'): Promise<never> => {
        throw new Error(GROUP_DEPRECATED_ERROR);
    }

    // --- ViewInstance相关方法 - S5 已禁用，请使用 useCases.layout ---
    /** @deprecated Use useCases.layout.addView instead */
    public addViewInstance = async (title: string, parentId: string | null = null): Promise<never> => {
        throw new Error(VIEW_INSTANCE_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.updateView instead */
    public updateViewInstance = async (id: string, updates: Partial<ViewInstance>): Promise<never> => {
        throw new Error(VIEW_INSTANCE_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.deleteView instead */
    public deleteViewInstance = async (id: string): Promise<never> => {
        throw new Error(VIEW_INSTANCE_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.moveView instead */
    public moveViewInstance = async (id: string, direction: 'up' | 'down'): Promise<never> => {
        throw new Error(VIEW_INSTANCE_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.duplicateView instead */
    public duplicateViewInstance = async (id: string): Promise<never> => {
        throw new Error(VIEW_INSTANCE_DEPRECATED_ERROR);
    }

    // --- Layout相关方法 - S5 已禁用，请使用 useCases.layout ---
    /** @deprecated Use useCases.layout.addLayout instead */
    public addLayout = async (name: string, parentId: string | null = null): Promise<never> => {
        throw new Error(LAYOUT_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.updateLayout instead */
    public updateLayout = async (id: string, updates: Partial<Layout>): Promise<never> => {
        throw new Error(LAYOUT_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.deleteLayout instead */
    public deleteLayout = async (id: string): Promise<never> => {
        throw new Error(LAYOUT_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.moveLayout instead */
    public moveLayout = async (id: string, direction: 'up' | 'down'): Promise<never> => {
        throw new Error(LAYOUT_DEPRECATED_ERROR);
    }

    /** @deprecated Use useCases.layout.duplicateLayout instead */
    public duplicateLayout = async (id: string): Promise<never> => {
        throw new Error(LAYOUT_DEPRECATED_ERROR);
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
// DEBUG 开关：仅在开发调试时手动开启，生产构建保持 false
const DEBUG_STORE_SUBSCRIPTIONS = false;

/**
 * useStore Hook
 * 从 Context 获取 AppStore 并订阅状态变化
 * @param selector 状态选择器函数
 * @returns 选择的状态切片
 */
export function useStore<T>(selector: (state: AppState) => T): T {
    // 通过 Context 获取 store 实例
    const store = useAppStore();
    
    const memoizedSelector = useCallback(selector, []);
    
    const [state, setState] = useState(() => memoizedSelector(store.getState()));

    useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            const newStateSlice = memoizedSelector(store.getState());
            
            setState(currentStateSlice => {
                if (Object.is(currentStateSlice, newStateSlice)) {
                    return currentStateSlice;
                }
                // 调试日志：默认关闭，仅在开发时手动开启
                if (DEBUG_STORE_SUBSCRIPTIONS) {
                    console.log("[DEBUG] useStore re-render triggered", {
                        selectorHint: memoizedSelector.toString().slice(0, 100)
                    });
                }
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
