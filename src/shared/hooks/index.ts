/**
 * 统一的 Hooks 库
 * 提供可复用的 React/Preact Hooks
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks';
import { container } from 'tsyringe';
import { AppStore } from '@state/AppStore';
import type { AppState } from '@state/AppStore';
import { errorHandler } from '@shared/utils/errorHandler';

// ============================================
// 1. useStore - 状态订阅 Hook（优化版）
// ============================================

/**
 * 订阅 AppStore 的状态变化
 * 使用选择器模式，只在选择的状态片段变化时触发重渲染
 * 
 * @param selector - 状态选择器函数
 * @returns 选择的状态片段
 * 
 * @example
 * const settings = useStore(state => state.settings);
 * const timers = useStore(state => state.timers);
 */
export function useStore<T>(selector: (state: AppState) => T): T {
    const appStore = useMemo(() => container.resolve(AppStore), []);
    
    // 初始化状态
    const [state, setState] = useState<T>(() => selector(appStore.getState()));
    
    // 订阅状态变化
    useEffect(() => {
        const unsubscribe = appStore.subscribe(() => {
            const newStateSlice = selector(appStore.getState());
            setState(newStateSlice);
        });
        
        return unsubscribe;
    }, [appStore, selector]);
    
    return state;
}

/**
 * 获取完整的 AppStore 实例
 * 
 * @returns AppStore 实例
 * 
 * @example
 * const appStore = useAppStore();
 * appStore.updateSettings({ ... });
 */
export function useAppStore(): AppStore {
    return useMemo(() => container.resolve(AppStore), []);
}

// ============================================
// 2. useService - 服务注入 Hook
// ============================================

/**
 * 从依赖注入容器中获取服务实例
 * 
 * @param serviceClass - 服务类
 * @returns 服务实例
 * 
 * @example
 * const dataStore = useService(DataStore);
 * const timerService = useService(TimerService);
 */
export function useService<T>(serviceClass: new (...args: any[]) => T): T {
    return useMemo(() => container.resolve(serviceClass), [serviceClass]);
}

// ============================================
// 3. useCommand - 命令执行 Hook
// ============================================

/**
 * 创建命令执行回调
 * 
 * @param commandId - Obsidian 命令 ID
 * @returns 执行命令的回调函数
 * 
 * @example
 * const openSettings = useCommand('think-open-settings');
 * <button onClick={openSettings}>Settings</button>
 */
export function useCommand(commandId: string): () => void {
    return useCallback(() => {
        // @ts-ignore - app.commands 是 Obsidian 的内部 API
        app.commands.executeCommandById(commandId);
    }, [commandId]);
}

// ============================================
// 4. useAsync - 异步操作 Hook
// ============================================

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

interface UseAsyncOptions {
    immediate?: boolean;        // 是否立即执行
    onSuccess?: (data: any) => void;  // 成功回调
    onError?: (error: Error) => void; // 错误回调
    showErrorNotice?: boolean;  // 是否显示错误通知
}

/**
 * 处理异步操作的 Hook
 * 
 * @param asyncFunction - 异步函数
 * @param deps - 依赖数组
 * @param options - 配置选项
 * @returns 异步状态和执行函数
 * 
 * @example
 * const { data, loading, error, execute } = useAsync(
 *     async () => await fetchData(),
 *     [],
 *     { immediate: true }
 * );
 */
export function useAsync<T>(
    asyncFunction: () => Promise<T>,
    deps: any[] = [],
    options: UseAsyncOptions = {}
): AsyncState<T> & { execute: () => Promise<void> } {
    const {
        immediate = false,
        onSuccess,
        onError,
        showErrorNotice = true
    } = options;

    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        loading: false,
        error: null
    });

    const execute = useCallback(async () => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await asyncFunction();
            setState({ data: result, loading: false, error: null });
            onSuccess?.(result);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setState({ data: null, loading: false, error: err });
            
            if (showErrorNotice) {
                errorHandler.handle(err, 'useAsync');
            }
            
            onError?.(err);
        }
    }, [...deps, asyncFunction, onSuccess, onError]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [immediate, execute]);

    return { ...state, execute };
}

// ============================================
// 5. useDebounce - 防抖 Hook
// ============================================

