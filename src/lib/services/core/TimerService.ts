// src/core/services/TimerService.ts
import { singleton, inject } from 'tsyringe';
import { AppStore } from '@state/AppStore';
import { TaskService } from './taskService';
import { Notice, App, TFile } from 'obsidian';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';
import { AppToken } from './types';
import { nowHHMM, timeToMinutes, minutesToTime } from '@core/utils/date';

@singleton()
export class TimerService {
    constructor(
        @inject(AppStore) private appStore: AppStore,
        @inject(DataStore) private dataStore: DataStore,
        @inject(TaskService) private taskService: TaskService,
        @inject(InputService) private inputService: InputService,
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
            
            // [核心修改] 移除了在开始计时时就写入文件“开始时间”的逻辑
            // 仅显示一个通知，文件将在任务完成时被修改
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
    
    public async createNewTaskAndStart(data: QuickInputSaveData): Promise<void> {
        const { template, formData, theme } = data;
        try {
            const targetFilePath = await this.inputService.executeTemplate(template, formData, theme);
            const file = this.app.vault.getAbstractFileByPath(targetFilePath);

            if (file instanceof TFile) {
                const newItemsInFile = await this.dataStore.scanFile(file);

                if (newItemsInFile.length > 0) {
                    const latestItem = newItemsInFile.sort((a, b) => (b.file?.line || 0) - (a.file?.line || 0))[0];
                    this.startOrResume(latestItem.id);
                } else {
                    new Notice("任务内容已创建，但未识别为可计时的任务项。");
                }
            } else {
                new Notice("任务已创建，但无法在文件系统中立即找到它以开始计时。");
                this.dataStore.notifyChange();
            }

        } catch (e: any) {
            new Notice(`创建任务失败: ${e.message}`);
            console.error(e);
        }
    }
}