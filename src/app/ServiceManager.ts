import { container } from 'tsyringe';
import { DataStore } from '@core/public';
import { RendererService } from '@/features/settings/RendererService';
import { ActionService } from '@core/public';
import { TimerStateService } from '@core/public';
import { InputService } from '@core/public';
import { ItemService } from '@core/public';
import { TimerService } from '@features/timer/TimerService';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import { FeatureLoader } from '@/app/FeatureLoader';
import { safeAsync } from '@shared/utils/errorHandler';
import { startMeasure } from '@shared/utils/performance';
import { closeAllFloatingWidgets } from '@/shared/ui/widgets/FloatingWidgetManager';
import { SETTINGS_PERSISTENCE_TOKEN, SettingsRepository, type ISettingsPersistence } from '@core/public';
import { createAppStore, STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
import { createUseCases, USECASES_TOKEN, type UseCases } from '@/app/usecases';
import { THEME_MATCHER_TOKEN } from '@core/public';
import { ThemeManager } from '@features/settings/ThemeManager';
import { SETTINGS_TOKEN } from '@core/public'; // DI DEBUG: 用于获取初始设置
import type { ThinkSettings } from '@core/public'; // DI DEBUG
import type ThinkPlugin from '@main';

// ============== 核心 DI 容器配置 ==============
// - ❌ 不再有 appStore getter
// - ❌ 不再有 poison proxy / DI_UNPLUG 测试代码
//
// 状态读取：通过 STORE_TOKEN (Zustand store)
// 状态写入：通过 USECASES_TOKEN (UseCases)
// 设置持久化：通过 SettingsRepository

/**
 * ServiceManager - 插件服务总线
 * 角色：应用层 (Application Layer)
 * 职责：
 * 1. 编排插件启动流程 (Bootstrap)
 * 2. 管理核心服务 (Store, Data, Timer) 的生命周期
 * 3. 协调特性 (Feature) 的加载与挂载
 * 4. 统一资源清理
 * 
     * FeatureLoader 不再需要额外参数
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
    }> = {};

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
        
        // 注册 SettingsPersistence（基于 plugin.loadData/saveData）
        this.registerSettingsPersistence();
        
        await this.initializeCore();         // 1. 基础状态
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
            // 统一关闭所有由 FloatingWidgetManager 打开的悬浮窗
            // （例如：统计 Popover / 视图设置浮窗等）
            closeAllFloatingWidgets();

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
     * 1. 使用 SettingsRepository 获取初始 settings
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
                
                // 订阅 SettingsRepository 的变更，仅同步到 Zustand Store
                settingsRepository.subscribe((settings) => {
                    zustandStore.setState({ settings });
                });
                console.log('[ThinkPlugin] SettingsRepository 订阅已建立（纯同步 settings）');
                
                // TimerWidget 生命周期管理：通过监听 store 中 settings.floatingTimerEnabled 变化
                zustandStore.subscribe(
                    (state) => state.settings.floatingTimerEnabled,
                    (floatingTimerEnabled, prevFloatingTimerEnabled) => {
                        // 从禁用到启用：创建并加载 TimerWidget
                        if (floatingTimerEnabled && !prevFloatingTimerEnabled) {
                            if (!this.services.timerWidget) {
                                this.services.timerWidget = new FloatingTimerWidget(this.plugin);
                                this.services.timerWidget.load();
                                zustandStore.setState(s => ({ ui: { ...s.ui, isTimerWidgetVisible: true } }));
                                console.log("[计时器浮窗] 已启用 -> 创建并显示浮窗");
                            }
                        }
                        
                        // 从启用到禁用：卸载 TimerWidget
                        if (!floatingTimerEnabled && prevFloatingTimerEnabled) {
                            zustandStore.setState(s => ({ ui: { ...s.ui, isTimerWidgetVisible: false } }));
                            if (this.services.timerWidget) {
                                this.services.timerWidget.unload();
                                this.services.timerWidget = undefined;
                                console.log("[计时器浮窗] 已禁用 -> 卸载浮窗");
                            }
                        }
                    }
                );
                console.log('[ThinkPlugin] TimerWidget 生命周期监听已建立');
                
                // 3. 创建 UseCases 并注册到 DI 容器（传入 store）
                this.services.useCases = createUseCases(zustandStore, {
                    timerStateService: this.services.timerStateService!,
                });
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
                // [DI Gate] features 层禁止 tsyringe：TimerService 改为手工创建
                this.services.timerService = new TimerService(
                    this.services.useCases!,
                    this.services.dataStore!,
                    this.services.itemService!,
                    this.services.inputService!,
                    this.plugin.app
                );

                // RendererService 依赖 TimerService，因此在 TimerService 就绪后再创建
                if (!this.services.rendererService) {
                    const store = container.resolve<AppStoreInstance>(STORE_TOKEN);
                    this.services.rendererService = new RendererService(
                        this.plugin.app,
                        this.services.dataStore!,
                        this.services.actionService!,
                        this.services.itemService!,
                        this.services.inputService!,
                        this.services.timerService,
                        this.services.useCases!,
                        store
                    );
                }
                
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
     * FeatureLoader 不再需要额外参数
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
