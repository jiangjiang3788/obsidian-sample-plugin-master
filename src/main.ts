import "reflect-metadata";

import { ensureReflectMetadata } from '@core/bootstrap/public';

// 立即执行环境检查
ensureReflectMetadata();

import { container } from 'tsyringe';
import { Plugin, Notice } from 'obsidian';
import { DataStore } from '@core/services/public';
import { InputService } from '@core/services/public';
import { DEFAULT_SETTINGS, THINK_SETTINGS_SCHEMA_VERSION, type ThinkSettings } from '@core/types/public';
import type { UseCases } from '@/app/public';
import { setupCoreContainer } from '@core/bootstrap/public';
import { setDefaultAiHttpTransportFactory, resetDefaultAiHttpTransportFactory } from '@core/ai/public';
import {
  VAULT_PORT_TOKEN,
  UI_PORT_TOKEN,
  METADATA_PORT_TOKEN,
  FILESTAT_PORT_TOKEN,
  MODAL_PORT_TOKEN,
  EVENTS_PORT_TOKEN,
  MESSAGE_RENDER_PORT_TOKEN,
} from '@core/ports/public';
import type { ModalPort } from '@core/ports/public';
import './styles/main.css';
import { safeAsync } from '@shared/utils/public';
import { startMeasure } from '@shared/utils/public';
import { ServiceManager } from '@/app/ServiceManager';
import { isDisposed } from '@/app/runtime/lifecycleState';
import { buildRuntime } from '@/app/bootstrap/buildRuntime';
import {
    createCapabilities,
    createDefaultCapabilityRegistry,
    type Capabilities
} from '@/app/capabilities/createCapabilities';
import { TimerStateService } from '@core/services/public';
import { TimerService } from '@features/timer/TimerService';
import { ActionService } from '@core/services/public';
import { devLog } from '@core/utils/public';
import { ObsidianVaultPort } from '@/platform/ObsidianVaultPort';
import { ObsidianUiPort } from '@/platform/ObsidianUiPort';
import { ObsidianModalPort } from '@/platform/ObsidianModalPort';
import { ObsidianEventsPort } from '@/platform/ObsidianEventsPort';
import { ObsidianMessageRenderPort } from '@/platform/ObsidianMessageRenderPort';
import { ObsidianMetadataPort } from '@/platform/ObsidianMetadataPort';
import { ObsidianFileStatPort } from '@/platform/ObsidianFileStatPort';
import { ObsidianAiHttpTransport } from '@/platform/ObsidianAiHttpTransport';

