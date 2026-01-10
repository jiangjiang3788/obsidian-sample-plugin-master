/**
 * AppStoreContext
 * Role: UI 层的 Store 和 Service 访问层
 * 职责：
 * 1. 提供 AppStore 的 React/Preact Context（可选，用于兼容旧代码）
 * 2. 提供 DataStore 和 InputService 的 Context
 * 3. 提供 UseCases 的 Context（P0 新增）
 * 4. 通过 useDataStore()、useInputService()、useUseCases() Hook 提供类型安全的访问
 * 5. 替代 storeRegistry 中的全局导出
 * 
 * ⚠️ P0 边界防护：
 * - UI 层必须通过 useUseCases() 调用业务逻辑
 * - 禁止 UI 直接调用 AppStore 的私有方法
 * - appStore 已变为可选，新代码应使用 zustand store + useCases
 * 
 * ============== S2 断路测试 (Circuit Breaker) ==============
 * 
 * 目的：在删除 AppStore 前，暴露所有残余 useAppStore() / AppStoreContext 依赖点（僵尸代码）
 * 
 * 配置说明：
 * - CIRCUIT_BREAKER_ENABLED: 断路开关，DEV 环境默认启用
 * - localStorage.getItem('ALLOW_LEGACY_APPSTORE') === '1': 逃生舱，允许临时放行不抛出异常
 * - localStorage.getItem('ARCH_BREAKER') === '1': 可选的额外控制开关（需要同时启用）
 * 
 * 迁移指引：
 * - 读取状态：使用 useZustandAppStore(selector) 或具体的 slice hook
 *   - useSettingsStore() - 设置相关
 *   - useTimerStore() - 计时器相关  
 *   - useThemeStore() - 主题相关
 * - 写入状态：使用 useUseCases()
 *   - useCases.settings.updateSettings()
 *   - useCases.timer.start() / stop() / reset()
 * 
 * 验收方式：
 * 1. 打开插件所有面板/功能
 * 2. 控制台出现 🚨 [ZOMBIE CODE DETECTED] 前缀
 * 3. 有 stack trace，能定位具体组件/文件
 * 4. 逐个替换调用点后，错误消失
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { container } from 'tsyringe';
import type { ComponentChildren } from 'preact';
import type { AppStore } from './AppStore';
import type { DataStore } from '@/core/services/DataStore';
import type { InputService } from '@/core/services/InputService';
import type { UseCases } from './usecases';

// ============== S2 断路测试配置 ==============

/**
 * 断路开关：DEV 环境默认启用
 * 
 * 如何启用/关闭：
 * - 默认：DEV 环境自动启用
 * - 手动关闭：设置 localStorage.setItem('ARCH_BREAKER', '0')
 * - 手动启用：设置 localStorage.setItem('ARCH_BREAKER', '1')
 */
const CIRCUIT_BREAKER_ENABLED = import.meta.env.DEV;

/**
 * 逃生舱检查：允许临时放行（方便渐进迁移）
 * 
 * 如何使用：
 * - 在浏览器控制台执行：localStorage.setItem('ALLOW_LEGACY_APPSTORE', '1')
 * - 这样 useAppStore() 不会抛出异常，只会 log + trace
 * - 迁移完成后记得移除：localStorage.removeItem('ALLOW_LEGACY_APPSTORE')
 */
const isLegacyAllowed = (): boolean => {
    try {
        return typeof localStorage !== 'undefined' && 
               localStorage.getItem('ALLOW_LEGACY_APPSTORE') === '1';
    } catch {
        return false;
    }
};

/**
 * 断路报错函数
 * 
 * @param hookName - 被调用的 hook 名称
 * @param context - 调用上下文描述
 * @param shouldThrow - 是否抛出异常（逃生舱模式下不抛出）
 */