/**
 * 防抖值
 * 
 * @param value - 要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *     // 搜索操作
 *     search(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * 防抖回调函数
 * 
 * @param callback - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @param deps - 依赖数组
 * @returns 防抖后的函数
 * 
 * @example
 * const handleSearch = useDebouncedCallback(
 *     (query: string) => {
 *         performSearch(query);
 *     },
 *     500
 * );
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300,
    deps: any[] = []
): T {
    const timeoutRef = useRef<number | null>(null);

    return useCallback((...args: any[]) => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay, ...deps]) as T;
}

// ============================================
// 6. useThrottle - 节流 Hook
// ============================================

/**
 * 节流值
 * 
 * @param value - 要节流的值
 * @param interval - 间隔时间（毫秒）
 * @returns 节流后的值
 * 
 * @example
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledPosition = useThrottle(scrollPosition, 100);
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const lastExecuted = useRef<number>(Date.now());

    useEffect(() => {
        const now = Date.now();
        const timeSinceLastExecution = now - lastExecuted.current;

        if (timeSinceLastExecution >= interval) {
            lastExecuted.current = now;
            setThrottledValue(value);
        } else {
            const timer = setTimeout(() => {
                lastExecuted.current = Date.now();
                setThrottledValue(value);
            }, interval - timeSinceLastExecution);

            return () => clearTimeout(timer);
        }
    }, [value, interval]);

    return throttledValue;
}

// ============================================
// 7. usePrevious - 获取前一个值
// ============================================

/**
 * 获取值的前一个状态
 * 
 * @param value - 当前值
 * @returns 前一个值
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * console.log(`Count changed from ${prevCount} to ${count}`);
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

// ============================================
// 8. useToggle - 布尔值切换 Hook
// ============================================

/**
 * 布尔值切换 Hook
 * 
 * @param initialValue - 初始值
 * @returns [当前值, 切换函数, 设置函数]
 * 
 * @example
 * const [isOpen, toggleOpen, setOpen] = useToggle(false);
 * <button onClick={toggleOpen}>Toggle</button>
 */
export function useToggle(
    initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
    const [value, setValue] = useState(initialValue);

    const toggle = useCallback(() => {
        setValue(v => !v);
    }, []);

    return [value, toggle, setValue];
}

// ============================================
// 9. useLocalStorage - 本地存储 Hook
// ============================================

/**
 * 使用 localStorage 持久化状态
 * 
 * @param key - 存储键
 * @param initialValue - 初始值
 * @returns [值, 设置函数]
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // 从 localStorage 读取初始值
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            errorHandler.handle(error, 'useLocalStorage.read', {
                showNotice: false
            });
            return initialValue;
        }
    });

    // 更新 localStorage
    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            errorHandler.handle(error, 'useLocalStorage.write', {
                showNotice: false
            });
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

// ============================================
// 10. useInterval - 定时器 Hook
// ============================================

/**
 * 声明式定时器
 * 
 * @param callback - 回调函数
 * @param delay - 延迟时间（毫秒），null 表示停止
 * 
 * @example
 * useInterval(() => {
 *     console.log('Every second');
 * }, 1000);
 */
export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const tick = () => savedCallback.current();
        const id = setInterval(tick, delay);

        return () => clearInterval(id);
    }, [delay]);
}

// ============================================
// 11. useTimeout - 延时器 Hook
// ============================================

/**
 * 声明式延时器
 * 
 * @param callback - 回调函数
 * @param delay - 延迟时间（毫秒），null 表示取消
 * 
 * @example
 * useTimeout(() => {
 *     console.log('After 3 seconds');
 * }, 3000);
 */
export function useTimeout(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const id = setTimeout(() => savedCallback.current(), delay);

        return () => clearTimeout(id);
    }, [delay]);
}

// ============================================
// 12. useClickOutside - 点击外部检测 Hook
// ============================================

/**
 * 检测元素外部点击
 * 
 * @param ref - 元素引用
 * @param handler - 点击外部时的回调
 * 
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * useClickOutside(ref, () => {
 *     setIsOpen(false);
 * });
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
    ref: { current: T | null },
    handler: (event: MouseEvent | TouchEvent) => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            if (!el || el.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// ============================================
// 13. useMediaQuery - 媒体查询 Hook
// ============================================

/**
 * 响应媒体查询
 * 
 * @param query - 媒体查询字符串
 * @returns 是否匹配
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener('change', handler);

        return () => {
            mediaQuery.removeEventListener('change', handler);
        };
    }, [query]);

    return matches;
}

// ============================================
// 14. useWindowSize - 窗口大小 Hook
// ============================================

interface WindowSize {
    width: number;
    height: number;
}

/**
 * 获取窗口大小
 * 
 * @returns { width, height }
 * 
 * @example
 * const { width, height } = useWindowSize();
 */
export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return windowSize;
}

// ============================================
// 15. useMounted - 挂载状态 Hook
// ============================================

/**
 * 检测组件是否已挂载
 * 
 * @returns 是否已挂载
 * 
 * @example
 * const isMounted = useMounted();
 * 
 * useEffect(() => {
 *     fetchData().then(data => {
 *         if (isMounted()) {
 *             setState(data);
 *         }
 *     });
 * }, []);
 */
export function useMounted(): () => boolean {
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return useCallback(() => mountedRef.current, []);
}
