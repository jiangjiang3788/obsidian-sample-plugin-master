// src/features/timer/TimerWidget.ts
import { render, h } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type ThinkPlugin from '@main';
import { TimerView } from './TimerView';

/**
 * TimerWidget 负责管理状态栏中计时器UI元素的整个生命周期。
 */
export class TimerWidget {
    private plugin: ThinkPlugin;
    private statusBarEl: HTMLElement | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    /**
     * 加载挂件：创建DOM元素，挂载Preact组件，并订阅状态变化。
     */
    public load() {
        // 创建一个将要放置在状态栏的容器元素
        this.statusBarEl = this.plugin.addStatusBarItem();
        this.statusBarEl.addClass('think-plugin-timer-widget');

        // 首次渲染
        this.render();
    }

    /**
     * 卸载挂件：从DOM中移除，清理资源。
     */
    public unload() {
        // 从状态栏移除DOM元素
        if (this.statusBarEl) {
            // 卸载Preact组件
            unmountComponentAtNode(this.statusBarEl);
            this.statusBarEl.remove();
        }
    }

    /**
     * 渲染/重渲染 Preact 组件。
     */
    private render() {
        if (!this.statusBarEl || !this.plugin.actionService) {
            return;
        }

        // 使用 Preact 将 TimerView 组件渲染到状态栏的DOM元素中
        // 我们需要将 actionService 实例传递给组件，以便处理“编辑”按钮的点击事件
        const component = h(TimerView, { actionService: this.plugin.actionService });
        render(component, this.statusBarEl);
    }
}
