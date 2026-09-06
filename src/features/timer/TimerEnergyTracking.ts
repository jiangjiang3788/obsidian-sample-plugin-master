import type { UseCases } from '@/app/public';
import type { DataStore } from '@core/services/public';
import type { UiPort } from '@core/ports/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import type { TimerState } from '@core/types/public';
import { buildTimerSegmentSession } from '@core/records/public';
import { readRecordSubmitMessage } from '@core/utils/public';

export type TimerEnergyCapturePhase = 'start' | 'end';
export type TimerEnergyCaptureReason = 'tracking-enabled' | 'resume' | 'pause' | 'end-work-block' | 'task-completed';

export interface TimerEnergyCaptureRequest {
    phase: TimerEnergyCapturePhase;
    reason: TimerEnergyCaptureReason;
    timerId: string;
    taskId: string;
    taskTitle: string;
    baselineScore?: number;
}

export type TimerEnergyCaptureHandler = (request: TimerEnergyCaptureRequest) => Promise<number | null>;

function readResultMessage(
    result: Pick<RecordSubmitResult, 'status' | 'errors' | 'feedback'>,
    fallback: string,
): string {
    return readRecordSubmitMessage(result, fallback);
}

function clampEnergyScore(value: number): number {
    if (!Number.isFinite(value)) return 60;
    return Math.max(0, Math.min(100, Math.round(value)));
}

function localDateAndTime(timestamp = Date.now()): { date: string; time: string } {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}

/** Owns the optional before/after Energy sample around one continuous Timer segment. */
export class TimerEnergyTracking {
    private captureHandler: TimerEnergyCaptureHandler | null = null;

    constructor(
        private useCases: UseCases,
        private dataStore: DataStore,
        private ui: UiPort,
    ) {}

    setCaptureHandler(handler: TimerEnergyCaptureHandler | null): () => void {
        this.captureHandler = handler;
        return () => {
            if (this.captureHandler === handler) this.captureHandler = null;
        };
    }

    isEnabled(timer: TimerState): boolean {
        if (timer.energyTracking) return timer.energyTracking.enabled === true;
        // A pre-1.0.73 Energy-view Timer already has a reliable before sample.
        return Boolean(timer.energyContext?.baselineEnergyItemId);
    }

    hasActiveBaseline(timer: TimerState): boolean {
        if (timer.energyTracking) {
            return timer.energyTracking.enabled === true && Boolean(timer.energyTracking.baselineEnergyItemId);
        }
        return Boolean(timer.energyContext?.baselineEnergyItemId);
    }

    async setEnabled(timerId: string, enabled: boolean): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
        if (!timer) return false;

        if (!enabled) return this.disable(timer);
        if (timer.status === 'paused') {
            await this.useCases.timer.updateTimer({ ...timer, energyTracking: { enabled: true } });
            this.ui.notice('已开启精力跟踪；继续任务时记录开始精力。');
            return true;
        }