devLog(`[ThinkPlugin] main.ts 已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;
    private capabilities!: Capabilities;
    private modalPort?: ModalPort;

    /**
     * [主流程] 插件启动入口
     * 1. 加载设置
     * 2. 注册 DI 容器
     * 3. 创建 ServiceManager 并启动
     * 4. 注册命令
     */
    async onload(): Promise<void> {
        devLog('[ThinkPlugin][BOOT] onload entered');
        const stopMeasure = startMeasure('ThinkPlugin.onload');

        await safeAsync(
            async () => {
                // 1. 加载设置
                setDefaultAiHttpTransportFactory(() => new ObsidianAiHttpTransport());
                devLog('[ThinkPlugin][BOOT] before loadSettings');
                const settings = await this.loadSettings();

                // 2. 配置 DI 容器 & 基础服务
                devLog('[ThinkPlugin][BOOT] after loadSettings', settings);
                devLog('[ThinkPlugin][BOOT] before setupCoreContainer');
                setupCoreContainer(this.app, settings);

                // Phase2: platform 成为唯一 Obsidian API 入口（第一步）
                // - 为 core/storage 注入 VaultPort 的平台实现
                // - 必须在任何依赖 STORAGE_TOKEN 的服务 resolve 之前完成注册
                devLog('[ThinkPlugin][BOOT] before platform registrations');
                container.register(VAULT_PORT_TOKEN, { useClass: ObsidianVaultPort });
                container.register(UI_PORT_TOKEN, { useClass: ObsidianUiPort });
                container.register(MODAL_PORT_TOKEN, { useClass: ObsidianModalPort });
                container.register(EVENTS_PORT_TOKEN, { useValue: new ObsidianEventsPort(this) });
                container.register(MESSAGE_RENDER_PORT_TOKEN, { useValue: new ObsidianMessageRenderPort(this.app) });
                container.register(METADATA_PORT_TOKEN, { useClass: ObsidianMetadataPort });
                container.register(FILESTAT_PORT_TOKEN, { useClass: ObsidianFileStatPort });

                // 2.1 capabilities 组合根（Phase1: 可注入体系）
                // - 先创建 registry，让后续 feature 可以在这里追加 register(...)

                // 3. 构建服务总线并启动主流程
                devLog('[ThinkPlugin][BOOT] before ServiceManager constructor');
                this.serviceManager = new ServiceManager(this);
                devLog('[ThinkPlugin][BOOT] before ServiceManager.bootstrap');
                await this.serviceManager.bootstrap(); // 新的启动方法
                // 2.1 capabilities 组合根（Phase1: 可注入体系）
                // - 在 ServiceManager.bootstrap() 之后创建，确保 timerService/useCases 已就绪
                devLog('[ThinkPlugin][BOOT] after ServiceManager.bootstrap');
                const capabilityRegistry = createDefaultCapabilityRegistry();
                const runtime = buildRuntime(container);
                this.modalPort = runtime.modalPort;
                this.capabilities = createCapabilities(this.app, settings, {
                    modalPort: runtime.modalPort,
                    timerService: this.serviceManager.timerService,
                }, capabilityRegistry);


                // 4. 注册命令
                devLog('[ThinkPlugin][BOOT] before registerCommands');
                this.registerCommands();

                devLog('[ThinkPlugin][BOOT] after registerCommands');
                const totalTime = stopMeasure();
                devLog(`[Think Plugin] 核心功能已加载完成 (总耗时: ${totalTime.toFixed(2)}ms)`);
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

        // Timer commands (via capabilities) - provide a concrete verification入口 for TimerCapability wiring.
        this.addCommand({
            id: 'think-timer-start-by-task-id',
            name: 'Timer: 开始/继续计时（输入任务 ID）',
            callback: async () => {
                const taskId = await this.modalPort?.openNamePrompt({
                    title: '开始/继续计时',
                    placeholder: '请输入任务 Item ID（例如：来自 Dashboard 的 item.id）',
                    ctaText: '开始',
                });
                if (!taskId) return;
                await this.capabilities.timer.startOrResume(taskId.trim());
            },
        });

        this.addCommand({
            id: 'think-timer-stop-active',
            name: 'Timer: 停止并写回（当前运行/暂停的第一个计时器）',
            callback: async () => {
                const timers = this.serviceManager.useCases.timer.getTimers();
                const active = timers.find((t: any) => t.status === 'running') ?? timers.find((t: any) => t.status === 'paused');
                if (!active) {
                    new Notice('没有找到可停止的计时器');
                    return;
                }
                await this.capabilities.timer.stopAndApply(active.id);
            },
        });
    }

    onunload(): void {
        this.serviceManager?.cleanup();
        resetDefaultAiHttpTransportFactory();
        // ServiceManager owns normal DI cleanup. Keep a fallback for failed partial bootstrap.
        if (!this.serviceManager) container.clearInstances();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const raw = stored && typeof stored === 'object' ? stored : {};
        return {
            ...DEFAULT_SETTINGS,
            ...raw,
            schemaVersion: THINK_SETTINGS_SCHEMA_VERSION,
            groups: Array.isArray(raw.groups) ? raw.groups : [],
            viewInstances: Array.isArray(raw.viewInstances) ? raw.viewInstances : [],
            layouts: Array.isArray(raw.layouts) ? raw.layouts : [],
            inputSettings: {
                ...DEFAULT_SETTINGS.inputSettings,
                ...(raw.inputSettings ?? {}),
                blocks: Array.isArray(raw.inputSettings?.blocks) ? raw.inputSettings.blocks : [],
                themes: Array.isArray(raw.inputSettings?.themes) ? raw.inputSettings.themes : [],
            },
            activeThemePaths: Array.isArray(raw.activeThemePaths) ? raw.activeThemePaths : [],
        };
    }


    private sanitizeSettingsForPersistence(settings: ThinkSettings): ThinkSettings {
        const cloned = JSON.parse(JSON.stringify(settings ?? {})) as ThinkSettings;
        const aiSettings = (cloned as any).aiSettings;
        if (aiSettings && typeof aiSettings === 'object' && aiSettings.persistApiKey !== true) {
            aiSettings.apiKey = '';
        }
        return cloned;
    }

    async saveSettings() {
        if (isDisposed()) return;
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
