import { container } from 'tsyringe';
import { DataStore } from '@core/services/DataStore';
import { RendererService } from '@/features/settings/RendererService';
import { ActionService } from '@core/services/ActionService';
import { TimerStateService } from '@features/timer/TimerStateService';
import { InputService } from '@core/services/InputService';
import { ItemService } from '@core/services/ItemService';
import { TimerService } from '@features/timer/TimerService';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import { FeatureLoader } from '@/app/FeatureLoader';
import { safeAsync } from '@shared/utils/errorHandler';
import { startMeasure } from '@shared/utils/performance';
import { SETTINGS_PERSISTENCE_TOKEN, SettingsRepository, type ISettingsPersistence } from '@core/services/SettingsRepository';
import { createAppStore, STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
import { createUseCases, USECASES_TOKEN, type UseCases } from '@/app/usecases';
import { THEME_MATCHER_TOKEN } from '@core/types/theme';
import { ThemeManager } from '@features/settings/ThemeManager';
import { SETTINGS_TOKEN } from '@core/services/types'; // DI DEBUG: 用于获取初始设置
import type { ThinkSettings } from '@core/types'; // DI DEBUG
import type ThinkPlugin from '@main';
import { AppStore } from '@/app/AppStore';

// ============== S3 拔管测试 (DI_UNPLUG) 配置 ==============
/**
 * S3 拔管测试：ServiceManager 不注入 AppStore
 * 
 * 目的：在删除 AppStore 前，用"故意断供"的方式验证核心链路已经解耦，
 *       并找出所有隐性 DI 依赖点。
 * 
 * 如何启用：
 *   localStorage.setItem('DI_UNPLUG_APPSTORE', '1')
 *   然后刷新页面
 * 
 * 如何关闭：
 *   localStorage.removeItem('DI_UNPLUG_APPSTORE')
 *   然后刷新页面
 * 
 * 若白屏：
 *   1. 查看 Console 中所有带 🚨 [DI_UNPLUG] 前缀的错误
 *   2. 查看堆栈信息定位依赖点
 *   3. 修复依赖点后重新测试
 * 
 * 逃生舱（允许 bypass 不 throw）：
 *   localStorage.setItem('ALLOW_DI_UNPLUG_BYPASS', '1')
 *   这样只会 log 错误，不会 throw（方便调试）
 * 
 * ⚠️ 生产环境不受影响：拔管只在 DEV 才能启用
 */
const DEV = import.meta.env.DEV;

/**
 * 拔管开关：检查是否启用 AppStore 拔管
 * 仅 DEV 环境 + localStorage.DI_UNPLUG_APPSTORE = '1' 时启用
 */
const isUnplugEnabled = (): boolean => {
    if (!DEV) return false;
    try {
        return typeof localStorage !== 'undefined' && 
               localStorage.getItem('DI_UNPLUG_APPSTORE') === '1';
    } catch {
        return false;
    }
};

/**
 * 拔管逃生舱：检查是否允许 bypass（不 throw，只 log）
 */
const isUnplugBypassAllowed = (): boolean => {
    try {
        return typeof localStorage !== 'undefined' && 
               localStorage.getItem('ALLOW_DI_UNPLUG_BYPASS') === '1';
    } catch {
        return false;
    }
};

// 缓存拔管状态（启动时确定，避免运行时变化）
const UNPLUG = isUnplugEnabled();

/**
 * 获取 DI 拔管状态
 * 在控制台调用：getDIUnplugStatus()
 */
export function getDIUnplugStatus(): { DEV: boolean; UNPLUG: boolean; BYPASS: boolean; instructions: string } {
    const status = {
        DEV,
        UNPLUG: isUnplugEnabled(),
        BYPASS: isUnplugBypassAllowed(),
        instructions: `
╔══════════════════════════════════════════════════════════════════════╗
║             S3 DI 拔管测试 (DI_UNPLUG) 状态                          ║
╠══════════════════════════════════════════════════════════════════════╣
║ DEV 环境:      ${DEV ? '✅ 是' : '❌ 否'}                                             ║
║ 拔管开关:      ${isUnplugEnabled() ? '🔌 已启用（AppStore 未注入）' : '🟢 已关闭（正常模式）'}       ║
║ 逃生舱:        ${isUnplugBypassAllowed() ? '🔓 已开启（不抛异常）' : '🔒 已关闭（会抛异常）'}                ║
╠══════════════════════════════════════════════════════════════════════╣
║ 如何启用拔管（测试 AppStore 依赖）：                                 ║
║   localStorage.setItem('DI_UNPLUG_APPSTORE', '1')                    ║
║   然后刷新页面                                                       ║
║                                                                      ║
║ 如何关闭拔管：                                                       ║
║   localStorage.removeItem('DI_UNPLUG_APPSTORE')                      ║
║   然后刷新页面                                                       ║
║                                                                      ║
║ 如何启用逃生舱（只 log 不 throw）：                                  ║
║   localStorage.setItem('ALLOW_DI_UNPLUG_BYPASS', '1')                ║
╠══════════════════════════════════════════════════════════════════════╣
║ 若白屏，如何定位问题：                                               ║
║   1. 查看 Console 中所有 🚨 [DI_UNPLUG] 前缀的错误                   ║
║   2. 查看堆栈信息定位依赖点                                          ║
║   3. 在仓库中搜索依赖点并修复                                        ║
║                                                                      ║
║ 搜索建议：                                                           ║
║   - container.resolve(AppStore)                                      ║
║   - new AppStore                                                     ║
║   - appStore.getSettings                                             ║
║   - serviceManager.appStore                                          ║
╚══════════════════════════════════════════════════════════════════════╝
        `.trim()
    };
    
    console.log(status.instructions);
    return status;
}

/**
 * 报告遗留依赖（帮助定位 AppStore 依赖点）
 * 在控制台调用：reportLegacyDependencies()
 */
export function reportLegacyDependencies(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           🔍 AppStore 遗留依赖定位指南                               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║ 如果 UNPLUG=1 时出现错误，请在仓库中搜索以下模式：                   ║
║                                                                      ║
║ 🔸 DI 注入：                                                         ║
║    container.resolve(AppStore)                                       ║
║    @inject(AppStore)                                                 ║
║    container.resolve('AppStore')                                     ║
║                                                                      ║
║ 🔸 直接实例化：                                                      ║
║    new AppStore(                                                     ║
║                                                                      ║
║ 🔸 方法调用：                                                        ║
║    appStore.getSettings()                                            ║
║    appStore.subscribe(                                               ║
║    appStore.theme.                                                   ║
║    appStore.settings.                                                ║
║    appStore.block.                                                   ║
║                                                                      ║
║ 🔸 ServiceManager/Plugin 访问：                                      ║
║    serviceManager.appStore                                           ║
║    plugin.appStore                                                   ║
║    this.appStore                                                     ║
║                                                                      ║
║ 🔸 Context/Hook：                                                    ║
║    useAppStore()                                                     ║
║    AppStoreContext                                                   ║
║    AppStoreProvider                                                  ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ 迁移建议：                                                           ║
║   📖 读取 settings → useZustandAppStore(s => s.settings)             ║
║   📝 写入 settings → useCases.settings.updateSettings()              ║
║   🎨 主题操作     → useCases.theme.*                                 ║
║   📦 布局操作     → useCases.layout.*                                ║
║   ⏱️ 计时器操作   → useCases.timer.*                                 ║
╚══════════════════════════════════════════════════════════════════════╝
    `);
}

/**
 * DI 拔管错误处理
 * 当 UNPLUG=1 时访问 AppStore 会调用此函数
 */
function unplugError(context: string, operation: string): never | void {
    const message = `🚨 [DI_UNPLUG] AppStore 访问被拦截！

════════════════════════════════════════════════════════════════════════
⚠️ DI 拔管测试已启用：AppStore 未注入 DI 容器

📍 访问点：${context}
🔧 操作：${operation}

这意味着此代码依赖 AppStore，需要迁移到新架构：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 读取状态 → useZustandAppStore(selector)
📝 写入状态 → useCases.settings / useCases.layout / useCases.theme
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 如何修复：
  1. 找到上方堆栈中的调用点
  2. 将 AppStore 调用替换为 Zustand hooks 或 useCases
  3. 参考 reportLegacyDependencies() 获取更多迁移建议

🚪 逃生舱（临时放行）：
  localStorage.setItem('ALLOW_DI_UNPLUG_BYPASS', '1')
════════════════════════════════════════════════════════════════════════`;

    console.error(message);
    console.trace('📚 调用堆栈（用于定位依赖点）：');

    if (!isUnplugBypassAllowed()) {
        throw new Error(`🚨 [DI_UNPLUG] ${context} - ${operation} 被拦截。请迁移到 Zustand / useCases。`);
    } else {
        console.warn(
            `⚠️ [DI_UNPLUG] 逃生舱已启用，不抛出异常。\n` +
            `请尽快修复依赖后移除：localStorage.removeItem('ALLOW_DI_UNPLUG_BYPASS')`
        );
    }
}

/**
 * 创建 Poison AppStore 代理
 * 当 UNPLUG=1 时，任何对 AppStore 的访问都会触发错误
 * 
 * 使用 any 类型绕过 TypeScript 检查，因为这是一个故意不兼容的"毒"对象
 */
function createPoisonAppStore(): AppStore {
    const poisonTarget = {} as any;
    const handler: ProxyHandler<any> = {
        get(target, prop, receiver) {
            // 跳过常见的内部属性检查
            if (prop === 'then' || prop === Symbol.toStringTag || prop === Symbol.iterator) {
                return undefined;
            }
            unplugError('Poison AppStore Proxy', `访问属性 "${String(prop)}"`);
            return undefined;
        },
        set(target, prop, value) {
            unplugError('Poison AppStore Proxy', `设置属性 "${String(prop)}"`);
            return false;
        },
        apply(target, thisArg, args) {
            unplugError('Poison AppStore Proxy', '调用方法');
            return undefined;
        }
    };
    
    // 使用 any 类型绕过 TypeScript 严格检查
    return new Proxy(poisonTarget, handler) as unknown as AppStore;
}

/**
 * ServiceManager - 插件服务总线
 * 角色：应用层 (Application Layer)
 * 职责：
 * 1. 编排插件启动流程 (Bootstrap)
 * 2. 管理核心服务 (Store, Data, Timer) 的生命周期
 * 3. 协调特性 (Feature) 的加载与挂载
 * 4. 统一资源清理
 * 
 * S7.0: FeatureLoader 不再需要 AppStore 参数
 */
export class ServiceManager {
    private plugin: ThinkPlugin;
    private scanDataPromise: Promise<void> | null = null;
    
    // 服务实例缓存
    private services: Partial<{
        settingsRepository: SettingsRepository;
        dataStore: DataStore;
        rendererService: RendererService;
        actionService: ActionService;
        timerService: TimerService;
        timerStateService: TimerStateService;
        inputService: InputService;
        timerWidget: FloatingTimerWidget;
        itemService: ItemService;
        useCases: UseCases;
        appStore: AppStore; // S3: 保留 appStore 缓存，但 UNPLUG 时为 poison
    }> = {};
    
    // S3: Poison AppStore 实例（UNPLUG 模式下使用）
    private poisonAppStore: AppStore | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    // ==================================================================================
    // 1. 核心生命周期 (Bootstrap & Cleanup)
    // ==================================================================================

    /**
     * [主流程] #1 启动服务总线
     * 这是插件启动的核心入口，负责按顺序加载所有服务和功能。
     */
    async bootstrap(): Promise<void> {
        const stopMeasure = startMeasure('ServiceManager.bootstrap');
        
        // S3: 输出 DI_UNPLUG 状态
        if (DEV) {
            if (UNPLUG) {
                console.warn(`
╔══════════════════════════════════════════════════════════════════════╗
║  🚨 S3 DI_UNPLUG 模式已启用                                          ║
║                                                                      ║
║  AppStore 不会被注入 DI 容器，所有访问将被拦截并报错。               ║
║  请关注 console 中所有 🚨 [DI_UNPLUG] 前缀的错误。                   ║
║                                                                      ║
║  如何关闭：localStorage.removeItem('DI_UNPLUG_APPSTORE')             ║
║  逃生舱：  localStorage.setItem('ALLOW_DI_UNPLUG_BYPASS', '1')       ║
╚══════════════════════════════════════════════════════════════════════╝
                `);
            } else {
                console.log('[S3 DI_UNPLUG] 正常模式（拔管未启用）');
            }
        }
        
        // 注册 SettingsPersistence（基于 plugin.loadData/saveData）
        this.registerSettingsPersistence();
        
        await this.initializeCore();         // 1. 基础状态 (AppStore)
        await this.loadDataServices();       // 2. 数据服务 (Data/IO)
        await this.loadTimerServices();      // 3. 核心业务 (Timer)
        await this.loadUIFeatures();         // 4. UI 特性 (Dashboard/Settings)
        
        const duration = stopMeasure();
        console.log(`[ThinkPlugin] ServiceManager.bootstrap 完成 (总耗时: ${duration.toFixed(2)}ms)`);
    }

    /**
     * 清理所有服务资源
     */
    cleanup(): void {
        try {
            this.services.timerWidget?.unload();
            this.services.rendererService?.cleanup();
            this.services = {};
            container.clearInstances();
            console.log('[ThinkPlugin] ServiceManager 清理完成');
        } catch (error) {
            console.error('[ThinkPlugin] ServiceManager 清理失败:', error);
        }
    }

    // ==================================================================================
    // 2. 核心服务初始化 (Core & Data)
    // ==================================================================================

    /**
     * 注册 SettingsPersistence 到 DI 容器
     * 将 plugin.loadData/saveData 封装为 ISettingsPersistence 接口
     * 
     * S6: 同时注册 THEME_MATCHER_TOKEN，将 ThemeManager 作为实现
     */
    private registerSettingsPersistence(): void {
        const plugin = this.plugin;
        
        const settingsPersistence: ISettingsPersistence = {
            async loadData() {
                return await plugin.loadData();
            },
            async saveData(settings) {
                await plugin.saveData(settings);
            }
        };
        
        container.register(SETTINGS_PERSISTENCE_TOKEN, {
            useValue: settingsPersistence
        });
        
        // DI DEBUG: prove token is registered in THIS container instance
        console.log('[DI DEBUG] after register SettingsPersistence, isRegistered =', container.isRegistered(SETTINGS_PERSISTENCE_TOKEN));
        
        // S6: 注册 ThemeManager 并绑定到 THEME_MATCHER_TOKEN
        // 这样 core 层的 DataStore 可以通过接口依赖 ThemeManager
        container.registerSingleton(ThemeManager);
        container.register(THEME_MATCHER_TOKEN, { useToken: ThemeManager });
    }

    /**
     * [主流程] #2 初始化核心服务
     * 
     * Z1 改造：
     * 1. 使用 SettingsRepository 替代 AppStore 获取初始 settings
     * 2. 创建 Zustand Store 并初始化
     * 3. 创建 UseCases
     */
    private async initializeCore(): Promise<void> {
        const stopMeasure = startMeasure('ServiceManager.initializeCore');
        return await safeAsync(
            async () => {
                // 1. 解析核心服务
                // DI DEBUG: guard before any resolve
                if (!container.isRegistered(SETTINGS_PERSISTENCE_TOKEN)) {
                    console.error('[DI DEBUG] SettingsPersistence NOT registered in container used for resolve()', container);
                    throw new Error('[DI DEBUG] SettingsPersistence token missing before resolve()');
                } else {
                    console.log('[DI DEBUG] SettingsPersistence is registered before resolve()');
                }
                this.services.settingsRepository = container.resolve(SettingsRepository);
                
                // DI DEBUG: 初始化 SettingsRepository 的设置（因 setupCore.ts 不再调用 resolve）
                const diInitialSettings = container.resolve<ThinkSettings>(SETTINGS_TOKEN);
                this.services.settingsRepository.setInitialSettings(diInitialSettings);
                console.log('[DI DEBUG] SettingsRepository.setInitialSettings() called');
                this.services.timerStateService = container.resolve(TimerStateService);
                
                // 2. 创建 Zustand Store 并注册到 DI
                const settingsRepository = this.services.settingsRepository;
                const zustandStore = createAppStore(settingsRepository);
                
                // P0-3: 注册 STORE_TOKEN 到 DI 容器（替代全局单例）
                container.register(STORE_TOKEN, { useValue: zustandStore });
                console.log('[ThinkPlugin] Zustand Store 已注册到 DI 容器');
                
                // 使用 SettingsRepository 加载的 settings 初始化 Zustand store
                const zustandInitialSettings = settingsRepository.getSettings();
                zustandStore.getState().initialize(zustandInitialSettings);
                console.log('[ThinkPlugin] Zustand Store 初始化完成');
                
                // 订阅 SettingsRepository 的变更，同步到 Zustand Store
                settingsRepository.subscribe((settings) => {
                    // 同步到 Zustand Store
                    zustandStore.setState({ settings });
                    
                    // 动态管理 TimerWidget 的生命周期
                    // 如果启用且未加载，则加载
                    if (settings.floatingTimerEnabled && !this.services.timerWidget) {
                        this.services.timerWidget = new FloatingTimerWidget(this.plugin);
                        this.services.timerWidget.load();
                        // 启用时默认显示
                        zustandStore.setState(s => ({ ui: { ...s.ui, isTimerWidgetVisible: true } }));
                        console.log("[计时器浮窗] settings 启用 -> 创建并显示浮窗");
                    }

                    // 同步派生状态：如果 floatingTimerEnabled 变为 false，关闭 widget
                    if (!settings.floatingTimerEnabled) {
                        zustandStore.setState(s => ({ ui: { ...s.ui, isTimerWidgetVisible: false } }));
                        if (this.services.timerWidget) {
                            this.services.timerWidget.unload();
                            this.services.timerWidget = undefined;
                        }
                        console.log("[计时器浮窗] settings 禁用 -> 卸载浮窗");
                    }
                });
                console.log('[ThinkPlugin] SettingsRepository 订阅已建立');
                
                // 3. 创建 UseCases 并注册到 DI 容器（传入 store）
                this.services.useCases = createUseCases(zustandStore);
                container.register(USECASES_TOKEN, { useValue: this.services.useCases });
                console.log('[ThinkPlugin] UseCases 创建完成');
                
                const duration = stopMeasure();
                console.log(`[ThinkPlugin] 核心服务初始化完成 (${duration.toFixed(2)}ms)`);
            },
            'ServiceManager.initializeCore',
            { showNotice: false }
        ) || undefined;
    }

    /**
     * [主流程] #4 加载数据服务
     */
    private async loadDataServices(): Promise<void> {
        if (this.services.dataStore) return;
        
        const stopMeasure = startMeasure('ServiceManager.loadDataServices');
        
        // 解析服务
        this.services.dataStore = container.resolve(DataStore);
        this.services.rendererService = container.resolve(RendererService);
        this.services.actionService = container.resolve(ActionService);
        this.services.inputService = container.resolve(InputService);
        this.services.itemService = container.resolve(ItemService);

        // 触发后台扫描
        this.scanDataInBackground();
        
        const duration = stopMeasure();
        console.log(`[ThinkPlugin] 数据服务加载完成 (${duration.toFixed(2)}ms)`);
    }

    /**
     * [主流程] #4.1 后台扫描数据
     */
    private async scanDataInBackground(): Promise<void> {
        if (this.scanDataPromise) return this.scanDataPromise;
        
        this.scanDataPromise = new Promise<void>((resolve) => {
            console.time('[ThinkPlugin] 数据扫描');
            this.services.dataStore!.initialScan().then(() => {
                console.timeEnd('[ThinkPlugin] 数据扫描');
                this.services.dataStore!.notifyChange();
                this.services.dataStore!.writePerformanceReport('initialScan');
                resolve();
            }).catch((error) => {
                console.error('[ThinkPlugin] 数据扫描失败:', error);
                resolve();
            });
        });
        
        return this.scanDataPromise;
    }

    // ==================================================================================
    // 3. 业务服务加载 (Timer)
    // ==================================================================================

    /**
     * [主流程] #3 加载计时器服务
     */
    private async loadTimerServices(): Promise<void> {
        // [Debug] 验证依赖服务是否就绪
        console.log('[ServiceManager] loadTimerServices: action/data ready', {
            actionService: !!this.services.actionService,
            dataStore: !!this.services.dataStore,
        });

        if (this.services.timerService) return;
        
        const stopMeasure = startMeasure('ServiceManager.loadTimerServices');
        
        await safeAsync(
            async () => {
                this.services.timerService = container.resolve(TimerService);
                
                // 注册命令（P0: 使用 UseCases 替代直接调用 appStore）
                this.plugin.addCommand({
                    id: 'toggle-think-floating-timer',
                    name: '切换悬浮计时器显隐',
                    callback: () => {
                        // P0: 通过 UseCases 调用，而非直接调用 appStore
                        this.services.useCases!.settings.toggleTimerWidgetVisibility();
                    },
                });

                // [PR1] 初始化 Zustand Timer Slice
                await this.services.useCases!.timer.setInitialTimersFromDisk();
                console.log('[ThinkPlugin] Zustand Timers Loaded:', this.services.useCases!.timer.getTimers());

                // 加载 Widget
                const settings = this.services.settingsRepository!.getSettings();
                if (settings.floatingTimerEnabled) {
                    this.services.timerWidget = new FloatingTimerWidget(this.plugin);
                    this.services.timerWidget.load();
                }
                
                const duration = stopMeasure();
                console.log(`[ThinkPlugin] 计时器服务加载完成 (${duration.toFixed(2)}ms)`);
            },
            'ServiceManager.loadTimerServices',
            { showNotice: true }
        );
    }

    // ==================================================================================
    // 4. UI 特性加载 (Features)
    // ==================================================================================

    /**
     * [主流程] #5 加载UI特性
     * 
     * S7.0: FeatureLoader 不再需要 AppStore 参数
     * - QuickInput/AiInput 通过 zustand store 获取 settings
     * - Dashboard/Settings 的 appStore 参数已变为可选
     */
    private async loadUIFeatures(): Promise<void> {
        // 确保依赖已就绪
        if (!this.services.dataStore || !this.services.rendererService || !this.services.actionService) {
            console.error('[ThinkPlugin] UI特性加载失败: 依赖服务未就绪');
            return;
        }

        // S7.0: FeatureLoader 构造函数不再接收 appStore
        const featureLoader = new FeatureLoader(
            this.plugin,
            this.services.dataStore,
            this.services.rendererService,
            this.services.actionService
        );

        await featureLoader.loadFeatures(this.scanDataPromise);
    }

    // ==================================================================================
    // 5. 辅助方法 (Getters & Helpers)
    // ==================================================================================

    get settingsRepository(): SettingsRepository {
        if (!this.services.settingsRepository) throw new Error('SettingsRepository 未初始化');
        return this.services.settingsRepository;
    }

    get dataStore(): DataStore {
        if (!this.services.dataStore) throw new Error('DataStore 未初始化');
        return this.services.dataStore;
    }

    get timerService(): TimerService | undefined {
        return this.services.timerService;
    }

    get timerStateService(): TimerStateService | undefined {
        return this.services.timerStateService;
    }

    get timerWidget(): FloatingTimerWidget | undefined {
        return this.services.timerWidget;
    }

    get inputService(): InputService {
        if (!this.services.inputService) throw new Error('InputService 未初始化');
        return this.services.inputService;
    }

    get actionService(): ActionService | undefined {
        return this.services.actionService;
    }

    // P0 新增：获取 UseCases
    get useCases(): UseCases {
        if (!this.services.useCases) throw new Error('UseCases 未初始化');
        return this.services.useCases;
    }

    /**
     * S3 拔管测试：获取 AppStore
     * 
     * ⚠️ 当 UNPLUG=1 时：
     * - 不会从 DI 容器 resolve AppStore
     * - 返回 Poison Proxy，任何访问都会触发明确的错误 + 堆栈
     * 
     * 正常模式：
     * - 正常从 DI 容器获取 AppStore 单例
     * 
     * @deprecated 新代码应使用 zustand store (useZustandAppStore) + useCases
     */
    get appStore(): AppStore {
        // S3 拔管模式：返回 Poison Proxy
        if (UNPLUG) {
            if (!this.poisonAppStore) {
                console.warn('🚨 [DI_UNPLUG] UNPLUG 模式已启用：AppStore 访问将被拦截');
                console.warn('🚨 [DI_UNPLUG] 请关注 console 中所有 [DI_UNPLUG] 报错');
                this.poisonAppStore = createPoisonAppStore();
            }
            return this.poisonAppStore;
        }
        
        // 正常模式：从 DI 容器获取
        if (!this.services.appStore) {
            this.services.appStore = container.resolve(AppStore);
        }
        return this.services.appStore;
    }

    getLoadingStatus() {
        return {
            coreLoaded: !!this.services.settingsRepository && !!this.services.timerStateService,
            timerLoaded: !!this.services.timerService,
            dataLoaded: !!this.services.dataStore && !!this.services.rendererService,
            uiLoaded: !!this.services.dataStore && !!this.services.rendererService
        };
    }

    async reloadService(serviceName: keyof typeof this.services): Promise<void> {
        console.log(`[ServiceManager] 重新加载服务: ${serviceName}`);
        
        if (this.services[serviceName]) {
            const service = this.services[serviceName] as any;
            if (typeof service.cleanup === 'function') {
                service.cleanup();
            }
            delete this.services[serviceName];
        }

        switch (serviceName) {
            case 'timerService':
                await this.loadTimerServices();
                break;
            case 'dataStore':
                await this.loadDataServices();
                break;
            default:
                console.warn(`[ServiceManager] 不支持重新加载服务: ${serviceName}`);
        }
    }
}
