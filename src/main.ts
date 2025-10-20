import "reflect-metadata";
import { container, singleton } from 'tsyringe';
import { App, Plugin, Notice } from 'obsidian';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore, RendererService, ActionService, TimerStateService, InputService, TaskService, TimerService } from '@core/services';
import { AppStore } from '@state/AppStore';
import { registerStore, registerDataStore, registerTimerService, registerInputService } from '@state/storeRegistry';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as SettingsFeature from '@features/settings';
import { ThinkSettings, DEFAULT_SETTINGS, STYLE_TAG_ID } from '@core/domain';
import { GLOBAL_CSS } from '@features/dashboard/styles/global';
import { AppToken, SETTINGS_TOKEN } from '@core/services/types';
import { VaultFileStorage, STORAGE_TOKEN } from '@core/services/storage';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

// 服务懒加载管理器
class ServiceManager {
    private plugin: ThinkPlugin;
    private scanDataPromise: Promise<void> | null = null;
    private services: Partial<{
        appStore: AppStore;
        dataStore: DataStore;
        rendererService: RendererService;
        actionService: ActionService;
        timerService: TimerService;
        timerStateService: TimerStateService;
        inputService: InputService;
        timerWidget: FloatingTimerWidget;
        taskService: TaskService;
    }> = {};

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    // 启动必需的核心服务
    async initializeCore(): Promise<void> {
        console.time('[ThinkPlugin] 核心服务初始化');
        
        // 只解析启动必需的服务
        this.services.appStore = container.resolve(AppStore);
        this.services.timerStateService = container.resolve(TimerStateService);
        
        this.services.appStore.setPlugin(this.plugin);
        
        console.timeEnd('[ThinkPlugin] 核心服务初始化');
    }

    // 懒加载计时器相关服务
    async loadTimerServices(): Promise<void> {
        if (this.services.timerService) return;
        
        console.time('[ThinkPlugin] 计时器服务加载');
        this.services.timerService = container.resolve(TimerService);
        this.services.timerWidget = new FloatingTimerWidget(this.plugin);
        
        // 注册计时器相关命令
        this.plugin.addCommand({
            id: 'toggle-think-floating-timer',
            name: '切换悬浮计时器显隐',
            callback: () => {
                this.services.appStore!.toggleTimerWidgetVisibility();
            },
        });

        // 加载计时器状态
        this.services.timerStateService!.loadStateFromFile().then(timers => {
            this.services.appStore!.setInitialTimers(timers);
        });
        
        this.services.timerWidget.load();
        console.timeEnd('[ThinkPlugin] 计时器服务加载');
    }

    // 懒载数据存储服务
    async loadDataServices(): Promise<void> {
        if (this.services.dataStore) return;
        
        console.time('[ThinkPlugin] 数据服务加载');
        this.services.dataStore = container.resolve(DataStore);
        this.services.rendererService = container.resolve(RendererService);
        this.services.actionService = container.resolve(ActionService);
        this.services.inputService = container.resolve(InputService);
        this.services.taskService = container.resolve(TaskService);

        // 注册服务
        registerStore(this.services.appStore!);
        registerDataStore(this.services.dataStore);
        registerTimerService(this.services.timerService!);
        registerInputService(this.services.inputService);

        // 立即开始扫描数据，不再延迟
        this.scanDataInBackground();
        
        console.timeEnd('[ThinkPlugin] 数据服务加载');
    }

    // 后台扫描数据（修改：返回 Promise 以便等待）
    private async scanDataInBackground(): Promise<void> {
        // 如果已经在扫描，返回现有的 Promise
        if (this.scanDataPromise) return this.scanDataPromise;
        
        // 创建扫描 Promise，立即开始扫描
        this.scanDataPromise = new Promise<void>((resolve) => {
            console.time('[ThinkPlugin] 数据扫描');
            this.services.dataStore!.initialScan().then(() => {
                console.timeEnd('[ThinkPlugin] 数据扫描');
                // 数据扫描完成后，通知 DataStore 触发更新
                this.services.dataStore!.notifyChange();
                // 将性能报告写入 Vault
                this.services.dataStore!.writePerformanceReport('initialScan');
                resolve();
            }).catch((error) => {
                console.error('[ThinkPlugin] 数据扫描失败:', error);
                resolve(); // 即使失败也要 resolve，避免阻塞
            });
        });
        
        return this.scanDataPromise;
    }

