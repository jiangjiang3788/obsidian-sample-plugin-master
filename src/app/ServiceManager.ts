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
import { markDisposed } from '@/app/runtime/lifecycleState';

import { startMeasure } from '@shared/public';
import { performanceMonitor } from '@shared/public';
import { closeAllFloatingWidgets } from '@/app/public';

import { registerSettingsPersistence } from '@/app/bootstrap/register';
import { initializeCore } from '@/app/bootstrap/initializeCore';
import { loadDataServices } from '@/app/bootstrap/loadDataServices';
import { loadTimerServices } from '@/app/bootstrap/loadTimerServices';
import { loadUIFeatures } from '@/app/bootstrap/loadUIFeatures';
import { buildRuntime, resetRuntimeCache, resolveBootstrap, type BootstrapResolved } from '@/app/bootstrap/buildRuntime';

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

    // bootstrap 时一次性 resolve 的依赖（不含 STORE_TOKEN）
    private bootstrapResolved: BootstrapResolved | null = null;

    // buildRuntime 构建的 UI services（含 STORE_TOKEN）
    private runtimeServices: import('./services.types').Services | null = null;

    // 统一资源释放表
    private disposables: Disposables = new Disposables();

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;

        // Ensure floating widgets are closed on unload/reload (avoid lingering DOM/listeners).
        this.disposables.add('closeAllFloatingWidgets()', () => {
            try { closeAllFloatingWidgets(); } catch {}
        });

        // Cleanup 资源表（逆序执行：LIFO）
        // 这里的注册顺序刻意与“希望释放顺序”相反
        this.disposables.add('resetRuntimeCache()', () => {
            resetRuntimeCache();
        });

        // AI chat sessions（如果已创建）：卸载后禁止继续写文件
        this.disposables.add('ChatSessionStore.dispose()', () => {
            try { this.services.chatSessionStore?.dispose?.(); } catch {}
        });

        this.disposables.add('container.clearInstances()', () => {
            container.clearInstances();
        });

        this.disposables.add('RendererService.cleanup()', () => {
            this.services.rendererService?.cleanup();
        });

        this.disposables.add('DataStore.dispose()', () => {
            try { this.services.dataStore?.dispose?.(); } catch {}
        });

        this.disposables.add('FloatingTimerWidget.unload()', () => {
            this.services.timerWidget?.unload();
            this.services.timerWidget = undefined;
        });

        this.disposables.add('closeAllFloatingWidgets()', () => {
            // 统一关闭所有由 FloatingWidgetManager 打开的悬浮窗
            closeAllFloatingWidgets();
        });

        this.disposables.add('performanceMonitor.reset()', () => {
            try { performanceMonitor.reset(); } catch {}
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

        // 在创建 store 之前，先解析不依赖 STORE_TOKEN 的 bootstrap deps
        this.bootstrapResolved = resolveBootstrap();

        await this.initializeCore(); // 1. 基础状态

        // store & usecases 就绪后再构建 runtime（依赖 STORE_TOKEN）
        this.runtimeServices = buildRuntime();

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
            // Mark disposed first so any late async tasks can short-circuit writes.
            markDisposed();
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
        if (!this.bootstrapResolved) throw new Error('bootstrapResolved 未初始化');
        await initializeCore({
            plugin: this.plugin,
            services: this.services,
            disposables: this.disposables,
            bootstrap: {
                settingsRepository: this.bootstrapResolved.settingsRepository,
                timerStateService: this.bootstrapResolved.timerStateService,
                initialSettings: this.bootstrapResolved.initialSettings,
            },
        });
    }

    private async loadDataServices(): Promise<void> {
        if (!this.bootstrapResolved) throw new Error('bootstrapResolved 未初始化');
        if (!this.runtimeServices) throw new Error('runtimeServices 未初始化');
        await loadDataServices({
            services: this.services,
            runtime: {
                dataStore: this.runtimeServices.dataStore,
                inputService: this.runtimeServices.inputService,
            },
            bootstrap: {
                actionService: this.bootstrapResolved.actionService,
                itemService: this.bootstrapResolved.itemService,
                chatSessionStore: this.bootstrapResolved.chatSessionStore,
            },
            getScanDataPromise: () => this.scanDataPromise,
            setScanDataPromise: (p) => {
                this.scanDataPromise = p;
            },
        });
    }

    private async loadTimerServices(): Promise<void> {
        if (!this.runtimeServices) throw new Error('runtimeServices 未初始化');
        await loadTimerServices({
            plugin: this.plugin,
            services: this.services,
            runtime: this.runtimeServices,
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