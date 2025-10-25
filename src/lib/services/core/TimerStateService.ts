// src/core/services/TimerStateService.ts
import { singleton, inject } from 'tsyringe';
import { App } from 'obsidian';
import { TimerState } from '../../../store/AppStore';
// [新增] 导入 App 的注入令牌
import { AppToken } from './types';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

@singleton()
export class TimerStateService {
    // [核心修改] 使用 @inject 装饰器明确指定依赖
    constructor(@inject(AppToken) private app: App) {}

    // ... 其余方法保持不变 ...
    async loadStateFromFile(): Promise<TimerState[]> {
        try {
            const fileExists = await this.app.vault.adapter.exists(TIMER_STATE_PATH);
            if (!fileExists) { return []; }
            const content = await this.app.vault.adapter.read(TIMER_STATE_PATH);
            if (!content) { return []; }
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