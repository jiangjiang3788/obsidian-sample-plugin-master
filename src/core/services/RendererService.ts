// src/core/services/RendererService.ts
import { h, render } from 'preact';
import { Layout } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';
import type ThinkPlugin from '../../main';
import type { ActionService } from './ActionService'; // [新增] 导入 ActionService 类型

interface ActiveLayout {
    container: HTMLElement;
    layoutName: string;
}

export class RendererService {
    static instance: RendererService;

    // [修改] 构造函数现在接收 ActionService
    constructor(
        private plugin: ThinkPlugin,
        private dataStore: DataStore,
        private appStore: AppStore,
        private actionService: ActionService, // 新增依赖
    ) {
        if (RendererService.instance) {
            return RendererService.instance;
        }

        this.appStore.subscribe(() => this.rerenderAll());
        RendererService.instance = this;
    }

    private activeLayouts: ActiveLayout[] = [];

    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        // [修改] 渲染组件时，将 actionService 传递下去
        render(
            h(LayoutRenderer, {
                layout: layout,
                dataStore: this.dataStore,
                plugin: this.plugin,
                actionService: this.actionService, // 传递 actionService
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
                // [修改] 重新渲染时，也要将 actionService 传递下去
                render(
                    h(LayoutRenderer, {
                        layout: newLayoutConfig,
                        dataStore: this.dataStore,
                        plugin: this.plugin,
                        actionService: this.actionService, // 传递 actionService
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