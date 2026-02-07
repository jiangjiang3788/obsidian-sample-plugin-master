import type { ZustandAppStore } from '@/app/store/useAppStore';

export const selectFloatingWindows = (s: ZustandAppStore) => s.floatingWindows;

export const selectFloatingWindowsActiveId = (s: ZustandAppStore) => s.floatingWindows.activeId;
export const selectFloatingWindowsRegister = (s: ZustandAppStore) => s.floatingWindows.register;
export const selectFloatingWindowsUnregister = (s: ZustandAppStore) => s.floatingWindows.unregister;
export const selectFloatingWindowsFocus = (s: ZustandAppStore) => s.floatingWindows.focus;

export const makeSelectFloatingWindowZIndex = (id: string) => (s: ZustandAppStore) =>
  s.floatingWindows.windows[id]?.zIndex;
