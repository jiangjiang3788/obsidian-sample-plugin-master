// src/features/timer/FloatingTimerWidget.ts
import { render, h } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type ThinkPlugin from '../../main';
import { TimerView } from './ui/TimerView';
import { DEBUG_MODE } from '../../main'; // [新增] 导入调试开关

/**
 * FloatingTimerWidget 负责管理浮动计时器UI的DOM容器和Preact组件的生命周期。
 */
export class FloatingTimerWidget {
    private plugin: ThinkPlugin;
    private containerEl: HTMLElement | null = null;
    // [确认移除] storeUnsubscribe 已被移除

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

        // [确认移除] AppStore.instance.subscribe 已被移除
    }

    public unload() {
        // [确认移除] unsubscribe 调用已移除
        if (this.containerEl) {
            // 从DOM中卸载Preact组件
            unmountComponentAtNode(this.containerEl);
            // 移除DOM容器
            this.containerEl.remove();
        }
    }

    private render() {
        // [新增] 添加调试日志
        if (DEBUG_MODE) console.log('[FloatingTimerWidget] 正在渲染浮动组件...');

        if (!this.containerEl || !this.plugin.actionService) {
            return;
        }
        
        // 渲染 TimerView 组件到我们创建的容器中
        const component = h(TimerView, { actionService: this.plugin.actionService });
        render(component, this.containerEl);
    }
}