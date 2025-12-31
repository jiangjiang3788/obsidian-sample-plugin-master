/**
 * AppStoreContext
 * Role: UI 层的 Store 和 Service 访问层
 * 职责：
 * 1. 提供 AppStore 的 React/Preact Context
 * 2. 提供 DataStore 和 InputService 的 Context
 * 3. 通过 useAppStore()、useDataStore()、useInputService() Hook 提供类型安全的访问
 * 4. 替代 storeRegistry 中的全局导出
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { AppStore } from './AppStore';
import type { DataStore } from '@/core/services/DataStore';
import type { InputService } from '@/core/services/InputService';

// ============== AppStore Context ==============

/**
 * AppStore Context
 * 用于在 UI 层传递 AppStore 实例
 */
export const AppStoreContext = createContext<AppStore | null>(null);

/**
 * AppStoreProvider Props
 */
interface AppStoreProviderProps {
    store: AppStore;
    children: ComponentChildren;
}

/**
 * AppStoreProvider
 * 包装 UI 树并提供 AppStore 实例
 */
export function AppStoreProvider({ store, children }: AppStoreProviderProps) {
    return (
        <AppStoreContext.Provider value={store}>
            {children}
        </AppStoreContext.Provider>
    );
}

/**
 * useAppStore Hook
 * 从 Context 获取 AppStore 实例
 * @throws 如果在 AppStoreProvider 外部使用则抛出异常
 */
export function useAppStore(): AppStore {
    const store = useContext(AppStoreContext);
    if (!store) {
        throw new Error(
            'useAppStore 必须在 AppStoreProvider 内部使用。' +
            '请确保组件树被 AppStoreProvider 包裹。'
        );
    }
    return store;
}

// ============== DataStore Context ==============

/**
 * DataStore Context
 * 用于在 UI 层传递 DataStore 实例
 */
export const DataStoreContext = createContext<DataStore | null>(null);

/**
 * useDataStore Hook
 * 从 Context 获取 DataStore 实例
 * @throws 如果在 ServicesProvider 外部使用则抛出异常
 */
export function useDataStore(): DataStore {
    const store = useContext(DataStoreContext);
    if (!store) {
        throw new Error(
            'useDataStore 必须在 ServicesProvider 内部使用。' +
            '请确保组件树被 ServicesProvider 包裹。'
        );
    }
    return store;
}

// ============== InputService Context ==============

/**
 * InputService Context
 * 用于在 UI 层传递 InputService 实例
 */
export const InputServiceContext = createContext<InputService | null>(null);

/**
 * useInputService Hook
 * 从 Context 获取 InputService 实例
 * @throws 如果在 ServicesProvider 外部使用则抛出异常
 */
export function useInputService(): InputService {
    const store = useContext(InputServiceContext);
    if (!store) {
        throw new Error(
            'useInputService 必须在 ServicesProvider 内部使用。' +
            '请确保组件树被 ServicesProvider 包裹。'
        );
    }
    return store;
}

// ============== 统一 Services Provider ==============

/**
 * Services 集合接口
 */
export interface Services {
    appStore: AppStore;
    dataStore: DataStore;
    inputService: InputService;
}

/**
 * ServicesProvider Props
 */
interface ServicesProviderProps {
    services: Services;
    children: ComponentChildren;
}

/**
 * ServicesProvider
 * 统一提供所有 UI 层需要的服务
 * 嵌套提供 AppStore、DataStore、InputService 的 Context
 */
export function ServicesProvider({ services, children }: ServicesProviderProps) {
    return (
        <AppStoreContext.Provider value={services.appStore}>
            <DataStoreContext.Provider value={services.dataStore}>
                <InputServiceContext.Provider value={services.inputService}>
                    {children}
                </InputServiceContext.Provider>
            </DataStoreContext.Provider>
        </AppStoreContext.Provider>
    );
}
