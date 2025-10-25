// src/features/timer/FloatingTimerWidget.ts
import { render, h } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type ThinkPlugin from '../../main';
import { TimerView } from './ui/TimerView';

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
        if (!this.containerEl || !this.plugin.actionService || !this.plugin.timerService || !this.plugin.dataStore) {
            return;
        }

        // [修改] 将所有需要的服务实例作为 props 传递给 TimerView
        const component = h(TimerView, { 
            app: this.plugin.app,
            actionService: this.plugin.actionService,
            timerService: this.plugin.timerService,
            dataStore: this.plugin.dataStore,
        });
        render(component, this.containerEl);
    }
}