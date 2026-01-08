import { container } from 'tsyringe';
import { getAppStoreInstance } from '@/app/store/useAppStore';
import { TimerStateService } from '@features/timer/TimerStateService';
import type { TimerState } from '@/app/store/slices/timer.slice';

export class TimerUseCase {
    private timerStateService: TimerStateService;

    constructor() {
        this.timerStateService = container.resolve(TimerStateService);
    }

    getTimers(): TimerState[] {
        const store = getAppStoreInstance();
        return store.getState().timer.timers;
    }

    async setInitialTimersFromDisk(): Promise<void> {
        const timers = await this.timerStateService.loadStateFromFile();
        const store = getAppStoreInstance();
        store.getState().timer.timersSetInitial(timers);
    }

    async addTimer(timer: Omit<TimerState, 'id'>): Promise<TimerState> {
        const store = getAppStoreInstance();
        const { generateId } = await import('@core/utils/array');
        
        const newTimer: TimerState = { ...timer, id: generateId('timer') };
        store.getState().timer.timerAdd(newTimer);
        
        await this.saveState();
        return newTimer;
    }

    async updateTimer(timer: TimerState): Promise<void> {
        const store = getAppStoreInstance();
        store.getState().timer.timerUpdate(timer);
        await this.saveState();
    }

    async removeTimer(timerId: string): Promise<void> {
        const store = getAppStoreInstance();
        store.getState().timer.timerRemove(timerId);
        await this.saveState();
    }

    // Helper to save state
    private async saveState(): Promise<void> {
        const store = getAppStoreInstance();
        const timers = store.getState().timer.timers;
        await this.timerStateService.saveStateToFile(timers);
    }
}

export function createTimerUseCase(): TimerUseCase {
    return new TimerUseCase();
}
