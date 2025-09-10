// src/core/services/TimerService.ts
import { singleton, inject } from 'tsyringe';
import { AppStore } from '@state/AppStore';
import { TaskService } from './taskService';
import { Notice, App, TFile } from 'obsidian';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';
import { AppToken } from './types';

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
            const currentLine = await this.taskService.getTaskLine(timer.taskId);
            if (currentLine && /^\s*-\s*\[ \]\s*/.test(currentLine)) {
                await this.taskService.completeTask(timer.taskId, { duration: totalMinutes });
                new Notice(`任务已完成，时长 ${totalMinutes} 分钟已记录。`);
            } else {
                await this.taskService.updateTaskTime(timer.taskId, { duration: totalMinutes });
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
            // 1. 调用 InputService 执行模板并写入文件，这部分保持不变。
            const targetFilePath = await this.inputService.executeTemplate(template, formData, theme);
            
            // 2. 获取刚刚被修改或创建的文件对象。
            const file = this.app.vault.getAbstractFileByPath(targetFilePath);

            if (file instanceof TFile) {
                // 3. [核心修改] 重新扫描文件，并直接捕获从该文件中解析出的新任务项。
                //    我们不再需要 setTimeout，因为 scanFile 完成后，newItems 就已经是最新的了。
                const newItemsInFile = await this.dataStore.scanFile(file);

                if (newItemsInFile.length > 0) {
                    // 4. 对新任务项按行号降序排序，找到最新添加的一项（通常是最后一行）。
                    const latestItem = newItemsInFile.sort((a, b) => (b.file?.line || 0) - (a.file?.line || 0))[0];
                    
                    // 5. 直接开始计时，无需等待。
                    this.startOrResume(latestItem.id);
                    new Notice('新任务已创建并开始计时！');
                } else {
                    // 如果 scanFile 成功但没有返回任何任务项（例如，模板输出的不是任务格式），则提示用户。
                    new Notice("任务内容已创建，但未识别为可计时的任务项。");
                }
            } else {
                // 如果文件未找到，这是一个异常情况。
                new Notice("任务已创建，但无法在文件系统中立即找到它以开始计时。");
                this.dataStore.notifyChange(); // 触发一次全局刷新
            }

        } catch (e: any) {
            // 只有在 executeTemplate 或 scanFile 真正失败时才会进入这里。
            new Notice(`创建任务失败: ${e.message}`);
            console.error(e);
        }
    }
}