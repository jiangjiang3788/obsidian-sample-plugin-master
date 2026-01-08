import { container } from 'tsyringe';
import { DataStore } from '@core/services/DataStore';
import { RendererService } from '@/features/settings/RendererService';
import { ActionService } from '@core/services/ActionService';
import { TimerStateService } from '@features/timer/TimerStateService';
import { InputService } from '@core/services/InputService';
import { ItemService } from '@core/services/ItemService';
import { TimerService } from '@features/timer/TimerService';
import { AppStore } from '@/app/AppStore';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import { FeatureLoader } from '@/app/FeatureLoader';
import { safeAsync } from '@shared/utils/errorHandler';
import { startMeasure } from '@shared/utils/performance';
import { SETTINGS_PERSISTENCE_TOKEN, SettingsRepository, type ISettingsPersistence } from '@core/services/SettingsRepository';
import { createAppStore, setAppStoreInstance } from '@/app/store/useAppStore';
import { createUseCases, USECASES_TOKEN, type UseCases } from '@/app/usecases';
import type ThinkPlugin from '@main';

/**
 * ServiceManager - 插件服务总线
 * 角色：应用层 (Application Layer)
 * 职责：
 * 1. 编排插件启动流程 (Bootstrap)
 * 2. 管理核心服务 (Store, Data, Timer) 的生命周期
 * 3. 协调特性 (Feature) 的加载与挂载
 * 4. 统一资源清理
 */
export class ServiceManager {
    private plugin: ThinkPlugin;
    private scanDataPromise: Promise<void> | null = null;
    
    // 服务实例缓存
    private services: Partial<{
        appStore: AppStore;
        dataStore: DataStore;
        rendererService: RendererService;
        actionService: ActionService;
        timerService: TimerService;
        timerStateService: TimerStateService;
        inputService: InputService;
        timerWidget: FloatingTimerWidget;
        itemService: ItemService;
        useCases: UseCases;  // P0 新增
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
        
        await this.initializeCore();         // 1. 基础状态 (AppStore)
        await this.loadTimerServices();      // 2. 核心业务 (Timer)
        await this.loadDataServices();       // 3. 数据服务 (Data/IO)
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
    }

    /**
     * [主流程] #2 初始化核心服务
     * 
     * P0 改造：
     * 1. 解析 AppStore（遗留 Class Store，保持兼容）
     * 2. 创建 Zustand Store 并初始化
     * 3. 创建 UseCases
     */
    private async initializeCore(): Promise<void> {
        const stopMeasure = startMeasure('ServiceManager.initializeCore');
        return await safeAsync(
            async () => {
                // 1. 解析遗留 AppStore（保持兼容）
                this.services.appStore = container.resolve(AppStore);
                this.services.timerStateService = container.resolve(TimerStateService);
                
                // 2. P0: 创建 Zustand Store 并初始化
                const settingsRepository = container.resolve(SettingsRepository);
                const zustandStore = createAppStore(settingsRepository);
                setAppStoreInstance(zustandStore);
                
                // 使用已加载的 settings 初始化 Zustand store
                const initialSettings = this.services.appStore.getSettings();
                zustandStore.getState().initialize(initialSettings);
                console.log('[ThinkPlugin] Zustand Store 初始化完成');
                
                // MIGRATION: 订阅 SettingsRepository 的变更，同步到双 Store
                settingsRepository.subscribe((settings) => {
                    // 同步到 Zustand Store
                    zustandStore.setState({ settings });
                    // 同步派生状态：如果 floatingTimerEnabled 变为 false，关闭 widget
                    if (!settings.floatingTimerEnabled) {
                        zustandStore.setState({ isTimerWidgetVisible: false });
                    }
                    // 同步到 AppStore（遗留兼容）
                    this.services.appStore?.__syncSettingsFromRepo(settings);
                });
                console.log('[ThinkPlugin] SettingsRepository 订阅已建立');
                
                // 3. P0: 创建 UseCases 并注册到 DI 容器
                this.services.useCases = createUseCases();
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

                // 恢复状态
                const timers = await this.services.timerStateService!.loadStateFromFile();
                this.services.appStore!.setInitialTimers(timers);
                
                // 加载 Widget
                const settings = this.services.appStore!.getSettings();
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
     */
    private async loadUIFeatures(): Promise<void> {
        // 确保依赖已就绪
        if (!this.services.appStore || !this.services.dataStore || !this.services.rendererService || !this.services.actionService) {
            console.error('[ThinkPlugin] UI特性加载失败: 依赖服务未就绪');
            return;
        }

        const featureLoader = new FeatureLoader(
            this.plugin,
            this.services.appStore,
            this.services.dataStore,
            this.services.rendererService,
            this.services.actionService
        );

        await featureLoader.loadFeatures(this.scanDataPromise);
    }

    // ==================================================================================
    // 5. 辅助方法 (Getters & Helpers)
    // ==================================================================================

    get appStore(): AppStore {
        if (!this.services.appStore) throw new Error('AppStore 未初始化');
        return this.services.appStore;
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

    // P0 新增：获取 UseCases
    get useCases(): UseCases {
        if (!this.services.useCases) throw new Error('UseCases 未初始化');
        return this.services.useCases;
    }

    getLoadingStatus() {
        return {
            coreLoaded: !!this.services.appStore && !!this.services.timerStateService,
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
