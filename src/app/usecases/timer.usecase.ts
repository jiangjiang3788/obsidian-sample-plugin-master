import { container } from 'tsyringe';
import { TimerStateService } from '@features/timer/TimerStateService';
import type { TimerState } from '@/app/store/slices/timer.slice';
import type { AppStoreApi } from './index';

export class TimerUseCase {
    private timerStateService: TimerStateService;
    private store: AppStoreApi;

    constructor(store: AppStoreApi) {
        this.store = store;
        this.timerStateService = container.resolve(TimerStateService);
    }

    getTimers(): TimerState[] {
        return this.store.getState().timer.timers;
    }

    async setInitialTimersFromDisk(): Promise<void> {
        const timers = await this.timerStateService.loadStateFromFile();
        this.store.getState().timer.timersSetInitial(timers);
    }

    async addTimer(timer: Omit<TimerState, 'id'>): Promise<TimerState> {
        const { generateId } = await import('@core/utils/array');
        
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

export function createTimerUseCase(store: AppStoreApi): TimerUseCase {
    return new TimerUseCase(store);
}
