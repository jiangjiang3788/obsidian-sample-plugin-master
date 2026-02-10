// src/app/capabilities/capabilities/timer.ts
import { devWarn } from '@core/public';
import type { TimerService } from '@features/timer/TimerService';
import type { CapabilityDeps } from '../types';

export interface TimerCapability {
    /**
     * 开始/继续计时指定任务
     */
    startOrResume(taskId: string): Promise<void>;

    /** 暂停指定 timer */
    pause(timerId: string): Promise<void>;

    /** 恢复指定 timer */
    resume(timerId: string): Promise<void>;

    /** 停止计时并写回到任务（记录时长/起止时间） */
    stopAndApply(timerId: string): Promise<void>;

    /** 取消计时（不写回） */
    cancel(timerId: string): Promise<void>;
}

export function createTimerCapability(deps: Pick<CapabilityDeps, 'timerService'>): TimerCapability {
    const getTimerService = (): TimerService | null => {
        const svc = deps.timerService ?? null;
        if (!svc) {
            devWarn('[TimerCapability] TimerService not ready. Did ServiceManager.bootstrap() run?');
        }
        return svc;
    };


    return {
        async startOrResume(taskId: string) {
            const svc = getTimerService();
            if (!svc) return;
            await svc.startOrResume(taskId);
        },
        async pause(timerId: string) {
            const svc = getTimerService();
            if (!svc) return;
            await svc.pause(timerId);
        },
        async resume(timerId: string) {
            const svc = getTimerService();
            if (!svc) return;
            await svc.resume(timerId);
        },
        async stopAndApply(timerId: string) {
            const svc = getTimerService();
            if (!svc) return;
            await svc.stopAndApply(timerId);
        },
        async cancel(timerId: string) {
            const svc = getTimerService();
            if (!svc) return;
            await svc.cancel(timerId);
        },
    };
}