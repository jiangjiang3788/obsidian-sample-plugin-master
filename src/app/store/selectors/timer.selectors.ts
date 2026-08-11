import type { ZustandAppStore } from '@/app/store/useAppStore';
import { isActiveTimerState } from '@core/types/public';
import type { TimerState } from '@core/types/public';

export const selectTimerState = (s: ZustandAppStore) => s.timer;

/**
 * UI-facing active timers only.
 *
 * IMPORTANT (Zustand 5): a selector must not manufacture a fresh array for an
 * unchanged store snapshot. The 1.0.28 implementation used
 * `s.timer.timers.filter(...)` directly, which returned a new array on every
 * read and could cause workspace-restoration render loops.
 *
 * Cache by the source-array identity. Every timer slice mutation replaces the
 * array, so this remains correct while returning a stable result between real
 * state changes.
 */
let lastTimerEntries: TimerState[] | null = null;
let lastActiveTimers: TimerState[] = [];

export const selectTimers = (s: ZustandAppStore): TimerState[] => {
  const entries = s.timer.timers;
  if (entries === lastTimerEntries) return lastActiveTimers;

  lastTimerEntries = entries;
  lastActiveTimers = entries.filter(isActiveTimerState);
  return lastActiveTimers;
};
