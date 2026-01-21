// src/app/capabilities/capabilities/timer.ts
import type { App } from 'obsidian';
import type { ThinkSettings } from '@core/public';

export interface TimerCapability {
    /**
     * 计时相关能力（示例能力）
     */
    start(): void;
    stop(): void;
}

export function createTimerCapability(_app: App, _settings: ThinkSettings): TimerCapability {
    return {
        start() {
            console.warn('[TimerCapability] start() not wired yet. Wire in main/app composition root.');
        },
        stop() {
            console.warn('[TimerCapability] stop() not wired yet. Wire in main/app composition root.');
        },
    };
}
