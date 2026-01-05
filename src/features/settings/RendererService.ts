// src/core/services/RendererService.ts
import { singleton, inject } from 'tsyringe';
import { h, render } from 'preact';
import { App } from 'obsidian';
import { Layout } from '@/core/types/schema';
import { DataStore } from '@core/services/DataStore';
import { AppStore } from '@/app/AppStore';
import { ServicesProvider, type Services } from '@/app/AppStoreContext';
import { LayoutRenderer } from '@/features/settings/LayoutRenderer';
import { ActionService } from '../../core/services/ActionService';
import { ItemService } from '@core/services/ItemService';
import { InputService } from '@core/services/InputService';
import { TimerService } from '@features/timer/TimerService';
import { AppToken } from '@core/services/types';
import { USECASES_TOKEN, type UseCases } from '@/app/usecases';

@singleton()
export class RendererService {
    private isInitialized = false;
    private activeLayouts: { container: HTMLElement; layoutName: string }[] = [];
    
    // 缓存的 Services 对象，用于 ServicesProvider
    private services: Services;

    // [核心修改] 为构造函数的每个参数添加 @inject 装饰器
    constructor(
        @inject(AppToken) private app: App,
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppStore) private appStore: AppStore,
        @inject(ActionService) private actionService: ActionService,
        @inject(ItemService) private itemService: ItemService,
        @inject(InputService) private inputService: InputService,
        @inject(TimerService) private timerService: TimerService,
        @inject(USECASES_TOKEN) private useCases: UseCases
    ) {
        // 构建 Services 对象，供 ServicesProvider 使用
        this.services = {
            appStore: this.appStore,
            dataStore: this.dataStore,
            inputService: this.inputService,
            useCases: this.useCases,
        };
        
        // 运行时校验：确保所有服务都已正确注入
        this.validateServices();
        
        this.appStore.subscribe(() => this.rerenderAll());
        this.isInitialized = true;
    }
    
    /**
     * 运行时校验 Services 完整性
     * 防止"传 undefined 但运行到深处才爆"
     */
    private validateServices(): void {
        const missing: string[] = [];
        if (!this.services.appStore) missing.push('appStore');
        if (!this.services.dataStore) missing.push('dataStore');
        if (!this.services.inputService) missing.push('inputService');
        if (!this.services.useCases) missing.push('useCases');
        
        if (missing.length > 0) {
            throw new Error(
                `[RendererService] Services 校验失败: 缺少 ${missing.join(', ')}。\n` +
                `请检查 ServiceManager 是否正确初始化了所有服务，以及 DI 容器是否正确注册。`
            );
        }
    }

    /**
     * [主流程] 注册并渲染布局
     * 将指定的布局配置渲染到目标容器中，并加入活跃布局列表进行管理。
     * 
     * ⚠️ P0 修复：使用 ServicesProvider 替代 AppStoreProvider，
     * 确保 LayoutRenderer 及其子组件可以访问 useUseCases/useDataStore/useInputService
     */
    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        render(
            h(ServicesProvider, { services: this.services, children: 
                h(LayoutRenderer, {
                    layout: layout,
                    dataStore: this.dataStore,
                    app: this.app,
                    actionService: this.actionService,
                    itemService: this.itemService,
                    timerService: this.timerService,
                })
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
     * 
     * ⚠️ P0 修复：使用 ServicesProvider 替代 AppStoreProvider
     */
    private rerenderAll(): void {
        if (!this.isInitialized) return;
        const latestSettings = this.appStore.getSettings();

        for (const activeLayout of [...this.activeLayouts]) {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = latestSettings.layouts.find(l => l.name === layoutName);

            if (newLayoutConfig) {
                render(
                    h(ServicesProvider, { services: this.services, children:
                        h(LayoutRenderer, {
                            layout: newLayoutConfig,
                            dataStore: this.dataStore,
                            app: this.app,
                            actionService: this.actionService,
                            itemService: this.itemService,
                            timerService: this.timerService,
                        })
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
