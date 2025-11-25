import { ensureReflectMetadata } from '@core/polyfills';

// 立即执行环境检查
ensureReflectMetadata();

import { container } from 'tsyringe';
import { Plugin, Notice } from 'obsidian';
import { AppStore } from '@/app/AppStore';
import { DataStore } from '@core/services/DataStore';
import { ThinkSettings, DEFAULT_SETTINGS } from '@core/types';
import { setupCoreContainer } from '@core/di/setupCore';
import './styles/main.css';
import { safeAsync } from '@shared/utils/errorHandler';
import { performanceMonitor, startMeasure } from '@shared/utils/performance';
import { ServiceManager } from '@/app/ServiceManager';
import { TimerStateService } from '@features/timer/TimerStateService';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;

    /**
     * [主流程] 插件启动入口
     * 1. 加载设置
     * 2. 注册 DI 容器
     * 3. 创建 ServiceManager 并启动
     * 4. 注册命令
     */
    async onload(): Promise<void> {
        const stopMeasure = startMeasure('ThinkPlugin.onload');

        await safeAsync(
            async () => {
                // 1. 加载设置
                const settings = await this.loadSettings();

                // 2. 配置 DI 容器 & 基础服务
                setupCoreContainer(this.app, settings);

                // 3. 构建服务总线并启动主流程
                this.serviceManager = new ServiceManager(this);
                await this.serviceManager.bootstrap(); // 新的启动方法

                // 4. 注册命令
                this.registerCommands();

                const totalTime = stopMeasure();
                console.log(`[Think Plugin] 核心功能已加载完成 (总耗时: ${totalTime.toFixed(2)}ms)`);
                new Notice('Think Plugin 核心功能已加载!', 2000);
            },
            'ThinkPlugin.onload',
            {
                showNotice: true,
                noticeTimeout: 10000,
                context: 'Plugin initialization'
            }
        );
    }

    private registerCommands(): void {
        this.addCommand({
            id: 'think-performance-report',
            name: '显示性能报告',
            callback: () => {
                performanceMonitor.printReport();
            }
        });
    }

    onunload(): void {
        this.serviceManager?.cleanup();
        container.clearInstances();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        merged.groups = merged.groups || [];
        return merged as ThinkSettings;
    }

    async saveSettings() {
        await this.saveData(this.serviceManager.appStore.getSettings());
    }

    // 提供服务访问方法
    get appStore(): AppStore {
        return this.serviceManager.appStore;
    }

    get dataStore(): DataStore {
        return this.serviceManager.dataStore;
    }

    get timerStateService(): TimerStateService | undefined {
        return this.serviceManager.timerStateService;
    }
}