        const captured = await this.captureSegmentStart(timer, 'tracking-enabled');
        if (!captured) {
            const current = this.useCases.timer.getTimers().find((entry) => entry.id === timerId);
            if (current) await this.useCases.timer.updateTimer({ ...current, energyTracking: { enabled: false } });
        }
        return captured;
    }

    async captureSegmentStart(timer: TimerState, reason: Extract<TimerEnergyCaptureReason, 'tracking-enabled' | 'resume'>): Promise<boolean> {
        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.coreBlock !== 'task') return false;
        if (!this.captureHandler) {
            this.ui.notice('精力快捷记录界面未就绪，本次继续正常计时。');
            return false;
        }

        const score = await this.captureHandler({
            phase: 'start', reason, timerId: timer.id, taskId: timer.taskId,
            taskTitle: String(taskItem.title || taskItem.content || '任务'),
        });
        if (score == null) return false;

        const timestamp = Date.now();
        const clock = localDateAndTime(timestamp);
        const goalPath = String(taskItem.goalPath || '').trim();
        if (!goalPath) {
            this.ui.notice('这个任务没有目标，无法绑定精力记录。');
            return false;
        }
        const current = this.useCases.timer.getTimers().find((entry) => entry.id === timer.id);
        if (!current) return false;
        const boundaryTimer = await this.createTrackingBoundary(current, timestamp);
        if (!boundaryTimer) return false;

        const normalizedScore = clampEnergyScore(score);
        const result = await this.useCases.recordInput.submitEnergySnapshot({
            goalPath,
            date: clock.date,
            time: clock.time,
            captureMode: 'realtime',
            timePrecision: 'exact',
            scoreMode: 'percent',
            score: normalizedScore,
            source: 'timer-energy-start',
            // A before sample must never auto-attach as the end sample of an older Session.
            linkFinishedSession: false,
        });
        if (result.status !== 'success' || !result.affectedRecordId) {
            this.ui.notice(readResultMessage(result, '开始精力记录失败'));
            return false;
        }

        await this.useCases.timer.updateTimer({
            ...boundaryTimer,
            energyTracking: {
                enabled: true,
                baselineScore: normalizedScore,
                baselineDate: clock.date,
                baselineTime: clock.time,
                baselineEnergyItemId: result.affectedRecordId,
                startedAt: timestamp,
            },
        });
        return true;
    }

    async captureSegmentEnd(
        timer: TimerState,
        reason: Extract<TimerEnergyCaptureReason, 'pause' | 'end-work-block' | 'task-completed'>,
    ): Promise<boolean> {
        if (!this.captureHandler || !this.hasActiveBaseline(timer)) return false;
        const taskItem = this.dataStore.getRecordById(timer.taskId);
        if (!taskItem || taskItem.coreBlock !== 'task') return false;

        const score = await this.captureHandler({
            phase: 'end', reason, timerId: timer.id, taskId: timer.taskId,
            taskTitle: String(taskItem.title || taskItem.content || '任务'),
            baselineScore: timer.energyTracking?.baselineScore ?? timer.energyContext?.baselineScore,
        });
        if (score == null) return false;

        const goalPath = String(taskItem.goalPath || '').trim();
        if (!goalPath) {
            this.ui.notice('这个任务没有目标，无法绑定结束精力。');
            return false;
        }
        const clock = localDateAndTime();
        const result = await this.useCases.recordInput.submitEnergySnapshot({
            goalPath,
            date: clock.date,
            time: clock.time,
            captureMode: 'realtime',
            timePrecision: 'exact',
            scoreMode: 'percent',
            score: clampEnergyScore(score),
            source: 'timer-energy-end',
            // Existing TaskSession linking computes the delta against this segment's before sample.
            linkFinishedSession: true,
        });
        if (result.status !== 'success') {
            this.ui.notice(readResultMessage(result, '结束精力记录失败'));
            return false;
        }
        return true;
    }

    private async disable(timer: TimerState): Promise<boolean> {
        if (timer.status !== 'running' || !this.hasActiveBaseline(timer)) {
            await this.useCases.timer.updateTimer({ ...timer, energyTracking: { enabled: false } });
            return true;
        }

        const endedAt = Date.now();
        const session = buildTimerSegmentSession(timer, endedAt, 'work-block-ended');
        if (session) {
            const result = await this.useCases.recordInput.submitTaskSession({ itemId: timer.taskId, session, source: 'timer' });
            if (result.status !== 'success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '关闭精力跟踪失败：当前工作段未保存'));
                return false;
            }
        }
        const segmentSeconds = Math.max(0, (endedAt - timer.startTime) / 1000);
        await this.useCases.timer.updateTimer({
            ...timer,
            startTime: endedAt,
            elapsedSeconds: timer.elapsedSeconds + segmentSeconds,
            energyTracking: { enabled: false },
        });
        await this.captureSegmentEnd(timer, 'end-work-block');
        return true;
    }

    private async createTrackingBoundary(current: TimerState, timestamp: number): Promise<TimerState | null> {
        if (current.status !== 'running' || timestamp <= current.startTime) return current;

        // Turning tracking on mid-task creates a real execution boundary instead of
        // pretending the newly measured Energy existed at the old segment start.
        const untrackedCurrent: TimerState = current.energyTracking
            ? { ...current, energyTracking: { enabled: false } }
            : current;
        const priorSession = buildTimerSegmentSession(untrackedCurrent, timestamp, 'work-block-ended');
        if (priorSession) {
            const result = await this.useCases.recordInput.submitTaskSession({
                itemId: current.taskId,
                session: priorSession,
                source: 'timer',
            });
            if (result.status !== 'success') {
                if (result.status !== 'cancelled') this.ui.notice(readResultMessage(result, '精力跟踪开始失败：前一工作段未保存'));
                return null;
            }
        }

        // Commit the untracked boundary before writing the Energy snapshot. If the
        // Energy write fails, runtime still resumes from a correct, non-duplicated time boundary.
        const boundaryTimer: TimerState = {
            ...untrackedCurrent,
            startTime: timestamp,
            elapsedSeconds: current.elapsedSeconds + Math.max(0, (timestamp - current.startTime) / 1000),
        };
        await this.useCases.timer.updateTimer(boundaryTimer);
        return boundaryTimer;
    }
}
