// src/core/services/ServiceManager.ts
import { container } from 'tsyringe';
import type { App } from 'obsidian';
import { DataStore } from '@core/services/DataStore';
import { RendererService } from '@core/services/RendererService';
import { ActionService } from '@core/services/ActionService';
import { TimerStateService } from '@features/timer/TimerStateService';
import { InputService } from '@core/services/InputService';
import { ItemService } from '@core/services/ItemService';
import { TimerService } from '@features/timer/TimerService';
import { AppStore } from '@core/stores/AppStore';
import { registerStore, registerDataStore, registerTimerService, registerInputService } from '@core/stores/storeRegistry';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quickinput';
import * as SettingsFeature from '@features/settings';
import { safeAsync } from '@shared/utils/errorHandler';
import { startMeasure } from '@shared/utils/performance';

import type ThinkPlugin from '@main';

/**
 * 服务管理器 - 负责管理插件的所有服务生命周期
 * 
 * 职责：
 * 1. 服务的懒加载管理
 * 2. 服务间依赖关系协调
 * 3. 功能模块的渐进式加载
 * 4. 资源清理
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
    }> = {};

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    /**
     * 初始化核心服务
     * 启动最必需的服务，确保插件基本功能可用
     */
    async initializeCore(): Promise<void> {
        const stopMeasure = startMeasure('ServiceManager.initializeCore');
        
        return await safeAsync(
            async () => {
                // 只解析启动必需的服务
                this.services.appStore = container.resolve(AppStore);
                this.services.timerStateService = container.resolve(TimerStateService);
                
                // 设置插件引用
                this.services.appStore.setPlugin(this.plugin);
                
                const duration = stopMeasure();
                console.log(`[ThinkPlugin] 核心服务初始化完成 (${duration.toFixed(2)}ms)`);
            },
            'ServiceManager.initializeCore',
            { showNotice: false }
        ) || undefined;
    }

    /**
     * 懒加载计时器相关服务
     * 计时器功能对用户体验很重要，需要优先加载
     */
    async loadTimerServices(): Promise<void> {
        if (this.services.timerService) return;
        
        const stopMeasure = startMeasure('ServiceManager.loadTimerServices');
        
        await safeAsync(
            async () => {
                this.services.timerService = container.resolve(TimerService);
                
                // 注册计时器相关命令
                this.plugin.addCommand({
                    id: 'toggle-think-floating-timer',
                    name: '切换悬浮计时器显隐',
                    callback: () => {
                        this.services.appStore!.toggleTimerWidgetVisibility();
                    },
                });

                // 加载计时器状态
                const timers = await this.services.timerStateService!.loadStateFromFile();
                this.services.appStore!.setInitialTimers(timers);
                
                // 只有当 floatingTimerEnabled 为 true 时才创建和加载 widget
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

    /**
     * 懒加载数据存储服务
     * 数据服务是其他功能的基础，但可以延迟加载以加快启动速度
     */
    async loadDataServices(): Promise<void> {
        if (this.services.dataStore) return;
        
        const stopMeasure = startMeasure('ServiceManager.loadDataServices');
        
        this.services.dataStore = container.resolve(DataStore);
        this.services.rendererService = container.resolve(RendererService);
        this.services.actionService = container.resolve(ActionService);
        this.services.inputService = container.resolve(InputService);
        this.services.itemService = container.resolve(ItemService);

        // 注册服务到全局注册表
        registerStore(this.services.appStore!);
        registerDataStore(this.services.dataStore);
        registerTimerService(this.services.timerService!);
        registerInputService(this.services.inputService);

        // 立即开始扫描数据，不再延迟
        this.scanDataInBackground();
        
        const duration = stopMeasure();
        console.log(`[ThinkPlugin] 数据服务加载完成 (${duration.toFixed(2)}ms)`);
    }

    /**
     * 后台扫描数据
     * 返回 Promise 以便等待扫描完成
     */
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

    /**
     * 懒加载UI特性
     * UI功能可以最后加载，不影响核心功能
     */
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

    /**
     * 加载仪表板功能
     * 仪表板依赖数据扫描完成
     */
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

    /**
     * 加载快速输入功能
     * 使用微任务延迟，避免阻塞主线程
     */
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

    /**
     * 加载设置功能
     * 设置功能不是核心功能，可以延迟加载
     */
    private loadSettingsFeature(): void {
        setTimeout(() => {
            console.time('[ThinkPlugin] Settings特性加载');
            SettingsFeature.setup?.({
                app: this.plugin.app,
                plugin: this.plugin,
                appStore: this.services.appStore!
            });

            // 注册设置相关命令
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

    /**
     * 获取服务实例的安全访问器
     * 如果服务未初始化，抛出清晰的错误信息
     */
    get appStore(): AppStore {
        if (!this.services.appStore) {
            throw new Error('AppStore 未初始化，请确保已调用 initializeCore()');
        }
        return this.services.appStore;
    }

    get dataStore(): DataStore {
        if (!this.services.dataStore) {
            throw new Error('DataStore 未初始化，请先调用 loadDataServices()');
        }
        return this.services.dataStore;
    }

    get timerService(): TimerService | undefined {
        return this.services.timerService;
    }

    get timerWidget(): FloatingTimerWidget | undefined {
        return this.services.timerWidget;
    }

    /**
     * 清理所有服务资源
     * 在插件卸载时调用
     */
    cleanup(): void {
        try {
            // 清理UI组件
            this.services.timerWidget?.unload();
            this.services.rendererService?.cleanup();

            // 清空服务缓存
            this.services = {};
            
            // 清理容器实例
            container.clearInstances();
            
            console.log('[ThinkPlugin] ServiceManager 清理完成');
        } catch (error) {
            console.error('[ThinkPlugin] ServiceManager 清理失败:', error);
        }
    }

    /**
     * 获取服务加载状态
     * 用于调试和监控
     */
    getLoadingStatus(): {
        coreLoaded: boolean;
        timerLoaded: boolean;
        dataLoaded: boolean;
        uiLoaded: boolean;
    } {
        return {
            coreLoaded: !!this.services.appStore && !!this.services.timerStateService,
            timerLoaded: !!this.services.timerService,
            dataLoaded: !!this.services.dataStore && !!this.services.rendererService,
            uiLoaded: !!this.services.dataStore && !!this.services.rendererService
        };
    }

    /**
     * 强制重新加载某个服务
     * 主要用于开发和调试
     */
    async reloadService(serviceName: keyof typeof this.services): Promise<void> {
        console.log(`[ServiceManager] 重新加载服务: ${serviceName}`);
        
        // 清理现有服务
        if (this.services[serviceName]) {
            // 如果有清理方法，调用它
            const service = this.services[serviceName] as any;
            if (typeof service.cleanup === 'function') {
                service.cleanup();
            }
            delete this.services[serviceName];
        }

        // 根据服务类型重新加载
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
