import type { ZustandAppStore } from '@/app/store/useAppStore';

export const selectUi = (s: ZustandAppStore) => s.ui;

export const selectIsTimerWidgetVisible = (s: ZustandAppStore) => s.ui.isTimerWidgetVisible;
export const selectSetTimerWidgetVisible = (s: ZustandAppStore) => s.ui.setTimerWidgetVisible;

// 未来可补：activeLayoutName / modal states 等
