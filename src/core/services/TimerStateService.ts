// src/core/services/TimerStateService.ts
import { singleton } from 'tsyringe';
import { App } from 'obsidian';
import { TimerState } from '@state/AppStore';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

@singleton()
export class TimerStateService {
    private app!: App;

    // [核心修复] 构造函数变为空
    constructor() {}

    // [核心修复] 新增 init 方法
    public init(app: App) {
        this.app = app;
    }

    async loadStateFromFile(): Promise<TimerState[]> {
        try {
            const fileExists = await this.app.vault.adapter.exists(TIMER_STATE_PATH);
            if (!fileExists) {
                return [];
            }
            const content = await this.app.vault.adapter.read(TIMER_STATE_PATH);
            if (!content) {
                return [];
            }
            const timers = JSON.parse(content);
            return Array.isArray(timers) ? timers : [];
        } catch (error) {
            console.error('Think Plugin: Failed to load timer state from file.', error);
            return [];
        }
    }

    async saveStateToFile(timers: TimerState[]): Promise<void> {
        try {
            const content = JSON.stringify(timers, null, 2);
            await this.app.vault.adapter.write(TIMER_STATE_PATH, content);
        } catch (error) {
            console.error('Think Plugin: Failed to save timer state to file.', error);
        }
    }
}