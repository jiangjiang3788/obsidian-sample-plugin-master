import type ThinkPlugin from '@main';
import { AppStore } from '@/app/AppStore';
import { DataStore } from '@core/services/DataStore';
import { RendererService } from '@/features/settings/RendererService';
import { ActionService } from '@core/services/ActionService';
import * as QuickInputFeature from '@features/quickinput';
import { setupSettings, setupDashboard } from '@/features/settings';

/**
 * FeatureLoader - UI 特性加载器
 * 职责：负责加载和挂载插件的 UI 特性 (Dashboard, Settings, QuickInput 等)
 */
export class FeatureLoader {
    private plugin: ThinkPlugin;
    private appStore: AppStore;
    private dataStore: DataStore;
    private rendererService: RendererService;
    private actionService: ActionService;

    constructor(
        plugin: ThinkPlugin,
        appStore: AppStore,
        dataStore: DataStore,
        rendererService: RendererService,
        actionService: ActionService
    ) {
        this.plugin = plugin;
        this.appStore = appStore;
        this.dataStore = dataStore;
        this.rendererService = rendererService;
        this.actionService = actionService;
    }

    /**
     * 加载所有 UI 特性
     * @param dataScanPromise 数据扫描的 Promise，用于确保 Dashboard 在数据准备好后加载
     */
    async loadFeatures(dataScanPromise: Promise<void> | null): Promise<void> {
        console.time('[ThinkPlugin] UI特性加载');
        
        // 1. Dashboard (依赖数据扫描)
        await this.loadDashboardFeature(dataScanPromise);
        
        // 2. Settings (独立)
        this.loadSettingsFeature();
        
        // 3. QuickInput (独立)
        this.loadQuickInputFeature();
        
        console.timeEnd('[ThinkPlugin] UI特性加载');
    }

    private async loadDashboardFeature(dataScanPromise: Promise<void> | null): Promise<void> {
        // 必须等待数据扫描完成，否则 Dashboard 没数据
        if (dataScanPromise) {
            await dataScanPromise;
        }
        
        console.time('[ThinkPlugin] Dashboard特性加载');
        setupDashboard?.({
            plugin: this.plugin,
            appStore: this.appStore,
            dataStore: this.dataStore,
            rendererService: this.rendererService,
            actionService: this.actionService,
        });
        console.timeEnd('[ThinkPlugin] Dashboard特性加载');
    }

    private loadSettingsFeature(): void {
        // 延迟加载以优化启动性能
        setTimeout(() => {
            console.time('[ThinkPlugin] Settings特性加载');
            
            setupSettings?.({
                app: this.plugin.app,
                plugin: this.plugin,
                appStore: this.appStore,
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

            console.timeEnd('[ThinkPlugin] Settings特性加载');
        }, 150);
    }

    private loadQuickInputFeature(): void {
        setTimeout(() => {
            console.time('[ThinkPlugin] QuickInput特性加载');
            QuickInputFeature.setup?.({
                plugin: this.plugin,
                appStore: this.appStore
            });
            console.timeEnd('[ThinkPlugin] QuickInput特性加载');
        }, 100);
    }
}
