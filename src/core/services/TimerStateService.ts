// src/core/services/TimerStateService.ts
import { App } from 'obsidian';
import { TimerState } from '@state/AppStore';

// [修改] 将状态文件路径改为保险库根目录
const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

/**
 * TimerStateService 负责将计时器的状态持久化到文件中，以实现跨设备同步。
 */
export class TimerStateService {
    private app: App;
    private static instance: TimerStateService;

    constructor(app: App) {
        this.app = app;
        TimerStateService.instance = this;
    }

    /**
     * 从 JSON 文件中异步加载计时器状态。
     * @returns 返回一个 TimerState 数组。
     */
    async loadStateFromFile(): Promise<TimerState[]> {
        try {
            const fileExists = await this.app.vault.adapter.exists(TIMER_STATE_PATH);
            if (!fileExists) {
                return []; // 文件不存在，返回空状态
            }
            const content = await this.app.vault.adapter.read(TIMER_STATE_PATH);
            // 如果文件为空，也返回空数组
            if (!content) {
                return [];
            }
            const timers = JSON.parse(content);
            // 这里可以添加一些数据校验逻辑，确保格式正确
            return Array.isArray(timers) ? timers : [];
        } catch (error) {
            console.error('Think Plugin: Failed to load timer state from file.', error);
            return [];
        }
    }

    /**
     * 将当前的计时器状态异步保存到 JSON 文件中。
     * @param timers - 当前的 TimerState 数组。
     */
    async saveStateToFile(timers: TimerState[]): Promise<void> {
        try {
            const content = JSON.stringify(timers, null, 2); // 格式化JSON以便阅读
            await this.app.vault.adapter.write(TIMER_STATE_PATH, content);
        } catch (error) {
            console.error('Think Plugin: Failed to save timer state to file.', error);
        }
    }
}