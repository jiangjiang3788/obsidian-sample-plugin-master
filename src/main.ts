import "reflect-metadata";
import { ensureReflectMetadata } from '@core/public';

// 立即执行环境检查
ensureReflectMetadata();

import { container } from 'tsyringe';
import { Plugin, Notice } from 'obsidian';
import { DataStore } from '@core/public';
import { InputService } from '@core/public';
import { ThinkSettings, DEFAULT_SETTINGS } from '@core/public';
import type { UseCases } from '@/app/public';
import { setupCoreContainer } from '@core/public';
import './styles/main.css';
import { safeAsync } from '@shared/utils/errorHandler';
import { performanceMonitor, startMeasure } from '@shared/utils/performance';
import { ServiceManager } from '@/app/ServiceManager';
import { TimerStateService } from '@core/public';
import { TimerService } from '@features/timer/TimerService';
import { ActionService } from '@core/public';
import { AiChatModal } from '@features/aichat';
import { AiChatService } from '@core/public';
import { RetrievalService } from '@core/public';
import { ChatSessionStore } from '@core/public';

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

        // AI 助手对话命令
        this.addCommand({
            id: 'think-open-ai-chat',
            name: '打开 AI 助手对话',
            callback: () => {
                        // Phase 4.3: 禁止在 features 内部使用 tsyringe container
                        // - 组合根（resolve）必须上移到入口（main/app）
                        const aiServices = {
                            chatService: container.resolve(AiChatService),
                            retrievalService: container.resolve(RetrievalService),
                            sessionStore: container.resolve(ChatSessionStore),
                        };

                        new AiChatModal(this.app, aiServices).open();
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
        // P0-1: 使用 SettingsRepository 替代 appStore
        await this.saveData(this.serviceManager.settingsRepository.getSettings());
    }

    // 提供服务访问方法（P0-1: 已移除 appStore getter）

    get dataStore(): DataStore {
        return this.serviceManager.dataStore;
    }

    get timerStateService(): TimerStateService | undefined {
        return this.serviceManager.timerStateService;
    }

    get inputService(): InputService {
        return this.serviceManager.inputService;
    }

    get timerService(): TimerService | undefined {
        return this.serviceManager.timerService;
    }

    get actionService(): ActionService | undefined {
        return this.serviceManager.actionService;
    }

    get useCases(): UseCases {
        return this.serviceManager.useCases;
    }
}
