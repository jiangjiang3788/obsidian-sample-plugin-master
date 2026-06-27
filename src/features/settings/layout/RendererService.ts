// src/core/services/RendererService.ts
/**
 * RendererService - 活动布局的增量重渲染服务。
 *
 * - Zustand 只订阅 layouts/viewInstances 两个引用。
 * - 每个活动 Layout 独立维护渲染签名。
 * - 未被当前 Layout 引用的 ViewInstance 变化不会触发该 Layout 重渲染。
 */
import { h, render } from 'preact';
import type { Layout, ViewInstance } from '@core/public';
import {
    ActionService,
    DataStore,
    InputService,
    ItemService,
    devError,
    devLog,
} from '@core/public';
import { ServicesProvider, type Services, validateServices as validateServicesImpl } from '@/app/public';
import type { TimerController } from '@shared/public';
import { LayoutRenderer } from '@features/settings/layout/LayoutRenderer';
import type { UseCases } from '@/app/public';
import {
    getZustandState,
    subscribeZustandStore,
    type ZustandAppStore,
    type AppStoreInstance,
} from '@/app/public';
import { createLayoutRenderSignature } from './layoutRenderSignature';

interface ActiveLayoutRender {
    container: HTMLElement;
    layoutId: string;
    layoutName: string;
    signature: string;
}

interface RendererSettingsSlice {
    layouts: Layout[];
    viewInstances: ViewInstance[];
}

export class RendererService {
    private isInitialized = false;
    private activeLayouts: ActiveLayoutRender[] = [];
    private services: Services;
    private unsubscribeZustand: (() => void) | null = null;
    private store: AppStoreInstance;

    constructor(
        private app: any,
        private dataStore: DataStore,
        private actionService: ActionService,
        private itemService: ItemService,
        private inputService: InputService,
        private timerService: TimerController,
        private useCases: UseCases,
        private uiPort: Services['uiPort'],
        private modalPort: Services['modalPort'],
        private messageRenderPort: Services['messageRenderPort'],
        store: AppStoreInstance
    ) {
        this.store = store;
        this.services = {
            zustandStore: this.store,
            dataStore: this.dataStore,
            inputService: this.inputService,
            useCases: this.useCases,
            uiPort: this.uiPort,
            modalPort: this.modalPort,
            messageRenderPort: this.messageRenderPort,
        };

        this.validateServices();
        this.setupZustandSubscription();
        this.isInitialized = true;
    }

    private validateServices(): void {
        validateServicesImpl(this.services, 'RendererService');
    }

    private setupZustandSubscription(): void {
        try {
            this.unsubscribeZustand = subscribeZustandStore(
                this.store,
                (state: ZustandAppStore): RendererSettingsSlice => ({
                    layouts: state.settings.layouts,
                    viewInstances: state.settings.viewInstances,
                }),
                (current: RendererSettingsSlice) => {
                    this.rerenderChangedLayouts(current);
                },
                {
                    equalityFn: (left, right) => (
                        left.layouts === right.layouts
                        && left.viewInstances === right.viewInstances
                    ),
                }
            );

            devLog('[RendererService] 活动布局增量订阅已建立');
        } catch (error) {
            devError('[RendererService] Zustand 订阅失败:', error);
        }
    }

    private renderLayout(container: HTMLElement, layout: Layout): void {
        render(
            h(ServicesProvider, {
                services: this.services,
                children: h(LayoutRenderer, {
                    layout,
                    dataStore: this.dataStore,
                    app: this.app,
                    actionService: this.actionService,
                    itemService: this.itemService,
                    timerService: this.timerService,
                }),
            }),
            container,
        );
    }

    public register(container: HTMLElement, layout: Layout): void {
        this.unregister(container);

        const settings = getZustandState(this.store, (state) => state.settings);
        const latestLayout = settings.layouts.find((candidate: Layout) => candidate.id === layout.id) ?? layout;
        const signature = createLayoutRenderSignature(latestLayout, settings.viewInstances);

        this.renderLayout(container, latestLayout);
        this.activeLayouts.push({
            container,
            layoutId: latestLayout.id,
            layoutName: latestLayout.name,
            signature,
        });
    }

    public unregister(container: HTMLElement): void {
        const index = this.activeLayouts.findIndex((layout) => layout.container === container);
        if (index < 0) return;

        try {
            render(null, container);
        } catch {
            // 宿主容器可能已被 Obsidian 提前销毁。
        }
        container.empty();
        this.activeLayouts.splice(index, 1);
    }

    private rerenderChangedLayouts(settings: RendererSettingsSlice): void {
        if (!this.isInitialized) return;

        for (const activeLayout of [...this.activeLayouts]) {
            const nextLayout = settings.layouts.find((layout) => layout.id === activeLayout.layoutId);
            if (!nextLayout) {
                const { container, layoutName } = activeLayout;
                this.unregister(container);
                container.createDiv({ text: `布局配置 "${layoutName}" 已被删除。` });
                continue;
            }

            const nextSignature = createLayoutRenderSignature(nextLayout, settings.viewInstances);
            if (nextSignature === activeLayout.signature) continue;

            this.renderLayout(activeLayout.container, nextLayout);
            activeLayout.layoutName = nextLayout.name;
            activeLayout.signature = nextSignature;
            devLog(`[RendererService] 已增量刷新布局: ${nextLayout.id}`);
        }
    }

    public cleanup(): void {
        if (this.unsubscribeZustand) {
            this.unsubscribeZustand();
            this.unsubscribeZustand = null;
            devLog('[RendererService] Zustand 订阅已取消');
        }

        [...this.activeLayouts].forEach((layout) => this.unregister(layout.container));
        this.activeLayouts = [];
    }
}
