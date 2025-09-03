// src/main.ts
import { App, Plugin } from 'obsidian';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { registerStore } from '@state/storeRegistry';
import { RendererService } from '@core/services/RendererService';
import { ActionService } from '@core/services/ActionService';
import { TimerStateService } from '@core/services/TimerStateService';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as SettingsFeature from '@features/settings';
import { ThinkSettings, DEFAULT_SETTINGS } from '@core/domain/schema';
import { STYLE_TAG_ID } from '@core/domain/constants';
import { GLOBAL_CSS } from '@features/dashboard/styles/global';
import { InputService } from '@core/services/inputService';
import { TaskService } from '@core/services/taskService';
import { TimerService } from '@core/services/TimerService';

console.log(`[ThinkPlugin] main.js 文件已加载，版本时间: ${new Date().toLocaleTimeString()}`);

export default class ThinkPlugin extends Plugin {
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;
    inputService!: InputService;
    taskService!: TaskService;
    timerService!: TimerService;
    actionService!: ActionService;
    rendererService!: RendererService;
    timerStateService!: TimerStateService;
    timerWidget!: FloatingTimerWidget;

    async onload(): Promise<void> {
        const settings = await this.loadSettings();
        this.injectGlobalCss();

        // --- 服务实例化与依赖注入 ---
        this.platform = new ObsidianPlatform(this.app);
        this.dataStore = new DataStore(this.platform);
        
        this.appStore = new AppStore();
        this.appStore.init(this, settings);
        registerStore(this.appStore);

        this.inputService = new InputService(this.app);
        this.taskService = new TaskService(this.dataStore);
        this.timerService = new TimerService(this.appStore, this.dataStore, this.taskService);
        this.actionService = new ActionService(this.app, this.dataStore, this.appStore, this.inputService, this.timerService);
        this.rendererService = new RendererService(this, this.dataStore, this.appStore, this.actionService);
        this.timerStateService = new TimerStateService(this.app);
        
        this.timerWidget = new FloatingTimerWidget(this);
        this.timerWidget.load();

        this.timerStateService.loadStateFromFile().then(timers => {
            this.appStore.setInitialTimers(timers);
        });

        await this.dataStore.initialScan();

        // --- 功能模块设置 (显式依赖注入) ---
        DashboardFeature.setup?.({
            plugin: this,
            appStore: this.appStore,
            dataStore: this.dataStore,
            rendererService: this.rendererService,
            actionService: this.actionService
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
        this.rendererService.cleanup();
        this.timerWidget?.unload();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);

        merged.dataSources = merged.dataSources || [];
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
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