    // 懒加载UI特性
    async loadUIFeatures(): Promise<void> {
        console.time('[ThinkPlugin] UI特性加载');
        
        // 确保数据服务已加载
        await this.loadDataServices();

        // 等待数据扫描完成后再加载 Dashboard
        await this.loadDashboardFeature();
        
        // 其他特性可以并行加载
        this.loadQuickInputFeature();
        this.loadSettingsFeature();
        
        console.timeEnd('[ThinkPlugin] UI特性加载');
    }

    private async loadDashboardFeature(): Promise<void> {
        // 等待数据扫描完成
        if (this.scanDataPromise) {
            await this.scanDataPromise;
        }
        
        // 数据准备好后再加载 Dashboard
        console.time('[ThinkPlugin] Dashboard特性加载');
        DashboardFeature.setup?.({
            plugin: this.plugin,
            appStore: this.services.appStore!,
            dataStore: this.services.dataStore!,
            rendererService: this.services.rendererService!,
            actionService: this.services.actionService!
        });
        console.timeEnd('[ThinkPlugin] Dashboard特性加载');
    }

    private loadQuickInputFeature(): void {
        setTimeout(() => {
            console.time('[ThinkPlugin] QuickInput特性加载');
            QuickInputFeature.setup?.({
                plugin: this.plugin,
                appStore: this.services.appStore!
            });
            console.timeEnd('[ThinkPlugin] QuickInput特性加载');
        }, 100);
    }

    private loadSettingsFeature(): void {
        setTimeout(() => {
            console.time('[ThinkPlugin] Settings特性加载');
            SettingsFeature.setup?.({
                app: this.plugin.app,
                plugin: this.plugin,
                appStore: this.services.appStore!
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

    // 获取服务的方法
    get appStore(): AppStore {
        if (!this.services.appStore) {
            throw new Error('AppStore 未初始化');
        }
        return this.services.appStore;
    }

    get dataStore(): DataStore {
        if (!this.services.dataStore) {
            throw new Error('DataStore 未初始化，请先调用 loadDataServices');
        }
        return this.services.dataStore;
    }

    cleanup(): void {
        this.services.timerWidget?.unload();
        this.services.rendererService?.cleanup();
    }
}

container.registerSingleton(AppStore);

export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;

    async onload(): Promise<void> {
        try {
            console.time('[ThinkPlugin] 总启动时间');
            
            // 步骤 1: 基础初始化
            const settings = await this.loadSettings();
            this.injectGlobalCss();

            // 注册基础依赖
            container.register(AppToken, { useValue: this.app });
            container.register(SETTINGS_TOKEN, { useValue: settings });
            container.register(STORAGE_TOKEN, { useClass: VaultFileStorage });

            // 步骤 2: 初始化服务管理器
            this.serviceManager = new ServiceManager(this);
            await this.serviceManager.initializeCore();

            // 步骤 3: 立即加载计时器服务（用户体验关键）
            await this.serviceManager.loadTimerServices();

            // 步骤 4: 延迟加载其他服务
            this.loadRemainingServicesAsync();

            console.timeEnd('[ThinkPlugin] 总启动时间');
            console.log('[Think Plugin] 核心功能已加载完成');
            
            // 显示快速启动通知
            new Notice('Think Plugin 核心功能已加载!', 2000);

        } catch (error) {
            console.error('[Think Plugin] 插件加载过程中发生严重错误:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`[Think Plugin] 插件加载失败: ${errorMessage}`, 15000);
        }
    }

    private async loadRemainingServicesAsync(): Promise<void> {
        // 使用微任务延迟加载，不阻塞主线程
        Promise.resolve().then(async () => {
            try {
                await this.serviceManager.loadUIFeatures();
                console.log('[Think Plugin] 所有功能已完全加载');
                // 移除过多的通知，数据加载完成时用户能看到数据即可
            } catch (error) {
                console.error('[Think Plugin] 延迟加载失败:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                new Notice(`[Think Plugin] 加载失败: ${errorMessage}`, 5000);
            }
        });
    }

    onunload(): void {
        document.getElementById(STYLE_TAG_ID)?.remove();
        this.serviceManager?.cleanup();
        container.clearInstances();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
        merged.dataSources = merged.dataSources || [];
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        merged.groups = merged.groups || [];
        return merged as ThinkSettings;
    }

    async saveSettings() {
        await this.saveData(this.serviceManager.appStore.getSettings());
    }

    private injectGlobalCss() {
        let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_TAG_ID;
            document.head.appendChild(el);
        }
        el.textContent = GLOBAL_CSS;
    }

    // 提供服务访问方法
    get appStore(): AppStore {
        return this.serviceManager.appStore;
    }

    get dataStore(): DataStore {
        return this.serviceManager.dataStore;
    }
}
