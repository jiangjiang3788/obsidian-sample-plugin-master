/**
 * @covers F153/unit
 * @covers F153/regression
 */
import {
  DEFAULT_WHITEBOARD_UI_PREFERENCES,
  WHITEBOARD_UI_PREFERENCES_KEY,
  normalizeWhiteboardUiPreferences,
} from '@/features/whiteboard/WhiteboardUiPreferences';

describe('Whiteboard UI preferences', () => {
  it('keeps grid off by default and source visibility outside durable board state', () => {
    expect(WHITEBOARD_UI_PREFERENCES_KEY).toBe('think-whiteboard-ui-preferences-v1');
    expect(DEFAULT_WHITEBOARD_UI_PREFERENCES).toEqual({ gridVisible: false, sourceCollapsed: false });
  });

  it('normalizes persisted booleans without allowing missing/corrupt values to reopen or re-enable UI implicitly', () => {
    expect(normalizeWhiteboardUiPreferences({ gridVisible: true, sourceCollapsed: true })).toEqual({ gridVisible: true, sourceCollapsed: true });
    expect(normalizeWhiteboardUiPreferences({ sourceCollapsed: true })).toEqual({ gridVisible: false, sourceCollapsed: true });
    expect(normalizeWhiteboardUiPreferences(null)).toEqual(DEFAULT_WHITEBOARD_UI_PREFERENCES);
  });
});
