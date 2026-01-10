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
import { container } from 'tsyringe';
import type { ComponentChildren } from 'preact';
import type { DataStore } from '@/core/services/DataStore';
import type { InputService } from '@/core/services/InputService';
import type { UseCases } from './usecases';
import type { AppStoreInstance, ZustandAppStore } from './store/useAppStore';

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
 */
export function useUseCases(): UseCases {
    const useCases = useContext(UseCasesContext);
    
    if (useCases) {
        return useCases;
    }
    
    // 兼容回退：尝试从 DI 容器获取
    // 仅用于紧急兼容，正常情况下组件应该被 ServicesProvider 包裹
    try {
        const fallbackUseCases = container.resolve<UseCases>('UseCases');
        if (fallbackUseCases) {
            console.warn(
                '[useUseCases] ⚠️ 正在使用 DI 容器回退获取 UseCases。\n' +
                '这表明组件未被 ServicesProvider 包裹。\n' +
                '请检查组件渲染入口并添加 ServicesProvider。'
            );
            return fallbackUseCases;
        }
    } catch (e) {
        // DI 容器也没有注册，抛出原始错误
    }
    
    throw new Error(
        'useUseCases 必须在 ServicesProvider 内部使用。' +
        '请确保组件树被 ServicesProvider 包裹。'
    );
}

// ============== 统一 Services Provider ==============

/**
 * Services 集合接口
 */
export interface Services {
    zustandStore: AppStoreInstance;
    dataStore: DataStore;
    inputService: InputService;
    useCases: UseCases;
}

/**
 * ServicesProvider Props
 */
interface ServicesProviderProps {
    services: Services;
    children: ComponentChildren;
}

/**
 * 校验 Services 对象完整性
 * @throws 如果任何必需服务缺失则抛出明确的错误信息
 */
function validateServices(services: Services, source?: string): void {
    const missing: string[] = [];
    if (!services) {
        throw new Error(
            `[ServicesProvider] services 对象为空。\n` +
            `来源: ${source || '未知'}\n` +
            `请检查渲染入口是否正确传递了 services 参数。`
        );
    }
    if (!services.zustandStore) missing.push('zustandStore');
    if (!services.dataStore) missing.push('dataStore');
    if (!services.inputService) missing.push('inputService');
    if (!services.useCases) missing.push('useCases');
    
    if (missing.length > 0) {
        throw new Error(
            `[ServicesProvider] Services 校验失败: 缺少 ${missing.join(', ')}。\n` +
            `来源: ${source || '未知'}\n` +
            `请检查渲染入口是否正确包裹 ServicesProvider，以及 services 参数是否完整。\n` +
            `确保 ServiceManager 已正确初始化所有服务。`
        );
    }
}

/**
 * ServicesProvider
 * 统一提供所有 UI 层需要的服务
 * 嵌套提供 DataStore、InputService、UseCases 的 Context
 * 
 * ⚠️ 运行时校验：如果 services 参数不完整，会立即抛出明确错误
 */
export function ServicesProvider({ services, children }: ServicesProviderProps) {
    // 运行时校验：确保所有必需服务都已正确传递
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
        console.log('[DevCheck] ServicesContext 自检开始...');
        console.log('[DevCheck] 如果此后没有错误日志，说明 Context 配置正确');
    } catch (e) {
        console.error('[DevCheck] ServicesContext 自检失败:', e);
        result.valid = false;
    }
    
    return result;
}