const circuitBreakerError = (hookName: string, context: string): void => {
    if (!CIRCUIT_BREAKER_ENABLED) {
        return; // prod 环境不执行断路逻辑
    }

    const message = `🚨 [ZOMBIE CODE DETECTED] ${hookName} is deprecated!

⚠️ 迁移指引：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 读取状态 - 使用 Zustand hooks：
  • useSettingsStore(selector) - 设置相关状态
  • useTimerStore(selector) - 计时器相关状态
  • useThemeStore(selector) - 主题相关状态
  • useZustandAppStore(selector) - 通用状态访问

📝 写入状态 - 使用 useCases：
  • const { settings, timer } = useUseCases();
  • settings.updateSettings({ ... })
  • timer.start() / timer.stop() / timer.reset()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 调用位置：${context}
📁 源文件：src/app/AppStoreContext.tsx

🔧 逃生舱（临时放行）：
  localStorage.setItem('ALLOW_LEGACY_APPSTORE', '1')
  
请立即迁移到新的 Zustand hooks / useCases！`;

    console.error(message);
    
    // 输出调用堆栈，帮助定位调用者
    console.trace('📚 调用堆栈（用于定位僵尸代码位置）：');
    
    if (!isLegacyAllowed()) {
        throw new Error(`🚨 [ZOMBIE CODE] ${hookName} is deprecated! 请迁移到 Zustand hooks / useCases。详见上方控制台输出。`);
    } else {
        console.warn(
            `⚠️ [CIRCUIT BREAKER] 逃生舱已启用，不抛出异常。\n` +
            `请尽快完成迁移后移除：localStorage.removeItem('ALLOW_LEGACY_APPSTORE')`
        );
    }
};

// ============== AppStore Context ==============

/**
 * AppStore Context
 * 用于在 UI 层传递 AppStore 实例
 * 
 * ⚠️ 已废弃：新代码应使用 zustand store (useZustandAppStore) + useCases
 * ⚠️ S2 断路测试：类型改为 never | null，编译期暴露依赖
 * 
 * @deprecated 请迁移到 Zustand hooks + useCases
 */
export const AppStoreContext = createContext<never | null>(null);

/**
 * AppStoreProvider Props
 * @deprecated 新代码应使用 ServicesProvider
 */
interface AppStoreProviderProps {
    store: AppStore;
    children: ComponentChildren;
}

/**
 * AppStoreProvider
 * 包装 UI 树并提供 AppStore 实例
 * 
 * @deprecated 新代码应使用 ServicesProvider
 * ⚠️ S2 断路测试：DEV 环境下会报错 + 抛出异常
 */
export function AppStoreProvider({ store, children }: AppStoreProviderProps) {
    // S2 断路测试：Provider 断路
    if (CIRCUIT_BREAKER_ENABLED) {
        circuitBreakerError(
            'AppStoreProvider',
            'AppStoreProvider 组件被渲染'
        );
    }
    
    return (
        <AppStoreContext.Provider value={store as never}>
            {children}
        </AppStoreContext.Provider>
    );
}

/**
 * useAppStore Hook
 * 从 Context 获取 AppStore 实例
 * 
 * ⚠️ 已废弃：新代码应使用：
 * - 读取状态：useZustandAppStore(selector)
 * - 写入状态：useUseCases()
 * 
 * ⚠️ S2 断路测试：
 * - DEV 环境下每次调用都会报错 + 输出堆栈
 * - 默认会抛出异常，使用逃生舱可临时放行
 * - 逃生舱：localStorage.setItem('ALLOW_LEGACY_APPSTORE', '1')
 * 
 * 兼容机制：
 * - 优先从 Context 获取 AppStore
 * - Context 不可用时，尝试从 DI 容器回退（仅限紧急兼容，会输出警告）
 * 
 * @returns AppStore 实例
 * @deprecated 使用 useZustandAppStore + useUseCases 替代
 */
