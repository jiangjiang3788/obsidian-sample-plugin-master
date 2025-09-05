// src/core/services/RendererService.ts
import { singleton } from 'tsyringe';
import { h, render } from 'preact';
import { Layout } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';
import { App } from 'obsidian'; // [核心修改 ①] 导入 App 类型
import type { ActionService } from './ActionService';
import type { TaskService } from './taskService';

interface ActiveLayout {
    container: HTMLElement;
    layoutName: string;
}

@singleton()
export class RendererService {
    // [核心修改 ②] 构造函数不再注入 ThinkPlugin，而是直接注入 App
    // 这就打破了 ThinkPlugin -> RendererService -> ThinkPlugin 的循环依赖
    constructor(
        private app: App,
        private dataStore: DataStore,
        private appStore: AppStore,
        private actionService: ActionService,
        private taskService: TaskService
    ) {
        this.appStore.subscribe(() => this.rerenderAll());
    }

    private activeLayouts: ActiveLayout[] = [];

    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        render(
            h(LayoutRenderer, {
                layout: layout,
                dataStore: this.dataStore,
                app: this.app, // [核心修改 ③] 直接传递 app 实例
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
        const latestSettings = this.appStore.getSettings();

        for (const activeLayout of [...this.activeLayouts]) {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = latestSettings.layouts.find(l => l.name === layoutName);

            if (newLayoutConfig) {
                render(
                    h(LayoutRenderer, {
                        layout: newLayoutConfig,
                        dataStore: this.dataStore,
                        app: this.app, // [核心修改 ④] 直接传递 app 实例
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