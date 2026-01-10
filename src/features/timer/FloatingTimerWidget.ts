// src/features/timer/FloatingTimerWidget.ts
import { render, h, Fragment } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type ThinkPlugin from '@main';
import { TimerView } from './TimerView';
import { ServicesProvider, type Services } from '@/app/AppStoreContext';
import { container } from 'tsyringe';
import { STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
import { USECASES_TOKEN, type UseCases } from '@/app/usecases';

export class FloatingTimerWidget {
    private plugin: ThinkPlugin;
    private containerEl: HTMLElement | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    public load() {
        this.containerEl = document.createElement('div');
        this.containerEl.id = 'think-plugin-floating-timer-container';
        document.body.appendChild(this.containerEl);

        this.render();
    }

    public unload() {
        if (this.containerEl) {
            unmountComponentAtNode(this.containerEl);
            this.containerEl.remove();
        }
    }

    private render() {
        // [修改] 增加检查，确保所有需要的服务都已加载
        if (!this.containerEl || !this.plugin.actionService || !this.plugin.timerService || !this.plugin.dataStore || !this.plugin.inputService) {
            return;
        }

        console.log('[FloatingTimerWidget] render 执行：actionService / dataStore 已就绪');

        // 构建 services 对象，包含 zustandStore
        const services: Services = {
            zustandStore: container.resolve<AppStoreInstance>(STORE_TOKEN),
            dataStore: this.plugin.dataStore,
            inputService: this.plugin.inputService,
            useCases: container.resolve<UseCases>(USECASES_TOKEN),
        };

        // [修改] 将所有需要的服务实例作为 props 传递给 TimerView
        const timerViewElement = h(TimerView, { 
            app: this.plugin.app,
            actionService: this.plugin.actionService,
            timerService: this.plugin.timerService,
            dataStore: this.plugin.dataStore,
        });
        const component = h(
            ServicesProvider,
            { services, children: timerViewElement }
        );
        render(component, this.containerEl);
    }
}
