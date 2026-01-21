// src/core/services/RendererService.ts
/**
 * RendererService - 使用 Zustand 精准订阅
 * 
 * 改动说明：
 * - 使用 Zustand store.subscribe(selector, listener) 精准订阅 layouts + viewInstances
 * - 只在 layout/viewInstances 变化时触发 rerenderAll()
 * - 在 cleanup 时取消订阅，避免内存泄漏
 */
import { singleton, inject } from 'tsyringe';
import { h, render } from 'preact';
import { App } from 'obsidian';
import { Layout } from '@core/public';
import { DataStore } from '@core/public';
import { ServicesProvider, type Services } from '@/app/public';
import { LayoutRenderer } from '@/features/settings/LayoutRenderer';
import { ActionService } from '../../core/services/ActionService';
import { ItemService } from '@core/public';
import { InputService } from '@core/public';
import { TimerService } from '@features/timer/TimerService';
import { AppToken } from '@core/public';
import { USECASES_TOKEN, type UseCases } from '@/app/public';
import { getZustandState, subscribeZustandStore, STORE_TOKEN, type ZustandAppStore, type AppStoreInstance } from '@/app/public';

@singleton()
export class RendererService {
    private isInitialized = false;
    private activeLayouts: { container: HTMLElement; layoutName: string }[] = [];
    
    // 缓存的 Services 对象，用于 ServicesProvider
    private services: Services;
    
    // S8.1: Zustand 订阅取消函数
    private unsubscribeZustand: (() => void) | null = null;
    
    // P0-3: store 从 DI 注入
    private store: AppStoreInstance;

    constructor(
        @inject(AppToken) private app: App,
        @inject(DataStore) private dataStore: DataStore,
        @inject(ActionService) private actionService: ActionService,
        @inject(ItemService) private itemService: ItemService,
        @inject(InputService) private inputService: InputService,
        @inject(TimerService) private timerService: TimerService,
        @inject(USECASES_TOKEN) private useCases: UseCases,
        @inject(STORE_TOKEN) store: AppStoreInstance
    ) {
        this.store = store;
        // 构建 Services 对象，供 ServicesProvider 使用
        this.services = {
            zustandStore: this.store,
            dataStore: this.dataStore,
            inputService: this.inputService,
            useCases: this.useCases,
        };
        
        // 运行时校验：确保所有服务都已正确注入
        this.validateServices();
        
        // S8.1: 使用 Zustand 精准订阅替代 appStore.subscribe
        this.setupZustandSubscription();
        
        this.isInitialized = true;
    }
    
    /**
     * 运行时校验 Services 完整性
     * 防止"传 undefined 但运行到深处才爆"
     * Z3: 移除 appStore 校验
     */
    private validateServices(): void {
        const missing: string[] = [];
        if (!this.services.zustandStore) missing.push('zustandStore');
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
     * S8.1: 设置 Zustand 精准订阅
     * 只监听 layouts 和 viewInstances 的变化，避免其他 settings 变化导致全量 rerender
     * P0-3: 使用 DI 注入的 store，通过纯函数 subscribeZustandStore 订阅
     */
    private setupZustandSubscription(): void {
        try {
            // P0-3: 使用纯函数版本，显式传入 store
            this.unsubscribeZustand = subscribeZustandStore(
                this.store,
                // Selector: 提取 layouts 和 viewInstances
                (state: ZustandAppStore) => ({
                    layouts: state.settings.layouts,
                    viewInstances: state.settings.viewInstances,
                }),
                // Listener: 当 selector 返回值变化时触发
                (current: { layouts: any[]; viewInstances: any[] }, previous: { layouts: any[]; viewInstances: any[] }) => {
                    // 使用 JSON.stringify 进行深度比较
                    const currentSnapshot = JSON.stringify(current);
                    const previousSnapshot = JSON.stringify(previous);
                    
                    if (currentSnapshot !== previousSnapshot) {
                        console.log('[RendererService] layouts/viewInstances 变化，触发 rerenderAll');
                        this.rerenderAll();
                    }
                },
                // Options: 使用 shallow 比较（但我们在 listener 内做深度比较）
                { equalityFn: (a: any, b: any) => a === b }
            );
            
            console.log('[RendererService] Zustand 精准订阅已建立');
        } catch (error) {
            console.error('[RendererService] Zustand 订阅失败:', error);
        }
    }

    /**
     * [主流程] 注册并渲染布局
     * 将指定的布局配置渲染到目标容器中，并加入活跃布局列表进行管理。
     * 
     * ⚠️ P0 修复：使用 ServicesProvider 注入依赖，
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
     * S8.1: 由 Zustand 精准订阅触发，只在 layouts/viewInstances 变化时调用
     */
    private rerenderAll(): void {
        if (!this.isInitialized) return;
        
        // P0-3: 使用 DI 注入的 store，通过纯函数 getZustandState 获取状态
        const latestSettings = getZustandState(this.store, s => s.settings);

        for (const activeLayout of [...this.activeLayouts]) {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = latestSettings.layouts.find((l: Layout) => l.name === layoutName);

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

    /**
     * 清理所有服务资源
     * S8.1: 取消 Zustand 订阅，避免内存泄漏
     */
    public cleanup(): void {
        // S8.1: 取消 Zustand 订阅
        if (this.unsubscribeZustand) {
            this.unsubscribeZustand();
            this.unsubscribeZustand = null;
            console.log('[RendererService] Zustand 订阅已取消');
        }
        
        [...this.activeLayouts].forEach(layout => this.unregister(layout.container));
        this.activeLayouts = [];
    }
}
