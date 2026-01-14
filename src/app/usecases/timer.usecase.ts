// src/app/usecases/timer.usecase.ts
import { generateId } from '@/shared/utils/id';
import { TimerStateService } from '@core/services/TimerStateService';
import type { TimerState } from '@/app/store/types';
import type { AppStoreApi } from './index';

/**
 * TimerUseCase
 * - 统一对外提供 timer 的写入口（UI/feature 不允许直接写 slice）
 * - 冻结阶段：明确依赖由上层注入（禁止在 UseCase 内部 container.resolve）
 */
export class TimerUseCase {
    constructor(
        private store: AppStoreApi,
        private timerStateService: TimerStateService
    ) {}

    getTimers(): TimerState[] {
        return this.store.getState().timer.timers;
    }

    async setInitialTimersFromDisk(): Promise<void> {
        const timers = await this.timerStateService.loadStateFromFile();
        this.store.getState().timer.timersSetInitial(timers);
    }

    async addTimer(timer: Omit<TimerState, 'id'>): Promise<TimerState> {
        const newTimer: TimerState = { ...timer, id: generateId('timer') };
        this.store.getState().timer.timerAdd(newTimer);

        await this.saveState();
        return newTimer;
    }

    async updateTimer(timer: TimerState): Promise<void> {
        this.store.getState().timer.timerUpdate(timer);
        await this.saveState();
    }

    async removeTimer(timerId: string): Promise<void> {
        this.store.getState().timer.timerRemove(timerId);
        await this.saveState();
    }

    // Helper to save state
    private async saveState(): Promise<void> {
        const timers = this.store.getState().timer.timers;
        await this.timerStateService.saveStateToFile(timers);
    }
}

export function createTimerUseCase(store: AppStoreApi, timerStateService: TimerStateService): TimerUseCase {
    return new TimerUseCase(store, timerStateService);
}
