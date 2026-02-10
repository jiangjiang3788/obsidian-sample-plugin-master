import type ThinkPlugin from '@main';
import { ActionService, DataStore, devTime, devTimeEnd, devWarn } from '@core/public';
import { RendererService } from '@/features/settings/RendererService';
import type { EventsPort } from '@core/public';
import { FeatureRegistry } from './FeatureRegistry';
import { registerFeatureContributions } from './features/registerFeatureContributions';
import type { UIFeatureBootContext } from './features/featureContext';

/**
 * FeatureLoader - UI 特性加载器
 * 职责：负责加载和挂载插件的 UI 特性 (Dashboard, Settings, QuickInput 等)
 * 
 * P0-2 架构：
 * - 不依赖全局单例
 * - 通过 DI container 获取其他服务
 * - useCases 由 ServiceManager 创建并注册到 DI
 */
export class FeatureLoader {
    private plugin: ThinkPlugin;
    private dataStore: DataStore;
    private rendererService: RendererService;
    private actionService: ActionService;
    private eventsPort: EventsPort;

    // Phase1: 收拢 feature boot 编排，便于在插件卸载时统一清理 background 定时任务。
    private registry: FeatureRegistry<UIFeatureBootContext> | null = null;

    constructor(
        plugin: ThinkPlugin,
        dataStore: DataStore,
        rendererService: RendererService,
        actionService: ActionService,
        eventsPort: EventsPort
    ) {
        this.plugin = plugin;
        this.dataStore = dataStore;
        this.rendererService = rendererService;
        this.actionService = actionService;
        this.eventsPort = eventsPort;
    }

    /**
     * 加载所有 UI 特性
     * @param dataScanPromise 数据扫描的 Promise，用于确保 Dashboard 在数据准备好后加载
     */
    async loadFeatures(dataScanPromise: Promise<void> | null): Promise<void> {
        devTime('[ThinkPlugin] UI特性加载');

        // Phase1: FeatureRegistry 收拢 feature 的 register/boot（避免硬编码堆积）
        // 说明：registry 持有 background 的 setTimeout 句柄；因此必须挂在实例上，才能在 unload 时 dispose。
        this.registry?.dispose();
        this.registry = new FeatureRegistry<UIFeatureBootContext>();
        const registry = this.registry;

        // Phase1-2: 由各 feature 自己声明注册信息，FeatureLoader 仅做编排
        registerFeatureContributions(registry, {
            plugin: this.plugin,
            dataStore: this.dataStore,
            rendererService: this.rendererService,
            actionService: this.actionService,
            eventsPort: this.eventsPort,
        });

        await registry.bootAll(
            { dataScanPromise },
            {
                onError: ({ id, error }) => {
                    devWarn(`[ThinkPlugin] Feature boot failed: ${id}`, error);
                },
            }
        );

        devTimeEnd('[ThinkPlugin] UI特性加载');
    }

    /**
     * 插件卸载时的清理入口。
     * - 取消尚未触发的 background feature 定时任务
     */
    cleanup(): void {
        this.registry?.dispose();
        this.registry = null;
    }

}