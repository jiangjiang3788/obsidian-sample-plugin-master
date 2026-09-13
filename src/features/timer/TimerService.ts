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
import type { EnergyTaskExecutionStart, TimerState } from '@core/types/public';
import { buildRepeatedTaskFormData, buildTimerSegmentSession } from '@core/records/public';
import type { UseCases } from '@/app/public';
import { TimerEnergyTracking, type TimerEnergyCaptureHandler } from './TimerEnergyTracking';
export type { TimerEnergyCaptureHandler, TimerEnergyCapturePhase, TimerEnergyCaptureReason, TimerEnergyCaptureRequest } from './TimerEnergyTracking';

function readResultMessage(
    result: { status?: string; errors?: Array<{ message: string }>; feedback?: { notice?: string } },
    fallback: string,
): string {
    return readRecordSubmitMessage(result as any, fallback);
}

export class TimerService {
    private readonly energyTracking: TimerEnergyTracking;

    constructor(
        private useCases: UseCases,
        private dataStore: DataStore,
        private ui: UiPort
    ) {
        this.energyTracking = new TimerEnergyTracking(useCases, dataStore, ui);
    }

    /** Floating Timer owns the lightweight capture UI; the timer domain owns when it is requested. */
    public setEnergyCaptureHandler(handler: TimerEnergyCaptureHandler | null): () => void {
        return this.energyTracking.setCaptureHandler(handler);
    }

    public isEnergyTrackingEnabled(timer: TimerState): boolean {
        return this.energyTracking.isEnabled(timer);
    }

    public hasActiveEnergyBaseline(timer: TimerState): boolean {
        return this.energyTracking.hasActiveBaseline(timer);
    }

    /** One-shot Energy sampling for the currently running continuous work segment. */
    public async captureCurrentSegmentEnergy(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;
        if (timer.status !== 'running') {
            this.ui.notice('请先继续任务，再记录开始精力。');
            return false;
        }
        if (this.hasActiveEnergyBaseline(timer)) {
            this.ui.notice('本次连续工作段已经记录了开始精力。');
            return true;
        }
        return this.energyTracking.captureSegmentStart(timer, 'tracking-enabled');
    }

    /** Backward-compatible internal switch API; the floating Timer no longer exposes a toggle. */
    public setEnergyTrackingEnabled(timerId: string, enabled: boolean): Promise<boolean> {
        return this.energyTracking.setEnabled(timerId, enabled);
    }

    public async startOrResume(taskId: string): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        const existingTimer = timers.find((timer) => timer.taskId === taskId);
        const taskItem = this.dataStore.getRecordById(taskId);
        if (!taskItem || taskItem.recordType !== 'task') {
            if (existingTimer) await this.useCases.timer.removeTimer(existingTimer.id);
            this.ui.notice('找不到要执行的任务');
            return;
        }

        // A completed Task is immutable history. Clicking play on it means
        // "do this again", never reopening or rewriting the old Record.
        if (taskItem.status === 'done') {
            if (existingTimer) await this.useCases.timer.removeTimer(existingTimer.id);
            const repeatedTaskId = await this.resolveRepeatTarget(taskItem);
            if (repeatedTaskId) await this.startOrResume(repeatedTaskId);
            return;
        }

        if (taskItem.status !== 'open') {
            if (existingTimer) await this.useCases.timer.removeTimer(existingTimer.id);
            this.ui.notice('只有未完成或已完成任务可以开始计时');
            return;
        }
        if (existingTimer?.status === 'running') return;

