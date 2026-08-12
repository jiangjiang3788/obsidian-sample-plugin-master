import type { ZustandAppStore } from '@/app/store/useAppStore';


export const selectSettings = (s: ZustandAppStore) => s.settings;

export const selectInputSettings = (s: ZustandAppStore) => s.settings.inputSettings;

// inputSettings helpers (avoid repeating nullish checks in UI)
export const selectInputBlocks = (s: ZustandAppStore) => s.settings.inputSettings?.blocks ?? [];
export const selectInputThemes = (s: ZustandAppStore) => s.settings.inputSettings?.themes ?? [];

export const selectAiSettings = (s: ZustandAppStore) => s.settings.aiSettings;

export const selectLayouts = (s: ZustandAppStore) => s.settings.layouts;

export const selectViewInstances = (s: ZustandAppStore) => s.settings.viewInstances;

export const makeSelectLayoutById = (layoutId: string) => (s: ZustandAppStore) =>
  s.settings.layouts?.find((l) => l.id === layoutId);

export const makeSelectViewInstanceById = (instanceId: string) => (s: ZustandAppStore) =>
  s.settings.viewInstances?.find((v) => v.id === instanceId);

export const selectFloatingTimerEnabled = (s: ZustandAppStore) => s.settings.floatingTimerEnabled;


export const selectDevConsoleStackEnabled = (s: ZustandAppStore) => !!s.settings.devConsoleStackEnabled;

const EMPTY_CATEGORY_COLORS: Record<string, string> = {};
export const selectCategoryColors = (s: ZustandAppStore) => s.settings.categoryColors ?? EMPTY_CATEGORY_COLORS;

export const selectEnergyDefaultGoalId = (s: ZustandAppStore) => s.settings.energySettings?.defaultGoalId ?? '';
export const selectEnergyDefaultThemePath = (s: ZustandAppStore) => s.settings.energySettings?.defaultThemePath ?? '';
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

export const selectFloatingWindows = (s: ZustandAppStore) => s.floatingWindows;

export const selectFloatingWindowsActiveId = (s: ZustandAppStore) => s.floatingWindows.activeId;
export const selectFloatingWindowsRegister = (s: ZustandAppStore) => s.floatingWindows.register;
export const selectFloatingWindowsUnregister = (s: ZustandAppStore) => s.floatingWindows.unregister;
export const selectFloatingWindowsFocus = (s: ZustandAppStore) => s.floatingWindows.focus;

export const makeSelectFloatingWindowZIndex = (id: string) => (s: ZustandAppStore) =>
  s.floatingWindows.windows[id]?.zIndex;

export const selectUi = (s: ZustandAppStore) => s.ui;

export const selectIsTimerWidgetVisible = (s: ZustandAppStore) => s.ui.isTimerWidgetVisible;
export const selectSetTimerWidgetVisible = (s: ZustandAppStore) => s.ui.setTimerWidgetVisible;

// 未来可补：activeLayoutName / modal states 等
