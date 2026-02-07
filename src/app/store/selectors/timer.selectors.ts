import type { ZustandAppStore } from '@/app/store/useAppStore';

export const selectTimerState = (s: ZustandAppStore) => s.timer;

export const selectTimers = (s: ZustandAppStore) => s.timer.timers;
