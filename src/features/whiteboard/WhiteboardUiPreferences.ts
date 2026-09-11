import { useCallback, useMemo } from 'preact/hooks';
import { useLocalStorage } from '@shared/hooks/public';

export const WHITEBOARD_UI_PREFERENCES_KEY = 'think-whiteboard-ui-preferences-v1';

export interface WhiteboardUiPreferences {
  gridVisible: boolean;
  sourceCollapsed: boolean;
}

export const DEFAULT_WHITEBOARD_UI_PREFERENCES: WhiteboardUiPreferences = {
  gridVisible: false,
  sourceCollapsed: false,
};

export function normalizeWhiteboardUiPreferences(value: unknown): WhiteboardUiPreferences {
  const candidate = value && typeof value === 'object' ? value as Partial<WhiteboardUiPreferences> : {};
  return {
    gridVisible: typeof candidate.gridVisible === 'boolean' ? candidate.gridVisible : DEFAULT_WHITEBOARD_UI_PREFERENCES.gridVisible,
    sourceCollapsed: typeof candidate.sourceCollapsed === 'boolean' ? candidate.sourceCollapsed : DEFAULT_WHITEBOARD_UI_PREFERENCES.sourceCollapsed,
  };
}

export function useWhiteboardUiPreferences() {
  const [stored, setStored] = useLocalStorage<unknown>(WHITEBOARD_UI_PREFERENCES_KEY, DEFAULT_WHITEBOARD_UI_PREFERENCES);
  const value = useMemo(() => normalizeWhiteboardUiPreferences(stored), [stored]);
  const set = useCallback((patch: Partial<WhiteboardUiPreferences>) => {
    setStored({ ...value, ...patch });
  }, [setStored, value]);

  return {
    ...value,
    setGridVisible: (gridVisible: boolean) => set({ gridVisible }),
    setSourceCollapsed: (sourceCollapsed: boolean) => set({ sourceCollapsed }),
    toggleGrid: () => set({ gridVisible: !value.gridVisible }),
    toggleSource: () => set({ sourceCollapsed: !value.sourceCollapsed }),
  };
}
