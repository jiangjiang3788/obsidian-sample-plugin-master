import 'reflect-metadata';

// 检查 reflect-metadata 是否正确加载的函数
function ensureReflectMetadata(): void {
    if (typeof Reflect === 'undefined') {
        console.error('[ThinkPlugin] Reflect 对象未定义!');
        throw new Error('Reflect object is not available');
    }

    if (typeof Reflect.getOwnMetadata !== 'function') {
        console.error('[ThinkPlugin] Reflect.getOwnMetadata 方法不可用!');
        console.log('[ThinkPlugin] 可用的 Reflect 方法:', Object.getOwnPropertyNames(Reflect));
        throw new Error('Reflect.getOwnMetadata is not a function - reflect-metadata polyfill not properly loaded');
    }

    console.log('[ThinkPlugin] reflect-metadata 已正确加载');
    console.log('[ThinkPlugin] Reflect.getOwnMetadata 可用:', typeof Reflect.getOwnMetadata);
}

// 立即执行检查
ensureReflectMetadata();

import { container } from 'tsyringe';
import { Plugin, Notice } from 'obsidian';
import { AppStore } from '@/app/AppStore';
import { DataStore } from '@core/services/DataStore';
import { ThinkSettings, DEFAULT_SETTINGS, STYLE_TAG_ID } from '@core/types';
import { GLOBAL_CSS } from '@shared/styles';
import { AppToken, SETTINGS_TOKEN } from '@core/services/types';
import { VaultFileStorage, STORAGE_TOKEN } from '@core/services/StorageService';
import { safeAsync } from '@shared/utils/errorHandler';
import { performanceMonitor, startMeasure } from '@shared/utils/performance';
import { ServiceManager } from '@/app/ServiceManager';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;

    async onload(): Promise<void> {
        const stopMeasure = startMeasure('ThinkPlugin.onload');
        
        await safeAsync(
            async () => {
                // 步骤 1: 基础初始化
                const settings = await this.loadSettings();
                this.injectGlobalCss();

                // 注册基础依赖
                container.register(AppToken, { useValue: this.app });
                container.register(SETTINGS_TOKEN, { useValue: settings });
                container.register(STORAGE_TOKEN, { useClass: VaultFileStorage });
                
                // 注册单例服务（现在 reflect-metadata 已确保可用）
                container.registerSingleton(AppStore);

                // 步骤 2: 初始化服务管理器
                this.serviceManager = new ServiceManager(this);
                await this.serviceManager.initializeCore();

                // 步骤 3: 立即加载计时器服务（用户体验关键）
                await this.serviceManager.loadTimerServices();

                // 步骤 4: 延迟加载其他服务
                this.loadRemainingServicesAsync();

                const totalTime = stopMeasure();
                console.log(`[Think Plugin] 核心功能已加载完成 (总耗时: ${totalTime.toFixed(2)}ms)`);
                
                // 显示快速启动通知
                new Notice('Think Plugin 核心功能已加载!', 2000);
                
                // 添加性能报告命令
                this.addCommand({
                    id: 'think-performance-report',
                    name: '显示性能报告',
                    callback: () => {
                        performanceMonitor.printReport();
                    }
                });
            },
            'ThinkPlugin.onload',
            {
                showNotice: true,
                noticeTimeout: 10000,
                context: 'Plugin initialization'
            }
        );
    }

    private async loadRemainingServicesAsync(): Promise<void> {
        // 使用微任务延迟加载，不阻塞主线程
        Promise.resolve().then(async () => {
            await safeAsync(
                async () => {
                    await this.serviceManager.loadUIFeatures();
                    console.log('[Think Plugin] 所有功能已完全加载');
                },
                'ThinkPlugin.loadRemainingServicesAsync',
                { showNotice: true, noticeTimeout: 5000 }
            );
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
