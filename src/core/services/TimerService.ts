// src/core/services/TimerService.ts
import { AppStore } from '@state/AppStore';
import { TaskService } from '@core/services/taskService';
import { Notice } from 'obsidian';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';

export class TimerService {

    /**
     * 启动或恢复一个任务的计时。
     * - 如果该任务已在列表中且为暂停状态，则恢复它。
     * - 如果该任务不在列表中，则新增一个计时器。
     * - 同时会将其他所有正在运行的任务暂停。
     * @param taskId - 要开始/恢复计时的任务ID
     */
    static async startOrResume(taskId: string): Promise<void> {
        const store = AppStore.instance;
        const timers = store.getState().timers;
        
        // 暂停所有正在运行的计时器
        for (const timer of timers) {
            if (timer.status === 'running') {
                await this.pause(timer.id);
            }
        }

        const existingTimer = timers.find(t => t.taskId === taskId);
        if (existingTimer && existingTimer.status === 'paused') {
            // 恢复已存在的暂停任务
            await this.resume(existingTimer.id);
        } else if (!existingTimer) {
            // 添加并启动一个新任务
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

    /**
     * 暂停一个指定的计时器。
     * @param timerId - 计时器实例的唯一ID
     */
    static async pause(timerId: string): Promise<void> {
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

    /**
     * 恢复一个指定的计时器，并暂停其他所有计时器。
     * @param timerId - 计时器实例的唯一ID
     */
    static async resume(timerId: string): Promise<void> {
        const store = AppStore.instance;
        const timers = store.getState().timers;

        // 先暂停其他所有正在运行的计时器
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

    /**
     * 停止一个计时器，累加总时长到任务，并从计时列表中移除。
     * @param timerId - 计时器实例的唯一ID
     */
    static async stopAndApply(timerId: string): Promise<void> {
        const store = AppStore.instance;
        const timer = store.getState().timers.find(t => t.id === timerId);

        if (!timer) return;

        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') {
            totalSeconds += (Date.now() - timer.startTime) / 1000;
        }

        const totalMinutes = Math.ceil(totalSeconds / 60);

        if (totalMinutes > 0) {
            try {
                const taskItem = DataStore.instance.queryItems().find(i => i.id === timer.taskId);
                const existingDuration = taskItem?.duration || 0;
                const newTotalDuration = existingDuration + totalMinutes;

                await TaskService.updateTaskTime(timer.taskId, { duration: newTotalDuration });
                new Notice(`计时结束，本次时长 ${totalMinutes} 分钟已累加。`);
            } catch (e: any) {
                new Notice(`错误：无法更新任务时长 - ${e.message}`);
                console.error("TimerService Error:", e);
            }
        } else {
            new Notice('计时已停止，时长不足一分钟未记录。');
        }
        
        await store.removeTimer(timerId);
    }

    /**
     * [新增] 取消一个计时任务，不保存时长，并从列表中移除。
     * @param timerId - 计时器实例的唯一ID
     */
    static async cancel(timerId: string): Promise<void> {
        // 文件清理逻辑比较复杂且有风险，此版本仅从计时器列表移除
        // 未来可以扩展，通过给TimerState增加placeholderLine等字段来实现
        const store = AppStore.instance;
        await store.removeTimer(timerId);
        new Notice('计时任务已取消。');
    }

    /**
     * [新增] 创建一个新任务，写入文件，然后开始计时。
     * @param data - 从 NewTaskModal 返回的数据
     * @param app - Obsidian App 实例
     */
    static async createNewTaskAndStart(data: QuickInputSaveData, app: App): Promise<void> {
        const inputService = new InputService(app);
        const { template, formData, theme } = data;

        try {
            // 我们需要 InputService 能在执行后返回新任务的ID
            // 这是一个更高级的重构，现在我们先用一种模拟方式实现
            const targetFilePath = inputService.renderTemplate(template.targetFile, { ...formData, theme });
            if (!targetFilePath) throw new Error('目标文件路径无效');
            
            // 手动生成最终要写入的内容
            const outputContent = inputService.renderTemplate(template.outputTemplate, { ...formData, block: {name: template.name}, theme });

            const file = await inputService.getOrCreateFile(targetFilePath);
            const existingContent = await app.vault.read(file);
            const contentToAppend = `\n\n${outputContent}`.trim();
            const newContent = `${existingContent.trim()}\n${contentToAppend}`;
            
            await app.vault.modify(file, newContent);

            // 强制重新扫描文件以获取新任务
            await DataStore.instance.scanFile(file);

            // 这是一个简化的ID定位，它假设新任务总是在文件的最后几行
            const newLines = contentToAppend.split('\n').length;
            const totalLines = newContent.split('\n').length;
            
            // 从后往前找新任务
            for (let i = 0; i < newLines + 2; i++) {
                const lineNumber = totalLines - i;
                const taskId = `${targetFilePath}#${lineNumber}`;
                const newItem = DataStore.instance.queryItems().find(item => item.id === taskId);
                
                if (newItem) {
                    // 找到了新创建的任务，立即开始计时
                    this.startOrResume(newItem.id);
                    new Notice('新任务已创建并开始计时！');
                    return;
                }
            }
            
            // 如果没找到，给出提示
            new Notice('任务已创建，但无法自动开始计时。请手动启动。');

        } catch(e: any) {
            new Notice(`创建任务失败: ${e.message}`);
            console.error(e);
        }
    }
}