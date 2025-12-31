// src/app/store/useAppStore.ts
/**
 * useAppStore - Zustand 应用状态管理
 * Role: Store (状态管理)
 * 
 * Do:
 * - 使用 zustand 管理应用状态
 * - 提供清晰的单向数据流：UI -> action -> state
 * - 所有 IO 委托给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 持有 plugin 实例
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import type { ThinkSettings, ViewInstance, Layout, InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride, Group, GroupType, Groupable } from '@/core/types/schema';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import type { TimerStore, TimerState } from '@/features/timer/TimerStore';

// ============== 类型定义 ==============

export interface ZustandAppState {
    // 核心状态
    settings: ThinkSettings;
    isTimerWidgetVisible: boolean;
    
    // 加载状态
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface ZustandAppActions {
    // 初始化
    initialize: (settings: ThinkSettings) => void;
    
    // 设置更新（通过 SettingsRepository）
    updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<void>;
    
    // 临时状态
    toggleTimerWidgetVisibility: () => void;
    setTimerWidgetVisible: (visible: boolean) => void;
    
    // 错误处理
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
}

export type ZustandAppStore = ZustandAppState & ZustandAppActions;

// ============== Store 工厂 ==============

/**
 * 创建 Zustand Store
 * 使用工厂模式以便注入 SettingsRepository
 */
export function createAppStore(settingsRepository: SettingsRepository) {
    return create<ZustandAppStore>()(
        subscribeWithSelector((set, get) => ({
            // ============== 初始状态 ==============
            settings: {} as ThinkSettings,
            isTimerWidgetVisible: false,
            isInitialized: false,
            isLoading: false,
            error: null,

            // ============== Actions ==============

            initialize: (settings: ThinkSettings) => {
                set({
                    settings,
                    isTimerWidgetVisible: settings.floatingTimerEnabled,
                    isInitialized: true,
                });
            },

            updateSettings: async (mutator: (draft: ThinkSettings) => void) => {
                const state = get();
                if (!state.isInitialized) {
                    console.error('useAppStore: 未初始化，无法更新设置');
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    // 通过 SettingsRepository 更新（使用 immer）
                    const newSettings = await settingsRepository.update(mutator);
                    set({ settings: newSettings, isLoading: false });
                } catch (error: any) {
                    console.error('useAppStore: 更新设置失败', error);
                    set({ 
                        error: error.message || '更新设置失败',
                        isLoading: false 
                    });
                }
            },

            toggleTimerWidgetVisibility: () => {
                set(state => ({
                    isTimerWidgetVisible: !state.isTimerWidgetVisible
                }));
            },

            setTimerWidgetVisible: (visible: boolean) => {
                set({ isTimerWidgetVisible: visible });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },
        }))
    );
}

// ============== Store 实例 ==============

// Store 实例会在 ServiceManager 中创建并注入
let storeInstance: ReturnType<typeof createAppStore> | null = null;

/**
 * 设置 Store 实例（由 ServiceManager 调用）
 */
export function setAppStoreInstance(store: ReturnType<typeof createAppStore>) {
    storeInstance = store;
}

/**
 * 获取 Store 实例
 */
export function getAppStoreInstance() {
    if (!storeInstance) {
        throw new Error('useAppStore: Store 未初始化，请确保 ServiceManager 已启动');
    }
    return storeInstance;
}

/**
 * 直接使用 zustand store 的 hook
 * 用于替代旧的 useStore
 */
export function useZustandAppStore<T>(selector: (state: ZustandAppStore) => T): T {
    const store = getAppStoreInstance();
    return store(selector);
}
