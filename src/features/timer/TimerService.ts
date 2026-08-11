/**
 * TimerService - 计时器业务逻辑
 * 角色：Service (业务)
 * 依赖：UseCases, DataStore
 *
 * 只做：
 * - 开始 / 暂停 / 恢复 / 停止计时
 * - 切换当前任务
 * - 将计时结果提交到统一 recordInput.usecase
 * - 创建新任务并立即开始计时
 *
 * 不做：
 * - 直接管理和存储计时器的状态 (这是 Zustand Store 的职责)
 * - 直接渲染 UI
 * - 直接绕过 UseCase 触发 InputService / ItemService 写入
 */
import { DataStore } from '@core/services/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import {
  nowHHMM,
  applyTaskTimePolicy,
  normalizeTaskTimeTriple,
  devError,
  readRecordSubmitMessage,
} from '@core/utils/public';
import type { UiPort } from '@core/ports/public';
import type { EnergyTaskExecutionStart, TimerState } from '@core/types/public';
import type { UseCases } from '@/app/public';

function readResultMessage(
    result: { status?: string; errors?: Array<{ message: string }>; feedback?: { notice?: string } },
    fallback: string,
): string {
    return readRecordSubmitMessage(result as any, fallback);
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
                this.ui.notice('找不到要计时的任务');
                return;
            }

            this.ui.notice(`计时开始。`);

            await this.useCases.timer.addTimer({
                taskId,
                startTime: Date.now(),
                elapsedSeconds: 0,
                status: 'running',
            });
        }
    }


    /**
     * Start a task from Energy task while preserving the baseline used
     * for later Energy feedback. Timer owns execution; Energy only supplies the baseline
     * and the suggested work-block length.
     */
    public async startEnergyTask(taskId: string, context: EnergyTaskExecutionStart): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const timer of timers) {
            if (timer.status === 'running' && timer.taskId !== taskId) {
                await this.pause(timer.id);
            }
        }

        const existing = this.useCases.timer.getTimers().find((timer) => timer.taskId === taskId);
        const energyContext = {
            ...context,
            suggestedDurationMinutes: Math.max(10, Math.min(240, Math.round(context.suggestedDurationMinutes || 30))),
            startedAt: Date.now(),
        };

        if (existing) {
            await this.useCases.timer.updateTimer({ ...existing, energyContext } as TimerState);
            if (existing.status === 'paused') await this.resume(existing.id);
            this.ui.notice('任务已开始');
            return;
        }

        const taskItem = this.dataStore.queryItems().find(i => i.id === taskId);
        if (!taskItem) {
            this.ui.notice('找不到要执行的任务');
            return;
        }
        await this.useCases.timer.addTimer({
            taskId,
            startTime: Date.now(),
            elapsedSeconds: 0,
            status: 'running',
            energyContext,
        });
        this.ui.notice('任务已开始');
    }

    public async pause(timerId: string): Promise<void> {
        const timer = this.useCases.timer.getTimers().find((t: any) => t.id === timerId);
        if (timer && timer.status === 'running') {
            const elapsed = (Date.now() - timer.startTime) / 1000;
            await this.useCases.timer.updateTimer({
                ...timer,
                elapsedSeconds: timer.elapsedSeconds + elapsed,
                status: 'paused',
            });
        }
    }

    public async resume(timerId: string): Promise<void> {
        const timers = this.useCases.timer.getTimers();
        for (const t of timers) {
            if (t.id !== timerId && t.status === 'running') {
                await this.pause(t.id);
            }
        }
        const timerToResume = timers.find((t: any) => t.id === timerId);
        if (timerToResume && timerToResume.status === 'paused') {
            await this.useCases.timer.updateTimer({
                ...timerToResume,
                startTime: Date.now(),
                status: 'running',
            });
        }
    }

    /**
     * End only this work block. The source Task remains open.
     * Energy-started timers still move to awaiting-energy so the next Energy
     * sample can become feedback for this session.
     */
    public async endWorkBlock(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((t: any) => t.id === timerId);
        if (!timer) return false;
        const taskItem = this.dataStore.queryItems().find(i => i.id === timer.taskId);
        if (!taskItem) {
            this.ui.notice('找不到原始任务，本次工作无法保存。');
            await this.useCases.timer.removeTimer(timerId);
            return false;
        }
        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') totalSeconds += (Date.now() - timer.startTime) / 1000;

        if (timer.energyContext) {
            await this.useCases.timer.updateTimer({
                ...timer,
                elapsedSeconds: totalSeconds,
                status: 'awaiting-energy',
                completedAt: Date.now(),
            });
            this.ui.notice('本次工作已结束；任务保持未完成，下一次精力记录会作为反馈。');
        } else {
            await this.useCases.timer.removeTimer(timerId);
            this.ui.notice('本次工作已结束；任务保持未完成。');
        }
        return true;
    }

    public async stopAndApply(timerId: string): Promise<boolean> {
        const timer = this.useCases.timer.getTimers().find((t: any) => t.id === timerId);
        if (!timer) return false;
        let totalSeconds = timer.elapsedSeconds;
        if (timer.status === 'running') {
            totalSeconds += (Date.now() - timer.startTime) / 1000;
        }
        const totalMinutes = Math.ceil(totalSeconds / 60);

        let applied = false;
        try {
            const taskItem = this.dataStore.queryItems().find(i => i.id === timer.taskId);

            if (!taskItem) {
                this.ui.notice('找不到原始任务，可能已被移动或删除，计时时长无法保存。');
                await this.useCases.timer.removeTimer(timerId);
                return false;
            }

            const endTime = nowHHMM();
            const normalizedTime = totalMinutes > 0
                ? applyTaskTimePolicy({ endTime, duration: totalMinutes, mode: 'finalize', direction: 'backward' })
                : { startTime: undefined, endTime, duration: undefined };
            const startTime = normalizedTime.startTime ?? undefined;

            const isOpenTask = /^\s*-\s*\[ \]\s*/.test(taskItem.content || '');
            const result = isOpenTask
                ? await this.useCases.recordInput.submitCompleteRecord({
                    itemId: timer.taskId,
                    options: {
                        duration: normalizedTime.duration ?? totalMinutes,
                        startTime: startTime ?? null,
                        endTime,
                    },
                    source: 'timer',
                  })
                : await this.useCases.recordInput.submitUpdateRecordTime({
                    itemId: timer.taskId,
                    updates: {
                        time: startTime ?? null,
                        endTime,
                        duration: totalMinutes,
                    },
                    source: 'timer',
                  });

            if (result.status === 'success') {
                applied = true;
                if (result.feedback?.notice) {
                    this.ui.notice(result.feedback.notice);
                }
            } else if (result.status !== 'cancelled') {
                this.ui.notice(readResultMessage(result, '更新任务失败'));
            }
        } catch (e: any) {
            this.ui.notice(`更新任务失败：${e.message}`);
            devError('TimerService Error:', e);
            await this.useCases.timer.removeTimer(timerId);
            return false;
        }

        if (!applied) {
            await this.useCases.timer.removeTimer(timerId);
            return false;
        }

        if (timer.energyContext) {
            await this.useCases.timer.updateTimer({
                ...timer,
                elapsedSeconds: totalSeconds,
                status: 'awaiting-energy',
                completedAt: Date.now(),
            });
            this.ui.notice('任务已完成；下一次精力记录会自动作为反馈。');
        } else {
            await this.useCases.timer.removeTimer(timerId);
        }
        return true;
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
