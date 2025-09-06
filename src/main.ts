// src/main.ts
import "reflect-metadata";
import { container } from 'tsyringe';
import { App, Plugin, Notice } from 'obsidian';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore, RendererService, ActionService, TimerStateService, InputService, TaskService, TimerService } from '@core/services';
import { AppStore } from '@state/AppStore';
import { registerStore, registerDataStore, registerTimerService } from '@state/storeRegistry';
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
    actionService!: ActionService;
    timerService!: TimerService;
    timerStateService!: TimerStateService;
    timerWidget!: FloatingTimerWidget;

    async onload(): Promise<void> {
        try {
            // --- 步骤 1: 立即执行的部分 ---
            // 这部分代码需要同步执行，用于构建服务实例和它们之间的基础连接。
            const settings = await this.loadSettings();
            this.injectGlobalCss();

            // 解析所有服务实例
            const platform = container.resolve(ObsidianPlatform);
            const dataStore = container.resolve(DataStore);
            const inputService = container.resolve(InputService);
            const taskService = container.resolve(TaskService);
            const timerService = container.resolve(TimerService);
            const actionService = container.resolve(ActionService);
            const rendererService = container.resolve(RendererService);
            const timerStateService = container.resolve(TimerStateService);

            // 挂载核心服务实例
            this.dataStore = dataStore;
            this.rendererService = rendererService;
            this.actionService = actionService;
            this.timerService = timerService;
            this.timerStateService = timerStateService;

            // 创建并注册 AppStore
            this.appStore = new AppStore();
            container.registerInstance(AppStore, this.appStore);

            // 按照依赖顺序，手动调用 init() 方法，完成服务间的“接线”
            platform.init(this.app);
            inputService.init(this.app);
            timerStateService.init(this.app);
            this.appStore.init(this, settings);
            dataStore.init(platform);
            taskService.init(dataStore);
            timerService.init(this.appStore, dataStore, taskService, inputService, this.app);
            actionService.init(this.app, dataStore, this.appStore, inputService, timerService);
            rendererService.init(this.app, dataStore, this.appStore, actionService, taskService);

            // --- 步骤 2: 延迟执行的部分 ---
            // 使用 setTimeout 0 将这部分任务推迟到下一个事件循环，以避免与Obsidian启动过程中的其他任务发生冲突。
            // 这是解决移动端时序问题的关键。
            setTimeout(async () => {
                // 注册全局可访问的服务
                registerStore(this.appStore);
                registerDataStore(this.dataStore);
                registerTimerService(this.timerService);

                // 加载UI组件和数据
                this.timerWidget = new FloatingTimerWidget(this);
                this.timerWidget.load();

                timerStateService.loadStateFromFile().then(timers => {
                    this.appStore.setInitialTimers(timers);
                });
                
                // 等待全库扫描完成
                await dataStore.initialScan();

                // 设置功能模块，这会注册代码块处理器等
                DashboardFeature.setup?.({
                    plugin: this,
                    appStore: this.appStore,
                    dataStore: dataStore,
                    rendererService: rendererService,
                    actionService: actionService,
                    taskService: taskService
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