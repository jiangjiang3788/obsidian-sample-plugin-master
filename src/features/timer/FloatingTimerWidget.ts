// src/features/timer/FloatingTimerWidget.ts
import { h } from 'preact';
import type ThinkPlugin from '@main';
import { TimerView } from './TimerView';
import { FloatingWidget } from '@/app/public';

export class FloatingTimerWidget {
    private plugin: ThinkPlugin;
    private widget: FloatingWidget | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    public load() {
        if (this.widget) return;

        // 确保服务已就绪
        if (!this.plugin.actionService || !this.plugin.timerService || !this.plugin.dataStore) {
            return;
        }

        this.widget = new FloatingWidget('floating-timer-widget', () =>
            h(TimerView, {
                app: this.plugin.app,
                actionService: this.plugin.actionService!,
                timerService: this.plugin.timerService!,
                dataStore: this.plugin.dataStore!,
            })
        );

        this.widget.load();
    }

    public unload() {
        this.widget?.unload();
        this.widget = null;
    }
}
