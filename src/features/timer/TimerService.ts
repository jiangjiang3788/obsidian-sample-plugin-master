/**
 * TimerService - TimerRuntime / TaskSession boundary
 *
 * TimerState owns only active/paused runtime recovery. Every finished work block
 * becomes a persistent task-session Record. Task completion and Session creation
 * commit through the same Record transaction.
 */
import { DataStore } from '@core/services/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import { devError, readRecordSubmitMessage } from '@core/utils/public';
import type { UiPort } from '@core/ports/public';
import type { EnergyTaskExecutionStart, TaskSessionCreateInput, TimerState } from '@core/types/public';
import type { UseCases } from '@/app/public';

function readResultMessage(
    result: { status?: string; errors?: Array<{ message: string }>; feedback?: { notice?: string } },
    fallback: string,
): string {
    return readRecordSubmitMessage(result as any, fallback);
}

function durationMinutes(totalSeconds: number): number {
    return Math.max(0, Math.round((Math.max(0, totalSeconds) / 60) * 100) / 100);
}

export class TimerService {
    constructor(
        private useCases: UseCases,
        private dataStore: DataStore,
        private ui: UiPort
    ) {}

    public async startOrResume(taskId: string): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.status === 'running') await this.pause(timer.id);
        }
        const existingTimer = this.useCases.timer.getTimers().find((timer) => timer.taskId === taskId);
        if (existingTimer && existingTimer.status === 'paused') {
            await this.resume(existingTimer.id);
            return;
        }
        if (existingTimer) return;

        const taskItem = this.dataStore.getRecordById(taskId);
        if (!taskItem || taskItem.coreBlock !== 'task' || taskItem.status !== 'open') {
            this.ui.notice('找不到可执行的未完成任务');
            return;
        }

        const now = Date.now();
        await this.useCases.timer.addTimer({
            taskId,
            startedAt: now,
            startTime: now,
            elapsedSeconds: 0,
            status: 'running',
            source: 'timer',
        });
        this.ui.notice('计时开始。');
    }

    /** Start from Energy while Timer remains the sole runtime owner. */
    public async startEnergyTask(taskId: string, context: EnergyTaskExecutionStart): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.status === 'running' && timer.taskId !== taskId) await this.pause(timer.id);
        }

        const taskItem = this.dataStore.getRecordById(taskId);
        if (!taskItem || taskItem.coreBlock !== 'task' || taskItem.status !== 'open') {
            this.ui.notice('找不到要执行的任务');
            return;
        }

        const now = Date.now();
        const energyContext = {
            ...context,
            suggestedDurationMinutes: Math.max(10, Math.min(240, Math.round(context.suggestedDurationMinutes || 30))),
            startedAt: now,
        };
        const existing = this.useCases.timer.getTimers().find((timer) => timer.taskId === taskId);
        if (existing) {
            await this.useCases.timer.updateTimer({ ...existing, source: 'energy-view', energyContext });
            if (existing.status === 'paused') await this.resume(existing.id);
            this.ui.notice('任务已开始');
            return;
        }

        await this.useCases.timer.addTimer({
            taskId,
            startedAt: now,
            startTime: now,
            elapsedSeconds: 0,
            status: 'running',
            source: 'energy-view',
            energyContext,
        });
        this.ui.notice('任务已开始');
    }

    public async pause(timerId: string): Promise<void> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (timer && timer.status === 'running') {
            const elapsed = Math.max(0, (Date.now() - timer.startTime) / 1000);
            await this.useCases.timer.updateTimer({
                ...timer,
                elapsedSeconds: timer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    public async resume(timerId: string): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.id !== timerId && timer.status === 'running') await this.pause(timer.id);
        }
        const timerToResume = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (timerToResume && timerToResume.status === 'paused') {
            await this.useCases.timer.updateTimer({
                ...timerToResume,
                startTime: Date.now(),
                status: 'running',
            });
        }
    }

    /** End only this work block. The source Task remains open. */
    public async endWorkBlock(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;
        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.coreBlock !== 'task') {
            this.ui.notice('找不到原始任务，本次工作无法保存。');
            return false;
        }

        const endedAt = Date.now();
        const result = await this.useCases.recordInput.submitTaskSession({
            itemId: timer.taskId,
            session: this.buildSession(timer, endedAt, 'work-block-ended'),
            source: 'timer',
        });
        if (result.status !== 'success') {
            if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '保存本次工作失败'));
            return false;
        }

        await this.useCases.timer.removeTimer(timerId);
        this.ui.notice('本次工作已结束；任务保持未完成。');
        return true;
    }

    /** Complete Task and persist the final work block in one Record transaction. */
    public async stopAndApply(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;
        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.coreBlock !== 'task') {
            this.ui.notice('找不到原始任务，无法完成任务。');
            return false;
        }

        const endedAt = Date.now();
        try {
            const result = await this.useCases.recordInput.submitCompleteRecord({
                itemId: timer.taskId,
                session: this.buildSession(timer, endedAt, 'task-completed'),
                source: 'timer',
            });
            if (result.status !== 'success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '完成任务失败'));
                return false;
            }
            await this.useCases.timer.removeTimer(timerId);
            this.ui.notice(result.feedback?.notice || '任务已完成。');
            return true;
        } catch (error: any) {
            this.ui.notice(`完成任务失败：${error.message}`);
            devError('TimerService Error:', error);
            return false;
        }
    }

    public async cancel(timerId: string): Promise<void> {
        await this.useCases.timer.removeTimer(timerId);
        this.ui.notice('计时任务已取消。');
    }

    public async startCreatedTaskIfPossible(result: Pick<RecordSubmitResult, 'followUp'>): Promise<void> {
        const taskId = result.followUp?.startTimerForRecordId;
        if (!taskId) {
            this.ui.notice('任务内容已创建，但未定位到可计时的任务项。');
            return;
        }
        await this.startOrResume(taskId);
    }

    private buildSession(timer: TimerState, endedAt: number, result: TaskSessionCreateInput['result']): TaskSessionCreateInput {
        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') totalSeconds += Math.max(0, (endedAt - timer.startTime) / 1000);
        return {
            startedAt: new Date(timer.startedAt).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
            durationMinutes: durationMinutes(totalSeconds),
            result,
            source: timer.source,
            suggestedDurationMinutes: timer.energyContext?.suggestedDurationMinutes,
            startEnergyRecordId: timer.energyContext?.baselineEnergyItemId,
        };
    }
}
