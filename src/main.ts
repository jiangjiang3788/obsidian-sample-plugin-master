// src/main.ts
import "reflect-metadata";
import { container } from 'tsyringe';
import { App, Plugin } from 'obsidian';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore, RendererService, ActionService, TimerStateService, InputService, TaskService, TimerService } from '@core/services';
import { AppStore } from '@state/AppStore';
import { registerStore } from '@state/storeRegistry';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as SettingsFeature from '@features/settings';
import { ThinkSettings, DEFAULT_SETTINGS, STYLE_TAG_ID } from '@core/domain';
import { GLOBAL_CSS } from '@features/dashboard/styles/global';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    appStore!: AppStore;
    dataStore!: DataStore;
    rendererService!: RendererService;
    timerStateService!: TimerStateService;
    timerWidget!: FloatingTimerWidget;

    async onload(): Promise<void> {
        const settings = await this.loadSettings();
        this.injectGlobalCss();

        // --- 依赖注入容器配置 ---

        // [核心修复] 手动初始化 Platform 服务
        const platform = container.resolve(ObsidianPlatform);
        platform.init(this.app); // 手动注入 App 实例
        // 现在，其他任何依赖 ObsidianPlatform 的服务都可以正常工作了

        this.appStore = new AppStore();
        this.appStore.init(this, settings);
        container.registerInstance(AppStore, this.appStore);

        registerStore(this.appStore);

        // 手动初始化 DataStore
        this.dataStore = container.resolve(DataStore);
        this.dataStore.init(platform); // 将已初始化的 platform 注入

        // 解析其他服务
        this.rendererService = container.resolve(RendererService);
        this.timerStateService = container.resolve(TimerStateService);

        this.timerWidget = new FloatingTimerWidget(this);
        this.timerWidget.load();

        this.timerStateService.loadStateFromFile().then(timers => {
            this.appStore.setInitialTimers(timers);
        });

        await this.dataStore.initialScan();

        // --- 功能模块设置 ---
        DashboardFeature.setup?.({
            app: this.app,
            appStore: this.appStore,
            dataStore: this.dataStore,
            rendererService: this.rendererService,
            actionService: container.resolve(ActionService),
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
    }

    onunload(): void {
        document.getElementById(STYLE_TAG_ID)?.remove();
        // [健壮性修复] 确保服务已创建再调用 cleanup
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