import { StateCreator } from 'zustand';

import type { TimerState } from '@core/public';

export interface TimerSlice {
    timer: {
        timers: TimerState[];
        timersSetInitial: (timers: TimerState[]) => void;
        timerAdd: (timer: TimerState) => void;
        timerUpdate: (timer: TimerState) => void;
        timerRemove: (timerId: string) => void;
        timerPause: (timerId: string, elapsedSeconds: number) => void;
        timerResume: (timerId: string, startTime: number) => void;
        timerClearAll: () => void;
    };
}

export const createTimerSlice: StateCreator<TimerSlice, [], [], TimerSlice> = (set) => ({
    timer: {
        timers: [],
        timersSetInitial: (timers) => set((state) => ({
            timer: { ...state.timer, timers }
        })),
        timerAdd: (timer) => set((state) => ({
            timer: { ...state.timer, timers: [...state.timer.timers, timer] }
        })),
        timerUpdate: (updatedTimer) => set((state) => ({
            timer: {
                ...state.timer,
                timers: state.timer.timers.map((t) => (t.id === updatedTimer.id ? updatedTimer : t))
            }
        })),
        timerRemove: (timerId) => set((state) => ({
            timer: {
                ...state.timer,
                timers: state.timer.timers.filter((t) => t.id !== timerId)
            }
        })),
        timerPause: (timerId, elapsedSeconds) => set((state) => ({
            timer: {
                ...state.timer,
                timers: state.timer.timers.map((t) =>
                    t.id === timerId ? { ...t, status: 'paused', elapsedSeconds } : t
                )
            }
        })),
        timerResume: (timerId, startTime) => set((state) => ({
            timer: {
                ...state.timer,
                timers: state.timer.timers.map((t) =>
                    t.id === timerId ? { ...t, status: 'running', startTime } : t
                )
            }
        })),
        timerClearAll: () => set((state) => ({
            timer: { ...state.timer, timers: [] }
        })),
    },
});
