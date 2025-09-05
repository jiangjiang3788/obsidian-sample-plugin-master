//src/main.ts
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
    actionService!: ActionService;
    timerService!: TimerService;
    timerStateService!: TimerStateService;
    timerWidget!: FloatingTimerWidget;

    async onload(): Promise<void> {
        const settings = await this.loadSettings();
        this.injectGlobalCss();

        // --- 依赖注入容器配置 (核心改造) ---

        // 1. 从容器中解析出所有服务实例 (此时构造函数都是空的，所以不会出错)
        const platform = container.resolve(ObsidianPlatform);
        const dataStore = container.resolve(DataStore);
        const inputService = container.resolve(InputService);
        const taskService = container.resolve(TaskService);
        const timerService = container.resolve(TimerService);
        const actionService = container.resolve(ActionService);
        const rendererService = container.resolve(RendererService);
        const timerStateService = container.resolve(TimerStateService);

        // 将核心服务实例挂载到 plugin 对象上，以便其他地方访问
        this.dataStore = dataStore;
        this.rendererService = rendererService;
        this.actionService = actionService;
        this.timerService = timerService;
        this.timerStateService = timerStateService;

        // 2. 手动创建 AppStore 并注册到容器
        this.appStore = new AppStore();
        container.registerInstance(AppStore, this.appStore);

        // 3. 按照依赖顺序，手动调用 init() 方法，完成“接线”
        //    顺序: 无依赖 -> 依赖 platform/app -> 依赖其他服务
        platform.init(this.app);
        inputService.init(this.app);
        timerStateService.init(this.app);
        this.appStore.init(this, settings); // AppStore 也需要初始化

        dataStore.init(platform);
        taskService.init(dataStore);

        // TimerService 依赖 AppStore, DataStore, TaskService, InputService, App
        timerService.init(this.appStore, dataStore, taskService, inputService, this.app);

        // ActionService 依赖 App, DataStore, AppStore, InputService, TimerService
        actionService.init(this.app, dataStore, this.appStore, inputService, timerService);

        // RendererService 依赖 App, DataStore, AppStore, ActionService, TaskService
        rendererService.init(this.app, dataStore, this.appStore, actionService, taskService);

        // --- 初始化完成，开始执行业务逻辑 ---

        registerStore(this.appStore);

        this.timerWidget = new FloatingTimerWidget(this);
        this.timerWidget.load();

        timerStateService.loadStateFromFile().then(timers => {
            this.appStore.setInitialTimers(timers);
        });

        await dataStore.initialScan();

        // --- 功能模块设置 ---
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