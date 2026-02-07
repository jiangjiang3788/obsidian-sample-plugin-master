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
import { VAULT_PORT_TOKEN, UI_PORT_TOKEN, METADATA_PORT_TOKEN, FILESTAT_PORT_TOKEN } from '@core/public';
import './styles/main.css';
import { safeAsync } from '@shared/utils/errorHandler';
import { performanceMonitor, startMeasure } from '@shared/utils/performance';
import { ServiceManager } from '@/app/ServiceManager';
import {
    createCapabilities,
    createDefaultCapabilityRegistry,
    type Capabilities
} from '@/app/capabilities/createCapabilities';
import { TimerStateService } from '@core/public';
import { TimerService } from '@features/timer/TimerService';
import { ActionService } from '@core/public';
import { devLog } from '@core/public';
import { ObsidianVaultPort } from '@/platform/ObsidianVaultPort';
import { ObsidianUiPort } from '@/platform/ObsidianUiPort';
import { ObsidianMetadataPort } from '@/platform/ObsidianMetadataPort';
import { ObsidianFileStatPort } from '@/platform/ObsidianFileStatPort';

devLog(`[ThinkPlugin] main.ts 已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;
    private capabilities!: Capabilities;

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

                // Phase2: platform 成为唯一 Obsidian API 入口（第一步）
                // - 为 core/storage 注入 VaultPort 的平台实现
                // - 必须在任何依赖 STORAGE_TOKEN 的服务 resolve 之前完成注册
                container.register(VAULT_PORT_TOKEN, { useClass: ObsidianVaultPort });
                container.register(UI_PORT_TOKEN, { useClass: ObsidianUiPort });
                container.register(METADATA_PORT_TOKEN, { useClass: ObsidianMetadataPort });
                container.register(FILESTAT_PORT_TOKEN, { useClass: ObsidianFileStatPort });

                // 2.1 capabilities 组合根（Phase1: 可注入体系）
                // - 先创建 registry，让后续 feature 可以在这里追加 register(...)
                const capabilityRegistry = createDefaultCapabilityRegistry();
                this.capabilities = createCapabilities(this.app, settings, capabilityRegistry);

                // 3. 构建服务总线并启动主流程
                this.serviceManager = new ServiceManager(this);
                await this.serviceManager.bootstrap(); // 新的启动方法

                // 4. 注册命令
                this.registerCommands();

                const totalTime = stopMeasure();
                devLog(`[Think Plugin] 核心功能已加载完成 (总耗时: ${totalTime.toFixed(2)}ms)`);
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

        // [恢复工具] 清空索引缓存并重新全量扫描
        // 主要用于修复：升级/重构后 cache 不一致导致 items=0 的情况。
        this.addCommand({
            id: 'think-rebuild-index',
            name: '重建索引（清空缓存并重新扫描）',
            callback: async () => {
                try {
                    new Notice('Think: 正在重建索引...', 3000);
                    await this.serviceManager.dataStore.clearCacheAndRescan('full');
                    new Notice('Think: 索引重建完成', 3000);
                } catch (e: any) {
                    new Notice(`Think: 索引重建失败 - ${e?.message || e}`, 5000);
                }
            }
        });

        // AI 助手对话命令
        this.addCommand({
            id: 'think-open-ai-chat',
            name: '打开 AI 助手对话',
            callback: () => {
                // ✅ 通过 capabilities 统一入口触发
                this.capabilities.ai.openChat();
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
