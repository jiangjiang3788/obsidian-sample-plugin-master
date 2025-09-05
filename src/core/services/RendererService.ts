//src/core/services/RendererService.ts
import { singleton } from 'tsyringe';
import { h, render } from 'preact';
import { App } from 'obsidian';
import { Layout } from '@core/domain/schema';
import { DataStore } from './dataStore';
import { AppStore } from '@state/AppStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';
import { ActionService } from './ActionService';
import { TaskService } from './taskService';

@singleton()
export class RendererService {
    private app!: App;
    private dataStore!: DataStore;
    private appStore!: AppStore;
    private actionService!: ActionService;
    private taskService!: TaskService;
    private isInitialized = false;

    // [核心修复] 构造函数变为空
    constructor() { }

    // [核心修复] 新增 init 方法用于注入所有依赖
    public init(app: App, dataStore: DataStore, appStore: AppStore, actionService: ActionService, taskService: TaskService) {
        if (this.isInitialized) return;
        this.app = app;
        this.dataStore = dataStore;
        this.appStore = appStore;
        this.actionService = actionService;
        this.taskService = taskService;
        this.appStore.subscribe(() => this.rerenderAll());
        this.isInitialized = true;
    }

    private activeLayouts: { container: HTMLElement; layoutName: string }[] = [];

    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        render(
            h(LayoutRenderer, {
                layout: layout,
                dataStore: this.dataStore,
                app: this.app,
                actionService: this.actionService,
                taskService: this.taskService,
            }),
            container,
        );

        this.activeLayouts.push({ container, layoutName: layout.name });
    }

    public unregister(container: HTMLElement): void {
        const index = this.activeLayouts.findIndex(l => l.container === container);
        if (index > -1) {
            try {
                render(null, container);
            } catch (e) {
                // 捕获异常
            }
            container.empty();
            this.activeLayouts.splice(index, 1);
        }
    }

    private rerenderAll(): void {
        if (!this.isInitialized) return;
        const latestSettings = this.appStore.getSettings();

        for (const activeLayout of [...this.activeLayouts]) {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = latestSettings.layouts.find(l => l.name === layoutName);

            if (newLayoutConfig) {
                render(
                    h(LayoutRenderer, {
                        layout: newLayoutConfig,
                        dataStore: this.dataStore,
                        app: this.app,
                        actionService: this.actionService,
                        taskService: this.taskService,
                    }),
                    container,
                );
            } else {
                this.unregister(container);
                container.createDiv({ text: `布局配置 "${layoutName}" 已被删除。` });
            }
        }
    }

    public cleanup(): void {
        [...this.activeLayouts].forEach(layout => this.unregister(layout.container));
        this.activeLayouts = [];
    }
}