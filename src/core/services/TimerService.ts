// src/core/services/TimerService.ts
import { AppStore } from '@state/AppStore';
import { TaskService } from '@core/services/taskService';
import { Notice, App } from 'obsidian'; // [新增] 导入 App
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';

export class TimerService {

    static async startOrResume(taskId: string): Promise<void> {
        // ... 此方法无变化
        const store = AppStore.instance;
        const timers = store.getState().timers;
        
        for (const timer of timers) {
            if (timer.status === 'running') {
                await this.pause(timer.id);
            }
        }

        const existingTimer = timers.find(t => t.taskId === taskId);
        if (existingTimer && existingTimer.status === 'paused') {
            await this.resume(existingTimer.id);
        } else if (!existingTimer) {
            const taskItem = DataStore.instance.queryItems().find(i => i.id === taskId);
            if (!taskItem) {
                new Notice('找不到要计时的任务');
                return;
            }
            await store.addTimer({
                taskId,
                startTime: Date.now(),
                elapsedSeconds: 0,
                status: 'running',
            });
        }
    }

    static async pause(timerId: string): Promise<void> {
        // ... 此方法无变化
        const store = AppStore.instance;
        const timer = store.getState().timers.find(t => t.id === timerId);

        if (timer && timer.status === 'running') {
            const elapsed = (Date.now() - timer.startTime) / 1000;
            await store.updateTimer({
                ...timer,
                elapsedSeconds: timer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    static async resume(timerId: string): Promise<void> {
        // ... 此方法无变化
        const store = AppStore.instance;
        const timers = store.getState().timers;

        for (const t of timers) {
            if (t.id !== timerId && t.status === 'running') {
                await this.pause(t.id);
            }
        }

        const timerToResume = timers.find(t => t.id === timerId);
        if (timerToResume && timerToResume.status === 'paused') {
            await store.updateTimer({
                ...timerToResume,
                startTime: Date.now(),
                status: 'running',
            });
        }
    }

    static async stopAndApply(timerId: string): Promise<void> {
        // ... 此方法无变化
        const store = AppStore.instance;
        const timer = store.getState().timers.find(t => t.id === timerId);

        if (!timer) return;

        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') {
            totalSeconds += (Date.now() - timer.startTime) / 1000;
        }

        const totalMinutes = Math.ceil(totalSeconds / 60);

        try {
            const taskItem = DataStore.instance.queryItems().find(i => i.id === timer.taskId);
            if (!taskItem) {
                new Notice(`错误：找不到原始任务，可能已被移动或删除。计时时长无法保存。`);
                await store.removeTimer(timerId);
                return;
            }
            const currentLine = await TaskService.getTaskLine(timer.taskId);

            if (currentLine && /^\s*-\s*\[ \]\s*/.test(currentLine)) {
                await TaskService.completeTask(timer.taskId, { duration: totalMinutes });
                new Notice(`任务已完成，时长 ${totalMinutes} 分钟已记录。`);
            } else {
                await TaskService.updateTaskTime(timer.taskId, { duration: totalMinutes });
                new Notice(`任务时长已更新为 ${totalMinutes} 分钟。`);
            }

        } catch (e: any) {
            new Notice(`错误：更新任务失败 - ${e.message}`);
            console.error("TimerService Error:", e);
        }
        
        await store.removeTimer(timerId);
    }

    static async cancel(timerId: string): Promise<void> {
        // ... 此方法无变化
        const store = AppStore.instance;
        await store.removeTimer(timerId);
        new Notice('计时任务已取消。');
    }

    // [修改] 此方法现在接收一个 InputService 实例作为参数，而不是自己创建
    static async createNewTaskAndStart(data: QuickInputSaveData, app: App, inputService: InputService): Promise<void> {
        // [移除] 不再在内部创建 InputService 实例
        // const inputService = new InputService(app); 
        const { template, formData, theme } = data;

        try {
            // [无变化] 后续逻辑保持不变，只是现在使用的 inputService 是从外部传入的
            const targetFilePath = inputService.renderTemplate(template.targetFile, { ...formData, theme });
            if (!targetFilePath) throw new Error('目标文件路径无效');
            
            const outputContent = inputService.renderTemplate(template.outputTemplate, { ...formData, block: {name: template.name}, theme }).trim();

            const file = await inputService.getOrCreateFile(targetFilePath);
            const existingContent = await app.vault.read(file);
            
            const newContent = existingContent.trim() === '' ? outputContent : `${existingContent.trim()}\n${outputContent}`;
            
            await app.vault.modify(file, newContent);

            await DataStore.instance.scanFile(file);

            const newLines = outputContent.split('\n').length;
            const totalLines = newContent.split('\n').length;
            
            for (let i = 0; i < newLines + 2; i++) {
                const lineNumber = totalLines - i;
                const taskId = `${targetFilePath}#${lineNumber}`;
                const newItem = DataStore.instance.queryItems().find(item => item.id === taskId);
                
                if (newItem) {
                    this.startOrResume(newItem.id);
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