// src/core/services/TimerService.ts
import { AppStore } from '@state/AppStore';
import { TaskService } from '@core/services/taskService';
import { Notice } from 'obsidian';
import { DataStore } from './dataStore';

/**
 * TimerService 负责处理所有与计时器相关的业务逻辑。
 * 它是一个纯逻辑层，不涉及任何UI。
 */
export class TimerService {

    /**
     * 为指定任务开始一个新的计时器。
     * 如果已有计时器在运行，会先停止旧的计时器再开始新的。
     * @param taskId - 要开始计时的任务ID
     */
    static async start(taskId: string): Promise<void> {
        const store = AppStore.instance;
        const currentTimer = store.getState().activeTimer;
        const taskItem = DataStore.instance.queryItems().find(i => i.id === taskId);

        if (!taskItem) {
            new Notice('找不到要计时的任务');
            return;
        }

        // 如果当前有任务正在计时，先停止并保存它
        if (currentTimer) {
            await this.stopAndApply();
        }

        store.setActiveTimer({
            taskId,
            startTime: Date.now(),
            elapsedSeconds: 0,
            status: 'running',
        });
    }

    /**
     * 暂停当前正在运行的计时器。
     */
    static pause(): void {
        const store = AppStore.instance;
        const currentTimer = store.getState().activeTimer;

        if (currentTimer && currentTimer.status === 'running') {
            const elapsed = (Date.now() - currentTimer.startTime) / 1000;
            store.setActiveTimer({
                ...currentTimer,
                elapsedSeconds: currentTimer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    /**
     * 恢复已暂停的计时器。
     */
    static resume(): void {
        const store = AppStore.instance;
        const currentTimer = store.getState().activeTimer;

        if (currentTimer && currentTimer.status === 'paused') {
            store.setActiveTimer({
                ...currentTimer,
                startTime: Date.now(), // 重置本次计时的起点
                status: 'running',
            });
        }
    }

    /**
     * 停止当前计时器，并将总时长更新到对应的任务文件中。
     */
    static async stopAndApply(): Promise<void> {
        const store = AppStore.instance;
        const currentTimer = store.getState().activeTimer;

        if (!currentTimer) return;

        let totalSeconds = currentTimer.elapsedSeconds;
        if (currentTimer.status === 'running') {
            totalSeconds += (Date.now() - currentTimer.startTime) / 1000;
        }

        // 清空计时器状态
        store.setActiveTimer(null);
        
        // 将总时长转换为分钟，并向上取整
        const totalMinutes = Math.ceil(totalSeconds / 60);

        if (totalMinutes > 0) {
            try {
                // 读取任务现有总时长
                const taskItem = DataStore.instance.queryItems().find(i => i.id === currentTimer.taskId);
                const existingDuration = taskItem?.duration || 0;
                const newTotalDuration = existingDuration + totalMinutes;

                await TaskService.updateTaskTime(currentTimer.taskId, { duration: newTotalDuration });
                new Notice(`计时结束，本次时长 ${totalMinutes} 分钟已累加。`);
            } catch (e: any) {
                new Notice(`错误：无法更新任务时长 - ${e.message}`);
                console.error("TimerService Error:", e);
            }
        } else {
            new Notice('计时已停止，时长不足一分钟未记录。');
        }
    }
}