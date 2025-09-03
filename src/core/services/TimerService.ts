// src/core/services/TimerService.ts
import { AppStore } from '@state/AppStore';
import { TaskService } from '@core/services/taskService';
import { Notice, App } from 'obsidian';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';

// [修改] TimerService 现在是一个普通类
export class TimerService {
    // [修改] 通过构造函数注入所有依赖
    constructor(
        private appStore: AppStore,
        private dataStore: DataStore,
        private taskService: TaskService
    ) {}

    // [修改] 所有方法都变为实例方法
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

    // [修正] 此方法现在正确使用注入的服务实例
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
                await this.appStore.removeTimer(timerId); // 使用 this.appStore
                return;
            }
            const currentLine = await this.taskService.getTaskLine(timer.taskId); // 使用 this.taskService

            if (currentLine && /^\s*-\s*\[ \]\s*/.test(currentLine)) {
                await this.taskService.completeTask(timer.taskId, { duration: totalMinutes }); // 使用 this.taskService
                new Notice(`任务已完成，时长 ${totalMinutes} 分钟已记录。`);
            } else {
                await this.taskService.updateTaskTime(timer.taskId, { duration: totalMinutes }); // 使用 this.taskService
                new Notice(`任务时长已更新为 ${totalMinutes} 分钟。`);
            }

        } catch (e: any) {
            new Notice(`错误：更新任务失败 - ${e.message}`);
            console.error("TimerService Error:", e);
        }
        
        await this.appStore.removeTimer(timerId); // 使用 this.appStore
    }

    // [修正] 此方法现在是实例方法
    public async cancel(timerId: string): Promise<void> {
        await this.appStore.removeTimer(timerId);
        new Notice('计时任务已取消。');
    }
    
    // [修正] 此方法现在是实例方法，并正确使用注入的服务
    public async createNewTaskAndStart(data: QuickInputSaveData, app: App, inputService: InputService): Promise<void> {
        const { template, formData, theme } = data;

        try {
            const targetFilePath = inputService.renderTemplate(template.targetFile, { ...formData, theme });
            if (!targetFilePath) throw new Error('目标文件路径无效');
            
            const outputContent = inputService.renderTemplate(template.outputTemplate, { ...formData, block: {name: template.name}, theme }).trim();

            const file = await inputService.getOrCreateFile(targetFilePath);
            const existingContent = await app.vault.read(file);
            
            const newContent = existingContent.trim() === '' ? outputContent : `${existingContent.trim()}\n${outputContent}`;
            
            await app.vault.modify(file, newContent);

            await this.dataStore.scanFile(file); // 使用 this.dataStore

            const newLines = outputContent.split('\n').length;
            const totalLines = newContent.split('\n').length;
            
            for (let i = 0; i < newLines + 2; i++) {
                const lineNumber = totalLines - i;
                const taskId = `${targetFilePath}#${lineNumber}`;
                const newItem = this.dataStore.queryItems().find(item => item.id === taskId); // 使用 this.dataStore
                
                if (newItem) {
                    this.startOrResume(newItem.id); // 'this' 现在是有效的
                    new Notice('新任务已创建并开始计时！');
                    return;
                }
            }
            
            new Notice('任务已创建，但无法自动开始计时。请手动启动。');

        } catch(e: any) {
            new Notice(`创建任务失败: ${e.message}`);
            console.error(e);
        }
    }
}