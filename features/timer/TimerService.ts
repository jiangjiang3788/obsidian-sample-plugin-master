/**
 * TimerService - 计时器业务逻辑
 * 角色：Service (业务)
 * 依赖：TimerStore, DataStore, ItemService, InputService
 * 
 * 只做：
 * - 开始 / 暂停 / 恢复 / 停止计时
 * - 切换当前任务
 * - 将计时结果写入文件系统 (通过 ItemService)
 * - 创建新任务并立即开始计时
 * 
 * 不做：
 * - 直接管理和存储计时器的状态 (这是 TimerStore 的职责)
 * - 直接渲染 UI
 * - 直接操作 Obsidian 界面元素
 */
import { singleton, inject } from 'tsyringe';
import { TimerStore } from '@features/timer/TimerStore';
import { ItemService } from '@core/services/ItemService';
import { Notice, App, TFile } from 'obsidian';
import { DataStore } from '@core/services/DataStore';
import { InputService } from '@core/services/InputService';
import type { QuickInputSaveData } from '@/features/quickinput/QuickInputModal';
import { AppToken } from '@core/services/types';
import { nowHHMM, timeToMinutes, minutesToTime } from '@core/utils/date';

@singleton()
export class TimerService {
    constructor(
        @inject(TimerStore) private timerStore: TimerStore,
        @inject(DataStore) private dataStore: DataStore,
        @inject(ItemService) private itemService: ItemService,
        @inject(InputService) private inputService: InputService,
        @inject(AppToken) private app: App
    ) {}

    public async startOrResume(taskId: string): Promise<void> {
        const timers = this.timerStore.getTimers();
        for (const timer of timers) {
            if (timer.status === 'running') {
                await this.pause(timer.id);
            }
        }
        const existingTimer = timers.find((t: any) => t.taskId === taskId);
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

            await this.timerStore.addTimer({
                taskId,
                startTime: Date.now(),
                elapsedSeconds: 0,
                status: 'running',
            });
        }
    }

    public async pause(timerId: string): Promise<void> {
        const timer = this.timerStore.getTimers().find((t: any) => t.id === timerId);
        if (timer && timer.status === 'running') {
            const elapsed = (Date.now() - timer.startTime) / 1000;
            await this.timerStore.updateTimer({
                ...timer,
                elapsedSeconds: timer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    public async resume(timerId: string): Promise<void> {
        const timers = this.timerStore.getTimers();
        for (const t of timers) {
            if (t.id !== timerId && t.status === 'running') {
                await this.pause(t.id);
            }
        }
        const timerToResume = timers.find((t: any) => t.id === timerId);
        if (timerToResume && timerToResume.status === 'paused') {
            await this.timerStore.updateTimer({
                ...timerToResume,
                startTime: Date.now(),
                status: 'running',
            });
        }
    }

    public async stopAndApply(timerId: string): Promise<void> {
        const timer = this.timerStore.getTimers().find((t: any) => t.id === timerId);
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
                await this.timerStore.removeTimer(timerId);
                return;
            }
            
            const endTime = nowHHMM();
            const endMinutes = timeToMinutes(endTime);
            let startTime: string | undefined;

            if (endMinutes !== null && totalMinutes > 0) {
                const startMinutes = endMinutes - totalMinutes;
                startTime = minutesToTime(startMinutes);
            }

            const currentLine = await this.itemService.getItemLine(timer.taskId);
            if (currentLine && /^\s*-\s*\[ \]\s*/.test(currentLine)) {
                await this.itemService.completeItem(timer.taskId, { duration: totalMinutes, startTime: startTime, endTime: endTime });
                new Notice(`任务已完成，时长 ${totalMinutes} 分钟已记录。`);
            } else {
                await this.itemService.updateItemTime(timer.taskId, { duration: totalMinutes, time: startTime, endTime: endTime });
                new Notice(`任务时长已更新为 ${totalMinutes} 分钟。`);
            }
        } catch (e: any) {
            new Notice(`错误：更新任务失败 - ${e.message}`);
            console.error("TimerService Error:", e);
        }
        await this.timerStore.removeTimer(timerId);
    }

    public async cancel(timerId: string): Promise<void> {
        await this.timerStore.removeTimer(timerId);
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
