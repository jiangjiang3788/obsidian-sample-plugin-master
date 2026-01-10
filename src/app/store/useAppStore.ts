// src/app/store/useAppStore.ts
/**
 * useAppStore - Zustand 应用状态管理
 * Role: Store (状态管理)
 * 
 * 【S2 规范】Settings 真同源
 * - SettingsRepository 是 settings 的唯一写入口
 * - 本 Store 只调用 settingsRepository.update()，不直接写 settings
 * - settings 由 ServiceManager 订阅 SettingsRepository 后统一同步到 Zustand
 * - 本 Store 只管理辅助状态：isLoading、error、isInitialized 等
 * 
 * Do:
 * - 使用 zustand 管理应用状态
 * - 提供清晰的单向数据流：UI -> action -> state
 * - 所有 IO 委托给 SettingsRepository
 * - 整合各业务领域的 slices
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 直接写 settings（禁止 set({ settings: ... })，除 initialize 外）
 * - 持有 plugin 实例
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ThinkSettings } from '@/core/types/schema';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import { createSliceMeta } from '@/shared/types/ActionMeta';
import { createThemeSlice, type ThemeSlice } from './slices/theme.slice';
import { createLayoutSlice, type LayoutSlice } from './slices/layout.slice';
import { createSettingsSlice, type SettingsSlice } from './slices/settings.slice';
import { createBlocksSlice, type BlocksSlice } from './slices/blocks.slice';
import { createGroupSlice, type GroupSlice } from './slices/group.slice';
import { createViewInstanceSlice, type ViewInstanceSlice } from './slices/viewInstance.slice';
import { createTimerSlice, type TimerSlice } from './slices/timer.slice';
import { createUiSlice, type UiSlice } from './slices/ui.slice';

// ============== 类型定义 ==============

export interface ZustandAppCoreState {
    // 核心状态
    settings: ThinkSettings;
    
    // 加载状态
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface ZustandAppCoreActions {
    // 初始化
    initialize: (settings: ThinkSettings) => void;
    
    // P0: Block 重排序（持久化）
    reorderBlocks: (activeId: string, overId: string) => Promise<void>;
    
    // 错误处理
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
}

// 组合所有 slices 的类型
export type ZustandAppStore = ZustandAppCoreState & ZustandAppCoreActions & ThemeSlice & LayoutSlice & SettingsSlice & BlocksSlice & GroupSlice & ViewInstanceSlice & TimerSlice & UiSlice;

// ============== Store 工厂 ==============

/**
 * 创建 Zustand Store
 * 使用工厂模式以便注入 SettingsRepository
 * 整合所有业务领域的 slices
 */
export function createAppStore(settingsRepository: SettingsRepository) {
    return create<ZustandAppStore>()(
        subscribeWithSelector((set, get, store) => ({
            // ============== Core 初始状态 ==============
            settings: {} as ThinkSettings,
            isInitialized: false,
            isLoading: false,
            error: null,

            // ============== Core Actions ==============

            initialize: (settings: ThinkSettings) => {
                set((state) => ({
                    settings,
                    ui: { ...state.ui, isTimerWidgetVisible: settings.floatingTimerEnabled },
                    isInitialized: true,
                }));
            },

            // P0: Block 重排序（持久化）
            reorderBlocks: async (activeId: string, overId: string) => {
                const state = get();
                if (!state.isInitialized) {
                    console.error('useAppStore: 未初始化，无法重排序 Block');
                    return;
                }

                const blocks = state.settings.inputSettings?.blocks || [];
                const oldIndex = blocks.findIndex(b => b.id === activeId);
                const newIndex = blocks.findIndex(b => b.id === overId);

                if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                    // S1: 传入 ActionMeta 用于 dev 日志
                    await settingsRepository.update(draft => {
                        const blocks = draft.inputSettings?.blocks || [];
                        const [removed] = blocks.splice(oldIndex, 1);
                        blocks.splice(newIndex, 0, removed);
                    }, createSliceMeta('core.reorderBlocks'));
                    set({ isLoading: false });
                } catch (error: any) {
                    console.error('useAppStore: Block 重排序失败', error);
                    set({ 
                        error: error.message || 'Block 重排序失败',
                        isLoading: false 
                    });
                }
            },

            setError: (error: string | null) => {
                set({ error });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            // ============== Theme Slice ==============
            ...createThemeSlice(settingsRepository)(set, get, store),

            // ============== Layout Slice ==============
            ...createLayoutSlice(settingsRepository)(set, get, store),

            // ============== Settings Slice ==============
            ...createSettingsSlice(settingsRepository)(set, get, store),

            // ============== Blocks Slice ==============
            ...createBlocksSlice(settingsRepository)(set, get, store),

            // ============== Group Slice ==============
            ...createGroupSlice(settingsRepository)(set, get, store),

            // ============== ViewInstance Slice ==============
            ...createViewInstanceSlice(settingsRepository)(set, get, store),

            // ============== Timer Slice ==============
            ...createTimerSlice(set, get, store),

            // ============== UI Slice ==============
            ...createUiSlice(set, get, store),
        }))
    );
}

