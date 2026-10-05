import { resolveQuickInputKeyboardViewportState } from '@/platform/obsidian/modals/quickInputKeyboard';

describe('QuickInput keyboard viewport model', () => {
  it('reserves predictive scroll runway immediately on focus before VisualViewport shrinks', () => {
    const state = resolveQuickInputKeyboardViewportState({
      baselineViewportHeight: 820,
      viewportHeight: 820,
      viewportTop: 0,
      focused: true,
    });

    expect(state.detected).toBe(false);
    expect(state.keyboardHeight).toBe(0);
    expect(state.anticipatedInset).toBeGreaterThanOrEqual(200);
  });

  it('switches to measured viewport geometry once the keyboard is visible', () => {
    const state = resolveQuickInputKeyboardViewportState({
      baselineViewportHeight: 820,
      viewportHeight: 470,
      viewportTop: 12,
      focused: true,
    });

    expect(state.detected).toBe(true);
    expect(state.keyboardHeight).toBe(350);
    expect(state.viewportBottom).toBe(482);
    expect(state.anticipatedInset).toBe(0);
  });

  it('does not reserve keyboard space when no editable control is focused', () => {
    const state = resolveQuickInputKeyboardViewportState({
      baselineViewportHeight: 820,
      viewportHeight: 820,
      focused: false,
    });

    expect(state.detected).toBe(false);
    expect(state.anticipatedInset).toBe(0);
  });
});
