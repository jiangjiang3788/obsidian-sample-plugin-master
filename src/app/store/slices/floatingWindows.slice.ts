import { StateCreator } from 'zustand';

/**
 * FloatingWindowsSlice
 *
 * 目的：
 * - 统一管理悬浮窗的「共享状态」（最关键的是 zIndex / 聚焦顺序）
 * - 提供明确的生命周期：register / unregister / focus
 *
 * 说明：
 * - 这是一段纯 UI 状态，不做 settings 持久化
 * - 位置持久化由 FloatingPanel 自己写 localStorage
 */

export interface FloatingWindowRecord {
    id: string;
    zIndex: number;
    lastFocusedAt: number;
}

export interface FloatingWindowsSlice {
    floatingWindows: {
        /** 当前活跃（最近被 focus）的 windowId */
        activeId: string | null;
        /** 全局 zIndex 递增计数器 */
        nextZIndex: number;
        /** 记录每个浮窗的 zIndex */
        windows: Record<string, FloatingWindowRecord>;

        /** 注册窗口（挂载时调用） */
        register: (id: string) => void;
        /** 注销窗口（卸载时调用） */
        unregister: (id: string) => void;
        /** 聚焦窗口（鼠标点到/拖拽开始时调用） */
        focus: (id: string) => void;
    };
}

const BASE_Z_INDEX = 10_000;

export const createFloatingWindowsSlice: StateCreator<FloatingWindowsSlice, [], [], FloatingWindowsSlice> = (set) => ({
    floatingWindows: {
        activeId: null,
        nextZIndex: BASE_Z_INDEX,
        windows: {},

        register: (id: string) =>
            set((state) => {
                const existing = state.floatingWindows.windows[id];
                if (existing) {
                    return {
                        floatingWindows: {
                            ...state.floatingWindows,
                            activeId: id,
                        },
                    };
                }

                const next = state.floatingWindows.nextZIndex + 1;
                return {
                    floatingWindows: {
                        ...state.floatingWindows,
                        activeId: id,
                        nextZIndex: next,
                        windows: {
                            ...state.floatingWindows.windows,
                            [id]: {
                                id,
                                zIndex: next,
                                lastFocusedAt: Date.now(),
                            },
                        },
                    },
                };
            }),

        unregister: (id: string) =>
            set((state) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [id]: _removed, ...rest } = state.floatingWindows.windows;
                return {
                    floatingWindows: {
                        ...state.floatingWindows,
                        activeId: state.floatingWindows.activeId === id ? null : state.floatingWindows.activeId,
                        windows: rest,
                    },
                };
            }),

        focus: (id: string) =>
            set((state) => {
                const next = state.floatingWindows.nextZIndex + 1;
                return {
                    floatingWindows: {
                        ...state.floatingWindows,
                        activeId: id,
                        nextZIndex: next,
                        windows: {
                            ...state.floatingWindows.windows,
                            [id]: {
                                id,
                                zIndex: next,
                                lastFocusedAt: Date.now(),
                            },
                        },
                    },
                };
            }),
    },
});
