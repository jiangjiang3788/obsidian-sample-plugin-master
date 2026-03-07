import "reflect-metadata";

import { ensureReflectMetadata } from '@core/public';

// 立即执行环境检查
ensureReflectMetadata();

import { container } from 'tsyringe';
import { Plugin, Notice, Modal, Setting } from 'obsidian';
import { DataStore } from '@core/public';
import { InputService } from '@core/public';
import { ThinkSettings, DEFAULT_SETTINGS } from '@core/public';
import type { UseCases } from '@/app/public';
import { setupCoreContainer } from '@core/public';
import { VAULT_PORT_TOKEN, UI_PORT_TOKEN, METADATA_PORT_TOKEN, FILESTAT_PORT_TOKEN, MODAL_PORT_TOKEN, EVENTS_PORT_TOKEN, MESSAGE_RENDER_PORT_TOKEN } from '@core/public';
import './styles/main.css';
import { safeAsync } from '@shared/public';
import { performanceMonitor, startMeasure } from '@shared/public';
import { ServiceManager } from '@/app/ServiceManager';
import { isDisposed } from '@/app/runtime/lifecycleState';
import { buildRuntime } from '@/app/bootstrap/buildRuntime';
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
import { ObsidianModalPort } from '@/platform/ObsidianModalPort';
import { ObsidianEventsPort } from '@/platform/ObsidianEventsPort';
import { ObsidianMessageRenderPort } from '@/platform/ObsidianMessageRenderPort';
import { ObsidianMetadataPort } from '@/platform/ObsidianMetadataPort';
import { ObsidianFileStatPort } from '@/platform/ObsidianFileStatPort';
import { TaskThemeFromHeadingMigrator } from '@/core/migrations/TaskThemeFromHeadingMigrator';

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
                container.register(MODAL_PORT_TOKEN, { useClass: ObsidianModalPort });
                container.register(EVENTS_PORT_TOKEN, { useValue: new ObsidianEventsPort(this) });
                container.register(MESSAGE_RENDER_PORT_TOKEN, { useValue: new ObsidianMessageRenderPort(this.app) });
                container.register(METADATA_PORT_TOKEN, { useClass: ObsidianMetadataPort });
                container.register(FILESTAT_PORT_TOKEN, { useClass: ObsidianFileStatPort });

                // 2.1 capabilities 组合根（Phase1: 可注入体系）
                // - 先创建 registry，让后续 feature 可以在这里追加 register(...)

                // 3. 构建服务总线并启动主流程
                this.serviceManager = new ServiceManager(this);
                await this.serviceManager.bootstrap(); // 新的启动方法
                // 2.1 capabilities 组合根（Phase1: 可注入体系）
                // - 在 ServiceManager.bootstrap() 之后创建，确保 timerService/useCases 已就绪
                const capabilityRegistry = createDefaultCapabilityRegistry();
                const runtime = buildRuntime(container);
                this.capabilities = createCapabilities(this.app, settings, {
                    modalPort: runtime.modalPort,
                    timerService: this.serviceManager.timerService,
                }, capabilityRegistry);


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

        // [临时迁移] 把 heading 主题写入到任务行 (主题::xxx)
        // 用途：从“heading=主题”的旧习惯，过渡到“任务行显式主题字段”。
        // 迁移完成一段时间后，可安全删除该命令与 migrator，不影响新格式解析。
        this.addCommand({
            id: 'think-migrate-task-theme-from-heading-active-file',
            name: '迁移：把当前文件 heading 主题写入任务行 (主题::...)',
            callback: async () => {
                const file = this.app.workspace.getActiveFile();
                if (!file || !file.path?.endsWith('.md')) {
                    new Notice('Think: 没有找到当前打开的 Markdown 文件', 4000);
                    return;
                }
                try {
                    const migrator = container.resolve(TaskThemeFromHeadingMigrator);
                    new Notice('Think: 正在迁移任务主题字段...', 3000);
                    const res = await migrator.migrate({ paths: [file.path] });
                    new Notice(`Think: 迁移完成（修改任务 ${res.tasksTouched} 条）`, 5000);
                } catch (e: any) {
                    new Notice(`Think: 迁移失败 - ${e?.message || e}`, 6000);
                }
            }
        });

        this.addCommand({
            id: 'think-migrate-task-theme-from-heading-all-files',
            name: '迁移：全库把 heading 主题写入任务行 (主题::...)',
            callback: async () => {
                try {
                    const vaultPort = container.resolve(VAULT_PORT_TOKEN as any) as any;
                    const paths: string[] = vaultPort?.listMarkdownFilePaths?.() || [];
                    if (!paths.length) {
                        new Notice('Think: 未找到可迁移的 Markdown 文件', 4000);
                        return;
                    }
                    const migrator = container.resolve(TaskThemeFromHeadingMigrator);
                    new Notice(`Think: 正在迁移全库任务主题字段（文件数：${paths.length}）...`, 4000);
                    const res = await migrator.migrate({ paths });
                    new Notice(`Think: 迁移完成（修改任务 ${res.tasksTouched} 条，涉及文件 ${res.filesTouched} 个）`, 6000);
                } catch (e: any) {
                    new Notice(`Think: 迁移失败 - ${e?.message || e}`, 6000);
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
                const taskId = await TextPromptModal.open(this.app, {
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
        container.clearInstances();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        merged.inputSettings.blocks = (merged.inputSettings.blocks || []).map((block: any) => ({
            ...block,
            categoryKey: block?.categoryKey || block?.name || '',
        }));
        merged.groups = merged.groups || [];
        return merged as ThinkSettings;
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

// ----------------------------------------------------------------------------------
// Tiny input modal helper (kept local to avoid introducing a new shared UI dependency).
// ----------------------------------------------------------------------------------
class TextPromptModal extends Modal {
    private value: string = '';
    private resolve!: (value: string | null) => void;
    private resolved = false;
    private titleText: string;
    private placeholder: string;
    private ctaText: string;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    static open(app: any, opts: { title: string; placeholder?: string; ctaText?: string }): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new TextPromptModal(app, resolve, opts);
            modal.open();
        });
    }

    constructor(app: any, resolve: (value: string | null) => void, opts: { title: string; placeholder?: string; ctaText?: string }) {
        super(app);
        this.resolve = resolve;
        this.titleText = opts.title;
        this.placeholder = opts.placeholder ?? '';
        this.ctaText = opts.ctaText ?? '确定';
    }

    private resolveOnce(value: string | null) {
        if (this.resolved) return;
        this.resolved = true;
        try {
            this.resolve(value);
        } catch {
            // ignore
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.titleText });

        new Setting(contentEl)
            .addText((text) => {
                text.setPlaceholder(this.placeholder);
                text.onChange((v) => (this.value = v));
            })
            .addButton((btn) => {
                btn.setButtonText(this.ctaText);
                btn.setCta();
                btn.onClick(() => {
                    this.close();
                    this.resolveOnce(this.value || null);
                });
            });

        // Cancel on close
        // NOTE: 需要在 onClose 移除监听，避免多次 open/close 后累积监听导致重复触发。
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.close();
                this.resolveOnce(null);
            }
            if (e.key === 'Enter') {
                this.close();
                this.resolveOnce(this.value || null);
            }
        };
        this.modalEl.addEventListener('keydown', this.keydownHandler);
    }

    onClose(): void {
        // If user closes the modal by clicking outside / X / etc., resolve to null.
        this.resolveOnce(null);
        if (this.keydownHandler) {
            this.modalEl.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        this.contentEl.empty();
    }
}
