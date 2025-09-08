// src/main.ts
import "reflect-metadata";
import { container } from 'tsyringe';
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
// [核心修改] 导入 AppToken
import { AppToken } from '@core/services/types';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    appStore!: AppStore;
    dataStore!: DataStore;
    rendererService!: RendererService;
    actionService!: ActionService;
    timerService!: TimerService;
    timerStateService!: TimerStateService;
    timerWidget!: FloatingTimerWidget;
    inputService!: InputService;

    async onload(): Promise<void> {
        try {
            // --- 步骤 1: 注册与解析 ---
            const settings = await this.loadSettings();
            this.injectGlobalCss();

            // [核心修改] 使用字符串令牌 (Token) 来注册 App 实例
            // 这样任何需要 App 的服务都可以通过 @inject(AppToken) 来获取它
            container.register(AppToken, { useValue: this.app });

            // [核心修改] 直接从容器中解析出顶层服务。
            // tsyringe 会自动处理所有服务之间的依赖关系，不再需要手动调用 init()。
            this.appStore = container.resolve(AppStore);
            this.dataStore = container.resolve(DataStore);
            this.rendererService = container.resolve(RendererService);
            this.actionService = container.resolve(ActionService);
            this.timerService = container.resolve(TimerService);
            this.timerStateService = container.resolve(TimerStateService);
            this.inputService = container.resolve(InputService);

            // [核心修改] AppStore 是唯一一个需要手动初始化的，因为它需要 plugin 实例。
            this.appStore.init(this, settings);

            // [核心修改] 所有 service.init(...) 调用都已删除！

            // --- 步骤 2: 延迟执行 ---
            setTimeout(async () => {
                // 注册全局可访问的服务
                registerStore(this.appStore);
                registerDataStore(this.dataStore);
                registerTimerService(this.timerService);
                registerInputService(this.inputService);

                // 加载UI组件和数据
                this.timerWidget = new FloatingTimerWidget(this);
                this.timerWidget.load();

                this.timerStateService.loadStateFromFile().then(timers => {
                    this.appStore.setInitialTimers(timers);
                });
                
                // 等待全库扫描完成
                await this.dataStore.initialScan();

                // 设置功能模块
                DashboardFeature.setup?.({
                    plugin: this,
                    appStore: this.appStore,
                    dataStore: this.dataStore,
                    rendererService: this.rendererService,
                    actionService: this.actionService,
                    taskService: container.resolve(TaskService) 
                });
                QuickInputFeature.setup?.({
                    plugin: this,
                    appStore: this.appStore
                });
                SettingsFeature.setup?.({
                    app: this.app,
                    plugin: this,
                    appStore: this.appStore
                });

                this.addCommand({
                    id: 'think-open-settings',
                    name: '打开 Think 插件设置',
                    callback: () => {
                        // @ts-ignore
                        this.app.setting.open();
                        // @ts-ignore
                        this.app.setting.openTabById(this.manifest.id);
                    }
                });
                
                console.log('[Think Plugin] 插件已成功加载并准备就绪。');
                new Notice('Think Plugin 已成功加载!', 3000);

            }, 0);

        } catch (error) {
            console.error('[Think Plugin] 插件加载过程中发生严重错误:', error);
            new Notice(`[Think Plugin] 插件加载失败: ${error.message}`, 15000);
        }
    }

    // ... onunload, loadSettings, saveSettings, injectGlobalCss 方法保持不变 ...
    onunload(): void {
        document.getElementById(STYLE_TAG_ID)?.remove();
        this.rendererService?.cleanup();
        this.timerWidget?.unload();
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
        await this.saveData(this.appStore.getSettings());
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
}