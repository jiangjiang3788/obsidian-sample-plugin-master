// src/features/timer/FloatingTimerWidget.ts
import { render, h } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type ThinkPlugin from '../../main';
import { TimerView } from './ui/TimerView';

/**
 * FloatingTimerWidget 负责管理浮动计时器UI的DOM容器和Preact组件的生命周期。
 */
export class FloatingTimerWidget {
    private plugin: ThinkPlugin;
    private containerEl: HTMLElement | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    public load() {
        // 1. 创建一个 div 作为 Preact 组件的挂载点
        this.containerEl = document.createElement('div');
        this.containerEl.id = 'think-plugin-floating-timer-container';
        // 2. 将其附加到 document.body
        document.body.appendChild(this.containerEl);

        this.render();
    }

    public unload() {
        if (this.containerEl) {
            // 从DOM中卸载Preact组件
            unmountComponentAtNode(this.containerEl);
            // 移除DOM容器
            this.containerEl.remove();
        }
    }

    private render() {
        if (!this.containerEl || !this.plugin.actionService) {
            return;
        }

        // 渲染 TimerView 组件到我们创建的容器中
        const component = h(TimerView, { actionService: this.plugin.actionService });
        render(component, this.containerEl);
    }
}