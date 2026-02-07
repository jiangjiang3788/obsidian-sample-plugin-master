import { container } from 'tsyringe';

import type ThinkPlugin from '@main';
import type {
    ActionService,
    DataStore,
    InputService,
    SettingsRepository,
    TimerStateService,
} from '@core/public';
import { devError, devLog, devWarn } from '@core/public';

import type { FeatureLoader } from '@/app/FeatureLoader';
import type { ServiceManagerServices } from '@/app/ServiceManager.services';
import { Disposables } from '@/app/runtime/disposables';

import { startMeasure } from '@shared/utils/performance';
import { closeAllFloatingWidgets } from '@/shared/ui/widgets/FloatingWidgetManager';

import { registerSettingsPersistence } from '@/app/bootstrap/register';
import { initializeCore } from '@/app/bootstrap/initializeCore';
import { loadDataServices } from '@/app/bootstrap/loadDataServices';
import { loadTimerServices } from '@/app/bootstrap/loadTimerServices';
import { loadUIFeatures } from '@/app/bootstrap/loadUIFeatures';

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

    // UI 特性加载器（用于 unload 时清理 background feature 的定时任务）
    private featureLoader: FeatureLoader | null = null;

    // 服务实例缓存（逐步填充）
    private services: ServiceManagerServices = {};

    // 统一资源释放表
    private disposables: Disposables = new Disposables();

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;

        // Cleanup 资源表（逆序执行：LIFO）
        // 这里的注册顺序刻意与“希望释放顺序”相反
        this.disposables.add('container.clearInstances()', () => {
            container.clearInstances();
        });

        this.disposables.add('RendererService.cleanup()', () => {
            this.services.rendererService?.cleanup();
        });

        this.disposables.add('FloatingTimerWidget.unload()', () => {
            this.services.timerWidget?.unload();
            this.services.timerWidget = undefined;
        });

        this.disposables.add('closeAllFloatingWidgets()', () => {
            // 统一关闭所有由 FloatingWidgetManager 打开的悬浮窗
            closeAllFloatingWidgets();
        });

        this.disposables.add('FeatureLoader.cleanup()', () => {
            // 先清理 feature registry 的 background 定时任务，避免 unload 后仍触发。
            this.featureLoader?.cleanup();
            this.featureLoader = null;
        });
    }

    // ==================================================================================
    // 1. 核心生命周期 (Bootstrap & Cleanup)
    // ==================================================================================

    /**
     * [主流程] 启动服务总线
     * 这是插件启动的核心入口，负责按顺序加载所有服务和功能。
     */
    async bootstrap(): Promise<void> {
        const stopMeasure = startMeasure('ServiceManager.bootstrap');

        // 注册 SettingsPersistence（基于 plugin.loadData/saveData）
        this.registerSettingsPersistence();

        await this.initializeCore(); // 1. 基础状态
        await this.loadDataServices(); // 2. 数据服务 (Data/IO)
        await this.loadTimerServices(); // 3. 核心业务 (Timer)
        await this.loadUIFeatures(); // 4. UI 特性 (Dashboard/Settings)

        const duration = stopMeasure();
        devLog(`[ThinkPlugin] ServiceManager.bootstrap 完成 (总耗时: ${duration.toFixed(2)}ms)`);
    }

    /**
     * 清理所有服务资源
     */
    cleanup(): void {
        try {
            this.disposables.disposeAll();

            // 清空引用，避免意外复用
            this.scanDataPromise = null;
            this.services = {};

            devLog('[ThinkPlugin] ServiceManager 清理完成');
        } catch (error) {
            devError('[ThinkPlugin] ServiceManager 清理失败:', error);
        }
    }

    // ==================================================================================
    // 2. 启动步骤封装（只拆文件，不改行为）
    // ==================================================================================

    private registerSettingsPersistence(): void {
        registerSettingsPersistence(this.plugin);
    }

    private async initializeCore(): Promise<void> {
        await initializeCore({
            plugin: this.plugin,
            services: this.services,
            disposables: this.disposables,
        });
    }

    private async loadDataServices(): Promise<void> {
        await loadDataServices({
            services: this.services,
            getScanDataPromise: () => this.scanDataPromise,
            setScanDataPromise: (p) => {
                this.scanDataPromise = p;
            },
        });
    }

    private async loadTimerServices(): Promise<void> {
        await loadTimerServices({
            plugin: this.plugin,
            services: this.services,
        });
    }

    private async loadUIFeatures(): Promise<void> {
        await loadUIFeatures({
            plugin: this.plugin,
            services: this.services,
            scanDataPromise: this.scanDataPromise,
            getFeatureLoader: () => this.featureLoader,
            setFeatureLoader: (loader) => {
                this.featureLoader = loader;
            },
        });
    }

    // ==================================================================================
    // 3. Getters & Helpers（对外访问保持不变）
    // ==================================================================================

    get settingsRepository(): SettingsRepository {
        if (!this.services.settingsRepository) throw new Error('SettingsRepository 未初始化');
        return this.services.settingsRepository;
    }

    get dataStore(): DataStore {
        if (!this.services.dataStore) throw new Error('DataStore 未初始化');
        return this.services.dataStore;
    }

    get timerStateService(): TimerStateService | undefined {
        return this.services.timerStateService;
    }

    get inputService(): InputService {
        if (!this.services.inputService) throw new Error('InputService 未初始化');
        return this.services.inputService;
    }

    get actionService(): ActionService | undefined {
        return this.services.actionService;
    }

    // P0 新增：获取 UseCases
    get useCases() {
        if (!this.services.useCases) throw new Error('UseCases 未初始化');
        return this.services.useCases;
    }

    // 保留老接口：供 main.ts getter 使用
    get timerService() {
        return this.services.timerService;
    }

    get timerWidget() {
        return this.services.timerWidget;
    }

    getLoadingStatus() {
        return {
            coreLoaded: !!this.services.settingsRepository && !!this.services.timerStateService,
            timerLoaded: !!this.services.timerService,
            dataLoaded: !!this.services.dataStore && !!this.services.rendererService,
            uiLoaded: !!this.services.dataStore && !!this.services.rendererService,
        };
    }

    async reloadService(serviceName: keyof ServiceManagerServices): Promise<void> {
        devLog(`[ServiceManager] 重新加载服务: ${serviceName}`);

        if (this.services[serviceName]) {
            const service: any = this.services[serviceName] as any;
            if (typeof service.cleanup === 'function') {
                service.cleanup();
            }
            delete (this.services as any)[serviceName];
        }

        switch (serviceName) {
            case 'timerService':
                await this.loadTimerServices();
                break;
            case 'dataStore':
                await this.loadDataServices();
                break;
            default:
                devWarn(`[ServiceManager] 不支持重新加载服务: ${String(serviceName)}`);
        }
    }
}
