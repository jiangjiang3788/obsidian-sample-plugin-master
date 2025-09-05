//src/core/services/TimerService.ts
import { singleton } from 'tsyringe';
import { AppStore } from '@state/AppStore';
import { TaskService } from '@core/services/taskService';
import { Notice, App } from 'obsidian';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';

@singleton()
export class TimerService {
    private appStore!: AppStore;
    private dataStore!: DataStore;
    private taskService!: TaskService;
    private inputService!: InputService;
    private app!: App;

    // [核心修复] 构造函数变为空
    constructor() { }

    // [核心修复] 新增 init 方法用于注入所有依赖
    public init(appStore: AppStore, dataStore: DataStore, taskService: TaskService, inputService: InputService, app: App) {
        this.appStore = appStore;
        this.dataStore = dataStore;
        this.taskService = taskService;
        this.inputService = inputService;
        this.app = app;
    }

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

    // [核心修复] 此方法签名被简化，不再需要外部传入 app 和 inputService
    public async createNewTaskAndStart(data: QuickInputSaveData): Promise<void> {
        const { template, formData, theme } = data;

        try {
            const targetFilePath = this.inputService.renderTemplate(template.targetFile, { ...formData, theme });
            if (!targetFilePath) throw new Error('目标文件路径无效');

            const outputContent = this.inputService.renderTemplate(template.outputTemplate, { ...formData, block: { name: template.name }, theme }).trim();

            const file = await this.inputService.getOrCreateFile(targetFilePath);
            const existingContent = await this.app.vault.read(file);

            const newContent = existingContent.trim() === '' ? outputContent : `${existingContent.trim()}\n${outputContent}`;

            await this.app.vault.modify(file, newContent);

            await this.dataStore.scanFile(file);

            const newLines = outputContent.split('\n').length;
            const totalLines = newContent.split('\n').length;

            for (let i = 0; i < newLines + 2; i++) {
                const lineNumber = totalLines - i;
                const taskId = `${targetFilePath}#${lineNumber}`;
                const newItem = this.dataStore.queryItems().find(item => item.id === taskId);

                if (newItem) {
                    this.startOrResume(newItem.id);
                    new Notice('新任务已创建并开始计时！');
                    return;
                }
            }

            new Notice('任务已创建，但无法自动开始计时。请手动启动。');

        } catch (e: any) {
            new Notice(`创建任务失败: ${e.message}`);
            console.error(e);
        }
    }
}