        for (const timer of timers) {
            if (timer.taskId !== taskId && timer.status === 'running') await this.pause(timer.id);
        }
        if (existingTimer?.status === 'paused') {
            await this.resume(existingTimer.id);
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

    private async resolveRepeatTarget(taskItem: NonNullable<ReturnType<DataStore['getRecordById']>>): Promise<string | null> {
        const seriesId = String(taskItem.seriesId || '').trim();
        if (seriesId) {
            const series = this.dataStore.getRecordById(seriesId);
            const currentTaskId = String(series?.currentTaskId || '').trim();
            const currentTask = currentTaskId ? this.dataStore.getRecordById(currentTaskId) : null;
            if (currentTask?.recordType === 'task' && currentTask.status === 'open' && currentTask.seriesId === seriesId) {
                return currentTask.id;
            }
        }

        const prepared = this.useCases.recordInput.prepareEditRecord({
            item: taskItem,
            recordTypeId: 'core.task',
            source: 'timer',
        });
        if (!prepared.template || !prepared.recordTypeId) {
            this.ui.notice('无法读取历史任务内容，不能再次执行');
            return null;
        }

        const result = await this.useCases.recordInput.submitCreateRecord({
            recordTypeId: 'core.task',
            formData: buildRepeatedTaskFormData(prepared.initialFormData),
            source: 'timer',
        });
        if (result.status !== 'success') {
            this.ui.notice(readResultMessage(result, '再次执行任务失败'));
            return null;
        }

        const createdTaskId = result.followUp?.startTimerForRecordId || result.affectedRecordId;
        if (!createdTaskId) {
            this.ui.notice('已创建新的任务记录，但没有找到可执行任务');
            return null;
        }
        return createdTaskId;
    }

    /** Start from Energy while Timer remains the sole runtime owner. */
    public async startEnergyTask(taskId: string, context: EnergyTaskExecutionStart): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.status === 'running' && timer.taskId !== taskId) await this.pause(timer.id);
        }

        const taskItem = this.dataStore.getRecordById(taskId);
        if (!taskItem || taskItem.recordType !== 'task' || taskItem.status !== 'open') {
            this.ui.notice('找不到要执行的任务');
            return;
        }

        const now = Date.now();
        const energyContext = {
            ...context,
            suggestedDurationMinutes: Math.max(1, Math.min(240, Math.round(context.suggestedDurationMinutes || 30))),
            startedAt: now,
        };
        const energyTracking = {
            enabled: true,
            baselineScore: context.baselineScore,
            baselineBrainScore: context.baselineBrainScore,
            baselinePhysicalScore: context.baselinePhysicalScore,
            baselineDate: context.baselineDate,
            baselineTime: context.baselineTime,
            baselineEnergyItemId: context.baselineEnergyItemId,
            startedAt: now,
        };
        const existing = this.useCases.timer.getTimers().find((timer) => timer.taskId === taskId);
        if (existing) {
            await this.useCases.timer.updateTimer({ ...existing, source: 'energy-view', energyContext, energyTracking });
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
            energyTracking,
        });
        this.ui.notice('任务已开始');
    }

    /**
     * Single completion boundary used by every Task surface.
     * If the Task owns an active/paused Timer, completion persists the final
     * TaskSession and clears runtime state through stopAndApply(). Otherwise
     * it performs a normal Task completion without fabricating a Session.
     */
    public async completeTask(taskId: string): Promise<boolean> {
        const activeTimer = this.useCases.timer.getTimers().find((entry) => entry.taskId === taskId);
        const shouldCaptureEnd = activeTimer ? this.hasActiveEnergyBaseline(activeTimer) : false;
        try {
            const result = await this.useCases.taskRuntime.completeTask({ taskId, source: 'timer' });
            if (result.status !== 'success' && result.status !== 'partial_success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '完成任务失败'));
                return false;
            }
            if (activeTimer && shouldCaptureEnd) await this.energyTracking.captureSegmentEnd(activeTimer, 'task-completed');
            this.ui.notice(result.feedback?.notice || '任务已完成。');
            return true;
        } catch (error: any) {
            this.ui.notice(`完成任务失败：${error.message}`);
            devError('TimerService completeTask Error:', error);
            return false;
        }
    }

    public async pause(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer || timer.status !== 'running') return false;

        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.recordType !== 'task') {
            this.ui.notice('找不到原始任务，本次工作无法保存。');
            return false;
        }

        const shouldCaptureEnd = this.hasActiveEnergyBaseline(timer);
        const endedAt = Date.now();
        const segmentSeconds = Math.max(0, (endedAt - timer.startTime) / 1000);
        const session = buildTimerSegmentSession(timer, endedAt, 'work-block-ended');
        if (session) {
            const result = await this.useCases.recordInput.submitTaskSession({
                itemId: timer.taskId,
                session,
                source: 'timer',
            });
            if (result.status !== 'success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '暂停失败：本次连续工作段未保存'));
                return false;
            }
        }

        await this.useCases.timer.updateTimer({
            ...timer,
            elapsedSeconds: timer.elapsedSeconds + segmentSeconds,
            status: 'paused',
            // Floating-Timer sampling is one-shot per continuous work segment.
            // A later resume does not silently prompt again; the user can press 精力 again if desired.
            energyTracking: this.isEnergyTrackingEnabled(timer) ? { enabled: false } : timer.energyTracking,
        });
        if (shouldCaptureEnd) await this.energyTracking.captureSegmentEnd(timer, 'pause');
        return true;
    }

    public async resume(timerId: string): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.id !== timerId && timer.status === 'running') await this.pause(timer.id);
        }
        let timerToResume = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timerToResume || timerToResume.status !== 'paused') return;

        if (this.isEnergyTrackingEnabled(timerToResume) && !this.hasActiveEnergyBaseline(timerToResume)) {
            const captured = await this.energyTracking.captureSegmentStart(timerToResume, 'resume');
            timerToResume = this.useCases.timer.getTimers().find((entry) => entry.id === timerId) || timerToResume;
            if (!captured) {
                await this.useCases.timer.updateTimer({ ...timerToResume, energyTracking: { enabled: false } });
                timerToResume = this.useCases.timer.getTimers().find((entry) => entry.id === timerId) || timerToResume;
            }
        }

        await this.useCases.timer.updateTimer({
            ...timerToResume,
            startTime: Date.now(),
            status: 'running',
        });
    }

    /** End only this work block. The source Task remains open. */
    public async endWorkBlock(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;
        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.recordType !== 'task') {
            this.ui.notice('找不到原始任务，本次工作无法保存。');
            return false;
        }

        const shouldCaptureEnd = this.hasActiveEnergyBaseline(timer);
        if (timer.status === 'running') {
            const endedAt = Date.now();
            const session = buildTimerSegmentSession(timer, endedAt, 'work-block-ended');
            if (session) {
                const result = await this.useCases.recordInput.submitTaskSession({
                    itemId: timer.taskId,
                    session,
                    source: 'timer',
                });
                if (result.status !== 'success') {
                    if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '保存本次工作失败'));
                    return false;
                }
            }
        }

        await this.useCases.timer.removeTimer(timerId);
        if (shouldCaptureEnd) await this.energyTracking.captureSegmentEnd(timer, 'end-work-block');
        this.ui.notice('本次工作已结束；任务保持未完成。');
        return true;
    }

    /** Complete Task and persist the final work block in one Record transaction. */
    public async stopAndApply(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;
        const shouldCaptureEnd = this.hasActiveEnergyBaseline(timer);
        try {
            const result = await this.useCases.taskRuntime.completeTask({
                taskId: timer.taskId,
                expectedTimerId: timer.id,
                source: 'timer',
            });
            if (result.status !== 'success' && result.status !== 'partial_success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '完成任务失败'));
                return false;
            }
            if (shouldCaptureEnd) await this.energyTracking.captureSegmentEnd(timer, 'task-completed');
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


}