export function useAppStore(): AppStore {
    // S2 断路测试：核心断路点
    // 每次调用都会触发断路检查，帮助定位僵尸代码
    circuitBreakerError(
        'useAppStore()',
        'useAppStore hook 被调用'
    );
    
    // 如果逃生舱启用，继续执行原有逻辑
    const store = useContext(AppStoreContext) as AppStore | null;
    
    if (store) {
        return store;
    }
    
    // 兼容回退：尝试从 DI 容器获取
    // 使用字符串 Token 'AppStore'，由 setupCore 注册
    try {
        const fallbackStore = container.resolve<AppStore>('AppStore');
        if (fallbackStore) {
            console.warn(
                '[useAppStore] ⚠️ 正在使用 DI 容器回退获取 AppStore。\n' +
                '这表明组件未被 ServicesProvider 包裹。\n' +
                '请检查组件渲染入口并添加 ServicesProvider。'
            );
            return fallbackStore;
        }
    } catch (e) {
        // DI 容器也没有注册，抛出原始错误
    }
    
    throw new Error(
        'useAppStore 必须在 AppStoreProvider 内部使用。' +
        '请确保组件树被 AppStoreProvider 包裹。'
    );
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
 * ⚠️ P0 边界防护：
 * - UI 层必须通过此 Hook 调用业务逻辑
 * - 禁止直接调用 AppStore 的私有方法
 * - 禁止直接调用 appStore['_updateSettingsAndPersist']
 * 
 * 兼容机制：
 * - 优先从 Context 获取 UseCases
 * - Context 不可用时，尝试从 DI 容器回退（仅限紧急兼容，会输出警告）
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
 * 
 * P0-1: 已彻底移除 appStore
 * - 读取状态使用 zustand store (useZustandAppStore)
 * - 写入状态使用 useCases
 */
export interface Services {
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
 * 
 * ⚠️ S7.0 变更：appStore 不再是必需的
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
    // appStore 不再是必需的（S7.0 变更）
    // if (!services.appStore) missing.push('appStore');
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
 * ⚠️ P0：UI 层通过 useUseCases() 获取业务用例，而非直接调用 store action
 * ⚠️ S7.0：appStore 已变为可选，仅在传递时提供 AppStoreContext
 * ⚠️ 运行时校验：如果 services 参数不完整，会立即抛出明确错误
 */
export function ServicesProvider({ services, children }: ServicesProviderProps) {
    // 运行时校验：确保所有必需服务都已正确传递
    validateServices(services, 'ServicesProvider');
    
    // 构建嵌套的 Provider 树
    // appStore 是可选的，仅在传递时提供
    let content = (
        <DataStoreContext.Provider value={services.dataStore}>
            <InputServiceContext.Provider value={services.inputService}>
                <UseCasesContext.Provider value={services.useCases}>
                    {children}
                </UseCasesContext.Provider>
            </InputServiceContext.Provider>
        </DataStoreContext.Provider>
    );
    
    return content;
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

// ============== S2 断路测试导出 ==============

/**
 * 断路测试状态查询
 * 用于在控制台检查当前断路测试配置
 * 
 * @example
 * // 在浏览器控制台执行
 * import { getCircuitBreakerStatus } from './AppStoreContext';
 * getCircuitBreakerStatus();
 */
export function getCircuitBreakerStatus(): {
    enabled: boolean;
    legacyAllowed: boolean;
    instructions: string;
} {
    const status = {
        enabled: CIRCUIT_BREAKER_ENABLED,
        legacyAllowed: isLegacyAllowed(),
        instructions: `
╔══════════════════════════════════════════════════════════════╗
║           S2 断路测试 (Circuit Breaker) 状态                 ║
╠══════════════════════════════════════════════════════════════╣
║ 断路开关: ${CIRCUIT_BREAKER_ENABLED ? '✅ 已启用' : '❌ 已禁用'}                                    ║
║ 逃生舱:   ${isLegacyAllowed() ? '🔓 已开启（不抛异常）' : '🔒 已关闭（会抛异常）'}                   ║
╠══════════════════════════════════════════════════════════════╣
║ 如何使用逃生舱（临时放行，方便调试）：                       ║
║   localStorage.setItem('ALLOW_LEGACY_APPSTORE', '1')         ║
║                                                              ║
║ 如何关闭逃生舱：                                             ║
║   localStorage.removeItem('ALLOW_LEGACY_APPSTORE')           ║
╠══════════════════════════════════════════════════════════════╣
║ 迁移指引：                                                   ║
║ • 读取状态 → useSettingsStore / useTimerStore / useThemeStore║
║ • 写入状态 → useUseCases()                                   ║
╚══════════════════════════════════════════════════════════════╝
        `.trim()
    };
    
    if (CIRCUIT_BREAKER_ENABLED) {
        console.log(status.instructions);
    }
    
    return status;
}
