// src/core/services/RendererService.ts
import { h, render } from 'preact';
import { Layout } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';
import type ThinkPlugin from '../../main';

interface ActiveLayout {
    container: HTMLElement;
    layoutName: string;
}

/**
 * @class RendererService
 * @description 单例服务，负责管理所有活动视图（例如在代码块中渲染的布局）的生命周期。
 * 1. 注册和注销活动布局。
 * 2. 订阅 AppStore 的状态变化。
 * 3. 当设置变化时，自动重新渲染所有受影响的布局。
 * 4. 在插件卸载时，统一清理所有渲染的组件。
 */
export class RendererService {
    static instance: RendererService;

    private activeLayouts: ActiveLayout[] = [];

    // [新增] 依赖注入 DataStore 和 AppStore
    constructor(
        private plugin: ThinkPlugin, // 依然需要 plugin 实例来传递给 LayoutRenderer
        private dataStore: DataStore,
        private appStore: AppStore,
    ) {
        if (RendererService.instance) {
            return RendererService.instance;
        }
        
        // [核心] 订阅 AppStore 的变化，当设置更新时自动调用 rerenderAll
        this.appStore.subscribe(() => this.rerenderAll());
        RendererService.instance = this;
    }

    /**
     * 注册一个新的布局实例，进行初次渲染并纳入管理。
     * @param container - 承载Preact组件的HTML元素。
     * @param layout - 要渲染的布局配置。
     */
    public register(container: HTMLElement, layout: Layout): void {
        console.log(`[RendererService] Registering layout: "${layout.name}"`);
        // 确保同一个容器不会被重复注册
        this.unregister(container);

        // 渲染组件
        render(
            h(LayoutRenderer, {
                layout: layout,
                dataStore: this.dataStore,
                plugin: this.plugin,
            }),
            container,
        );

        // 添加到活动布局列表
        this.activeLayouts.push({ container, layoutName: layout.name });
    }

    /**
     * 注销一个布局实例，从DOM中卸载组件并移出管理列表。
     * @param container - 目标HTML元素。
     */
    public unregister(container: HTMLElement): void {
        const index = this.activeLayouts.findIndex(l => l.container === container);
        if (index > -1) {
            const { layoutName } = this.activeLayouts[index];
            console.log(`[RendererService] Unregistering layout: "${layoutName}"`);
            
            try {
                render(null, container); // 卸载 Preact 组件
            } catch (e) {
                // 捕获异常，以防容器已被Obsidian销毁
            }
            container.empty(); // 清空容器
            
            this.activeLayouts.splice(index, 1);
        }
    }

    /**
     * 当设置变化时，重新渲染所有当前活动的布局。
     */
    private rerenderAll(): void {
        console.log('[RendererService] Settings changed, rerendering all active layouts...');
        const latestSettings = this.appStore.getSettings();

        // 使用 for...of 循环来处理，因为它比 forEach 更易于阅读和调试
        for (const activeLayout of [...this.activeLayouts]) {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = latestSettings.layouts.find(l => l.name === layoutName);

            if (newLayoutConfig) {
                // 如果布局配置依然存在，则重新渲染
                console.log(`  - Rerendering "${layoutName}"`);
                render(
                    h(LayoutRenderer, {
                        layout: newLayoutConfig,
                        dataStore: this.dataStore,
                        plugin: this.plugin,
                    }),
                    container,
                );
            } else {
                // 如果布局配置被删除了，则注销并显示提示信息
                console.log(`  - Layout "${layoutName}" was deleted, unregistering.`);
                this.unregister(container);
                container.createDiv({ text: `布局配置 "${layoutName}" 已被删除。` });
            }
        }
    }
    
    /**
     * 在插件卸载时调用，清理所有活动的布局。
     */
    public cleanup(): void {
        console.log('[RendererService] Cleaning up all active layouts.');
        // 创建一个副本进行迭代，因为 unregister 会修改原始数组
        [...this.activeLayouts].forEach(layout => this.unregister(layout.container));
        this.activeLayouts = [];
    }
}