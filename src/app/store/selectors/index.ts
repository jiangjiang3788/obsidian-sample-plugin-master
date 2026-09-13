import type { ZustandAppStore } from '@/app/store/useAppStore';
import { buildRecordTypeInputSettings, type RecordTypeColorOverrides } from '@core/recordTypes/public';


export const selectSettings = (s: ZustandAppStore) => s.settings;

const RECORD_TYPE_INPUT_SETTINGS = buildRecordTypeInputSettings();
const EMPTY_RECORD_TYPE_COLORS: RecordTypeColorOverrides = Object.freeze({});

/** Derived adapter for older view/AI props. It is not persisted settings. */
export const selectInputSettings = (_s: ZustandAppStore) => RECORD_TYPE_INPUT_SETTINGS;
export const selectInputRecordTypes = (_s: ZustandAppStore) => RECORD_TYPE_INPUT_SETTINGS.recordTypes;

export const selectAiSettings = (s: ZustandAppStore) => s.settings.aiSettings;

export const selectLayouts = (s: ZustandAppStore) => s.settings.layouts;

export const selectViewInstances = (s: ZustandAppStore) => s.settings.viewInstances;

export const makeSelectLayoutById = (layoutId: string) => (s: ZustandAppStore) =>
  s.settings.layouts?.find((l) => l.id === layoutId);

export const makeSelectViewInstanceById = (instanceId: string) => (s: ZustandAppStore) =>
  s.settings.viewInstances?.find((v) => v.id === instanceId);

export const selectFloatingTimerEnabled = (s: ZustandAppStore) => s.settings.floatingTimerEnabled;


export const selectRecordTypeColors = (s: ZustandAppStore): RecordTypeColorOverrides => s.settings.recordTypeColors ?? EMPTY_RECORD_TYPE_COLORS;

export const selectDevConsoleStackEnabled = (s: ZustandAppStore) => !!s.settings.devConsoleStackEnabled;


export const selectEnergyDefaultGoalPath = (s: ZustandAppStore) => s.settings.energySettings?.defaultGoalPath ?? '';
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

export const selectUi = (s: ZustandAppStore) => s.ui;

export const selectIsTimerWidgetVisible = (s: ZustandAppStore) => s.ui.isTimerWidgetVisible;
export const selectSetTimerWidgetVisible = (s: ZustandAppStore) => s.ui.setTimerWidgetVisible;

// 未来可补：activeLayoutName / modal states 等
