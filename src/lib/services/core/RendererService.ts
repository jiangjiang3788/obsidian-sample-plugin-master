// src/core/services/RendererService.ts
import { singleton, inject } from 'tsyringe';
import { h, render } from 'preact';
import { App } from 'obsidian';
import { Layout } from '@lib/types/domain/schema';
import { DataStore } from './dataStore';
import { AppStore } from '@store/AppStore';
import { LayoutRenderer } from '@views/Dashboard/ui/LayoutRenderer';
import { ActionService } from './ActionService';
import { TaskService } from './taskService';
import { AppToken } from './types';

@singleton()
export class RendererService {
    private isInitialized = false;
    private activeLayouts: { container: HTMLElement; layoutName: string }[] = [];

    // [核心修改] 为构造函数的每个参数添加 @inject 装饰器
    constructor(
        @inject(AppToken) private app: App,
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppStore) private appStore: AppStore,
        @inject(ActionService) private actionService: ActionService,
        @inject(TaskService) private taskService: TaskService
    ) {
        this.appStore.subscribe(() => this.rerenderAll());
        this.isInitialized = true;
    }

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