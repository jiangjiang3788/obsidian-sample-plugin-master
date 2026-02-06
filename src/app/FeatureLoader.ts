import type ThinkPlugin from '@main';
import { DataStore } from '@core/public';
import { RendererService } from '@/features/settings/RendererService';
import { ActionService } from '@core/public';
import * as QuickInputFeature from '@features/quickinput';
import * as AiInputFeature from '@features/aiinput';
import { setupSettings, setupDashboard } from '@/features/settings';
import { devTime, devTimeEnd } from '@/core/utils/devLogger';

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

    constructor(
        plugin: ThinkPlugin,
        dataStore: DataStore,
        rendererService: RendererService,
        actionService: ActionService
    ) {
        this.plugin = plugin;
        this.dataStore = dataStore;
        this.rendererService = rendererService;
        this.actionService = actionService;
    }

    /**
     * 加载所有 UI 特性
     * @param dataScanPromise 数据扫描的 Promise，用于确保 Dashboard 在数据准备好后加载
     */
    async loadFeatures(dataScanPromise: Promise<void> | null): Promise<void> {
        devTime('[ThinkPlugin] UI特性加载');
        
        // 1. Dashboard (依赖数据扫描)
        await this.loadDashboardFeature(dataScanPromise);
        
        // 2. Settings (独立)
        this.loadSettingsFeature();
        
        // 3. QuickInput (独立)
        this.loadQuickInputFeature();
        
        // 4. AI Input (独立)
        this.loadAiInputFeature();
        
        devTimeEnd('[ThinkPlugin] UI特性加载');
    }

    private async loadDashboardFeature(dataScanPromise: Promise<void> | null): Promise<void> {
        // 必须等待数据扫描完成，否则 Dashboard 没数据
        if (dataScanPromise) {
            await dataScanPromise;
        }
        
        devTime('[ThinkPlugin] Dashboard特性加载');
        setupDashboard?.({
            plugin: this.plugin,
            dataStore: this.dataStore,
            rendererService: this.rendererService,
            actionService: this.actionService,
        });
        devTimeEnd('[ThinkPlugin] Dashboard特性加载');
    }

    private loadSettingsFeature(): void {
        // 延迟加载以优化启动性能
        setTimeout(() => {
            devTime('[ThinkPlugin] Settings特性加载');
            
            setupSettings?.({
                app: this.plugin.app,
                plugin: this.plugin,
                dataStore: this.dataStore,
            });

            this.plugin.addCommand({
                id: 'think-open-settings',
                name: '打开 Think 插件设置',
                callback: () => {
                    // @ts-ignore
                    this.plugin.app.setting.open();
                    // @ts-ignore
                    this.plugin.app.setting.openTabById(this.plugin.manifest.id);
                }
            });

            devTimeEnd('[ThinkPlugin] Settings特性加载');
        }, 150);
    }

    private loadQuickInputFeature(): void {
        setTimeout(() => {
            devTime('[ThinkPlugin] QuickInput特性加载');
            QuickInputFeature.setup?.({
                plugin: this.plugin
            });
            devTimeEnd('[ThinkPlugin] QuickInput特性加载');
        }, 100);
    }

    private loadAiInputFeature(): void {
        setTimeout(() => {
            devTime('[ThinkPlugin] AiInput特性加载');
            AiInputFeature.setup?.({
                plugin: this.plugin
            });
            devTimeEnd('[ThinkPlugin] AiInput特性加载');
        }, 120);
    }
}