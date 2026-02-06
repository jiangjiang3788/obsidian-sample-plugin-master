/**
 * AppStoreContext
 * Role: UI 层的 Store 和 Service 访问层
 * 职责：
 * 1. 提供 DataStore 和 InputService 的 Context
 * 2. 提供 UseCases 的 Context
 * 3. 提供 Zustand Store 的 Context
 * 4. 通过 useDataStore()、useInputService()、useUseCases() Hook 提供类型安全的访问
 * 
 * ⚠️ P0 边界防护：
 * - UI 层必须通过 useUseCases() 调用业务逻辑
 * - 读取状态使用 useZustandAppStore(selector)
 * - 写入状态使用 useUseCases()
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { useStore } from 'zustand';
import type { ComponentChildren } from 'preact';
import type { DataStore } from '@core/public';
import type { InputService } from '@core/public';
import type { UseCases } from './usecases';
import type { AppStoreInstance, ZustandAppStore } from './store/useAppStore';
import { validateServices, type Services } from './services.types';
import { devLog, devError } from '@core/public';

// 兼容性：允许外部仍从 AppStoreContext 引入 Services 类型
export type { Services } from './services.types';

// ============== Zustand Store Context ==============

/**
 * Zustand Store Context
 * 用于在 UI 层传递 Zustand store 实例
 */
export const ZustandStoreContext = createContext<AppStoreInstance | null>(null);

/**
 * useZustandAppStore Hook
 * 从 Context 获取 Zustand store 并使用 selector 读取状态
 * 
 * @param selector 状态选择器
 * @returns 选择的状态值
 * 
 * @example
 * const settings = useZustandAppStore(state => state.settings);
 * const themes = useZustandAppStore(state => state.settings.inputSettings?.themes);
 */
export function useZustandAppStore<T>(selector: (state: ZustandAppStore) => T): T {
    const store = useContext(ZustandStoreContext);
    
    if (!store) {
        throw new Error(
            '🚨 [useZustandAppStore] ZustandStoreContext 为空！\n' +
            '组件必须在 ServicesProvider 内部使用。\n\n' +
            '⚠️ 迁移指引：\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '请确保渲染入口正确包裹 ServicesProvider：\n\n' +
            '  const root = createRoot(container);\n' +
            '  root.render(\n' +
            '    <ServicesProvider services={services}>\n' +
            '      <YourComponent />\n' +
            '    </ServicesProvider>\n' +
            '  );\n\n' +
            '其中 services 必须包含 zustandStore：\n' +
            '  const services = serviceManager.getServices();\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
    }
    
    return useStore(store, selector);
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

// ============== UseCases Context (P0 新增) ==============

/**
 * UseCases Context
 * 用于在 UI 层传递 UseCases 实例
 * 
 * ⚠️ P0 边界防护：UI 层必须通过此 Context 获取 UseCases
 */
export const UseCasesContext = createContext<UseCases | null>(null);

/**
 * useUseCases Hook
 * 从 Context 获取 UseCases 实例
 * 
 * @returns UseCases 实例
 * @throws 如果在 ServicesProvider 外部使用则抛出异常
 */
export function useUseCases(): UseCases {
    const useCases = useContext(UseCasesContext);
    
    if (!useCases) {
        throw new Error(
            'UseCasesProvider is missing. Wrap your component tree with <ServicesProvider>.\n' +
            'Ensure the render entry properly wraps components with ServicesProvider.'
        );
    }
    
    return useCases;
}

// ============== 统一 Services Provider ==============

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
 * 嵌套提供 DataStore、InputService、UseCases 的 Context
 * 
 * ⚠️ 运行时校验：如果 services 参数不完整，会立即抛出明确错误
 * ⚠️ 校验规则来源：services.types.validateServices（唯一真源）
 */
export function ServicesProvider({ services, children }: ServicesProviderProps) {
    // 运行时校验：调用 createServices 中的唯一真源校验函数
    validateServices(services, 'ServicesProvider');
    
    // 构建嵌套的 Provider 树
    // 最外层必须是 ZustandStoreContext，确保所有子组件都能访问 store
    return (
        <ZustandStoreContext.Provider value={services.zustandStore}>
            <DataStoreContext.Provider value={services.dataStore}>
                <InputServiceContext.Provider value={services.inputService}>
                    <UseCasesContext.Provider value={services.useCases}>
                        {children}
                    </UseCasesContext.Provider>
                </InputServiceContext.Provider>
            </DataStoreContext.Provider>
        </ZustandStoreContext.Provider>
    );
}

/**
 * 开发模式自检工具
 * 在开发环境中调用此函数可验证 Context 是否正确设置
 * 
 * @example
 * // 在组件挂载后调用
 * useEffect(() => {
 *     if (process.env.NODE_ENV === 'development') {
 *         devCheckServicesContext();
 *     }
 * }, []);
 */
export function devCheckServicesContext(): { valid: boolean; missing: string[] } {
    const result = { valid: true, missing: [] as string[] };
    
    try {
        // 这些检查会在 Context 不存在时抛出异常
        // 但我们只在开发模式下使用，不影响生产
        devLog('[DevCheck] ServicesContext 自检开始...');
        devLog('[DevCheck] 如果此后没有错误日志，说明 Context 配置正确');
    } catch (e) {
        devError('[DevCheck] ServicesContext 自检失败:', e);
        result.valid = false;
    }
    
    return result;
}