// ============== Store 实例 ==============

/**
 * Store 实例（由 ServiceManager 创建并注入）
 * 
 * ⚠️ P0-2 架构约束：
 * - ⛔ 禁止导出 getAppStoreInstance / setAppStoreInstance 全局单例函数
 * - ✅ 外部应通过 DI（USECASES_TOKEN）或 React Context（useUseCases）获取 useCases
 * - ✅ React 组件可通过 useZustandAppStore 或 AppStoreContext 读取状态
 */
let storeInstance: ReturnType<typeof createAppStore> | null = null;

/**
 * 设置 Store 实例（仅由 ServiceManager 内部调用）
 * @internal 不对外导出
 */
export function setAppStoreInstance(store: ReturnType<typeof createAppStore>) {
    storeInstance = store;
}

/**
 * 获取 Store 实例（仅内部使用）
 * @internal 不建议外部直接调用，请使用 DI 或 React Context
 */
function getStoreInstance() {
    if (!storeInstance) {
        throw new Error('useAppStore: Store 未初始化，请确保 ServiceManager 已启动');
    }
    return storeInstance;
}

/**
 * 直接使用 zustand store 的 hook
 * 用于替代旧的 useStore
 * 
 * ⚠️ 注意：此 hook 仅用于读取状态，写操作应通过 useCases
 */
export function useZustandAppStore<T>(selector: (state: ZustandAppStore) => T): T {
    const store = getStoreInstance();
    return store(selector);
}

/**
 * 非 React 上下文中读取 store 状态
 * 
 * ⚠️ P0-2 架构约束：
 * - 仅用于读取状态，写操作应通过 useCases（从 DI 获取）
 * - 替代已废弃的 getAppStoreInstance()
 * 
 * @param selector 状态选择器
 * @returns 选择的状态值
 */
export function getZustandState<T>(selector: (state: ZustandAppStore) => T): T {
    const store = getStoreInstance();
    return selector(store.getState());
}

/**
 * 订阅 Zustand store 状态变化（非 React 上下文）
 * 
 * ⚠️ P0-2 架构约束：
 * - 用于非 React 场景（如 RendererService）订阅特定状态变化
 * - 替代已废弃的 getAppStoreInstance().subscribe()
 * 
 * @param selector 状态选择器
 * @param listener 状态变化监听器
 * @param options 订阅选项
 * @returns 取消订阅函数
 */
export function subscribeZustandStore<T>(
    selector: (state: ZustandAppStore) => T,
    listener: (current: T, previous: T) => void,
    options?: { equalityFn?: (a: T, b: T) => boolean }
): () => void {
    const store = getStoreInstance();
    return store.subscribe(selector, listener, options);
}
