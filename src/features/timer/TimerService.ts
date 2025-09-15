// src/features/timer/TimerService.ts
import { singleton, inject } from 'tsyringe';
import { AppStore } from '@state/AppStore';
import { TaskService } from './taskService';
import { Notice, App } from 'obsidian';
import { DataStore } from './dataStore';
// [核心修改] 不再需要 InputService 和 QuickInputSaveData
// import { InputService } from './inputService';
// import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';
import { AppToken } from './types';
import { nowHHMM, timeToMinutes, minutesToTime } from '@core/utils/date';

@singleton()
export class TimerService {
    constructor(
        @inject(AppStore) private appStore: AppStore,
        @inject(DataStore) private dataStore: DataStore,
        @inject(TaskService) private taskService: TaskService,
        // [核心修改] 移除对 InputService 的依赖注入
        // @inject(InputService) private inputService: InputService,
        @inject(AppToken) private app: App
    ) {}

    public async startOrResume(taskId: string): Promise<void> {
        const timers = this.appStore.getState().timers;
        for (const timer of timers) {
            if (timer.status === 'running') {
                await this.pause(timer.id);
            }
        }
        const existingTimer = timers.find(t => t.taskId === taskId);
        if (existingTimer && existingTimer.status === 'paused') {
            await this.resume(existingTimer.id);
        } else if (!existingTimer) {
            const taskItem = this.dataStore.queryItems().find(i => i.id === taskId);
            if (!taskItem) {
                new Notice('找不到要计时的任务');
                return;
            }
            
            new Notice(`计时开始。`);

            await this.appStore.addTimer({
                taskId,
                startTime: Date.now(),
                elapsedSeconds: 0,
                status: 'running',
            });
        }
    }

    public async pause(timerId: string): Promise<void> {
        const timer = this.appStore.getState().timers.find(t => t.id === timerId);
        if (timer && timer.status === 'running') {
            const elapsed = (Date.now() - timer.startTime) / 1000;
            await this.appStore.updateTimer({
                ...timer,
                elapsedSeconds: timer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    public async resume(timerId: string): Promise<void> {
        const timers = this.appStore.getState().timers;
        for (const t of timers) {
            if (t.id !== timerId && t.status === 'running') {
                await this.pause(t.id);
            }
        }
        const timerToResume = timers.find(t => t.id === timerId);
        if (timerToResume && timerToResume.status === 'paused') {
            await this.appStore.updateTimer({
                ...timerToResume,
                startTime: Date.now(),
                status: 'running',
            });
        }
    }

    public async stopAndApply(timerId: string): Promise<void> {
        const timer = this.appStore.getState().timers.find(t => t.id === timerId);
        if (!timer) return;
        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') {
            totalSeconds += (Date.now() - timer.startTime) / 1000;
        }
        const totalMinutes = Math.ceil(totalSeconds / 60);

        try {
            const taskItem = this.dataStore.queryItems().find(i => i.id === timer.taskId);
            
            if (!taskItem) {
                new Notice(`错误：找不到原始任务，可能已被移动或删除。计时时长无法保存。`);
                await this.appStore.removeTimer(timerId);
                return;
            }
            
            const endTime = nowHHMM();
            const endMinutes = timeToMinutes(endTime);
            let startTime: string | undefined;

            if (endMinutes !== null && totalMinutes > 0) {
                const startMinutes = endMinutes - totalMinutes;
                startTime = minutesToTime(startMinutes);
            }

            const currentLine = await this.taskService.getTaskLine(timer.taskId);
            if (currentLine && /^\s*-\s*\[ \]\s*/.test(currentLine)) {
                await this.taskService.completeTask(timer.taskId, { duration: totalMinutes, startTime: startTime, endTime: endTime });
                new Notice(`任务已完成，时长 ${totalMinutes} 分钟已记录。`);
            } else {
                await this.taskService.updateTaskTime(timer.taskId, { duration: totalMinutes, time: startTime, endTime: endTime });
                new Notice(`任务时长已更新为 ${totalMinutes} 分钟。`);
            }
        } catch (e: any) {
            new Notice(`错误：更新任务失败 - ${e.message}`);
            console.error("TimerService Error:", e);
        }
        await this.appStore.removeTimer(timerId);
    }

    public async cancel(timerId: string): Promise<void> {
        await this.appStore.removeTimer(timerId);
        new Notice('计时任务已取消。');
    }
    
    // [核心修改] 彻底移除此方法，它的职责已经转移
    /*
    public async createNewTaskAndStart(data: QuickInputSaveData): Promise<void> {
        // ... (旧的错误逻辑) ...
    }
    */
}