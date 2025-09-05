// src/core/services/TimerStateService.ts
import { singleton } from 'tsyringe'; // [核心改造] 导入 singleton
import { App } from 'obsidian';
import { TimerState } from '@state/AppStore';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

/**
 * TimerStateService 负责将计时器的状态持久化到文件中。
 * [核心改造] 使用 @singleton 装饰器
 */
@singleton()
export class TimerStateService {
    // [核心改造] 移除静态实例
    // private static instance: TimerStateService;

    // [核心改造] 构造函数通过 DI 自动接收 App 实例
    constructor(private app: App) {
        // [核心改造] 不再需要 this.instance = this
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