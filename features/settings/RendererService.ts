// src/core/services/RendererService.ts
import { singleton, inject } from 'tsyringe';
import { h, render } from 'preact';
import { App } from 'obsidian';
import { Layout } from '@/core/types/schema';
import { DataStore } from '@core/services/DataStore';
import { AppStore } from '@/app/AppStore';
import { LayoutRenderer } from '@/features/settings/LayoutRenderer';
import { ActionService } from '../../core/services/ActionService';
import { ItemService } from '@core/services/ItemService';
import { TimerService } from '@features/timer/TimerService';
import { AppToken } from '@core/services/types';

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
        @inject(ItemService) private itemService: ItemService,
        @inject(TimerService) private timerService: TimerService
    ) {
        this.appStore.subscribe(() => this.rerenderAll());
        this.isInitialized = true;
    }

    /**
     * [主流程] 注册并渲染布局
     * 将指定的布局配置渲染到目标容器中，并加入活跃布局列表进行管理。
     */
    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        render(
            h(LayoutRenderer, {
                layout: layout,
                dataStore: this.dataStore,
                app: this.app,
                actionService: this.actionService,
                itemService: this.itemService,
                timerService: this.timerService,
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

    /**
     * [主流程] 重新渲染所有布局
     * 当 AppStore 设置发生变更时触发，更新所有活跃的布局视图。
     */
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
                        itemService: this.itemService,
                        timerService: this.timerService,
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
