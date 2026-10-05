// src/platform/obsidian/modals/quickInputKeyboard.ts
// Mobile keyboard viewport handling for QuickInputModal.
// Kept outside the modal class so the modal stays focused on lifecycle + rendering.

interface KeyboardDetectionHost {
  contentEl: HTMLElement;
  modalEl: HTMLElement;
}

interface QuickInputKeyboardViewportState {
  viewportTop: number;
  viewportHeight: number;
  viewportBottom: number;
  keyboardHeight: number;
  detected: boolean;
  focused: boolean;
  anticipatedInset: number;
}

const KEYBOARD_ACTIVATION_THRESHOLD_PX = 120;
const FOCUSED_FIELD_TOP_GUTTER_PX = 16;
const FOCUSED_FIELD_BOTTOM_GUTTER_PX = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setCssPx(el: HTMLElement, name: string, height: number): void {
  el.style.setProperty(name, `${Math.max(0, Math.round(height))}px`);
}

function isKeyboardInput(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable;
}

/**
 * Resolve one keyboard/visual-viewport model for both layout and focused-field
 * scrolling. The important distinction is between:
 * - focused but not measured yet: reserve a predictive scroll inset immediately;
 * - keyboard measured by VisualViewport: use the real visible viewport geometry.
 */
export function resolveQuickInputKeyboardViewportState(input: {
  baselineViewportHeight: number;
  viewportHeight: number;
  viewportTop?: number;
  focused: boolean;
}): QuickInputKeyboardViewportState {
  const baselineViewportHeight = Math.max(1, input.baselineViewportHeight);
  const viewportHeight = Math.max(1, input.viewportHeight);
  const viewportTop = Math.max(0, input.viewportTop || 0);
  const keyboardHeight = Math.max(0, Math.round(baselineViewportHeight - viewportHeight));
  const detected = input.focused && keyboardHeight > KEYBOARD_ACTIVATION_THRESHOLD_PX;

  // Before iOS/Android WebView reports the keyboard resize, give the modal enough
  // scroll runway to move the focused row into the upper half immediately. This is
  // viewport-relative rather than a device-specific fixed keyboard-height patch.
  const anticipatedInset = input.focused && !detected
    ? clamp(Math.round(baselineViewportHeight * 0.38), 200, 360)
    : 0;

  return {
    viewportTop,
    viewportHeight,
    viewportBottom: viewportTop + viewportHeight,
    keyboardHeight,
    detected,
    focused: input.focused,
    anticipatedInset,
  };
}

export function setupQuickInputKeyboardDetection(host: KeyboardDetectionHost): () => void {
  const { contentEl, modalEl } = host;
  let baselineViewportHeight = window.visualViewport?.height || window.innerHeight;

  const setKeyboardHeight = (height: number) => {
    setCssPx(modalEl, '--keyboard-height', height);
    setCssPx(document.documentElement, '--keyboard-height', height);
  };

  const setAccessoryInset = (height: number) => {
    setCssPx(modalEl, '--keyboard-accessory-inset', height);
  };

  const setVisibleViewportHeight = (height: number) => {
    setCssPx(modalEl, '--quick-input-visible-viewport-height', height);
  };

  const hasActiveKeyboardInput = () => {
    const activeElement = document.activeElement;
    return !!activeElement && contentEl.contains(activeElement) && isKeyboardInput(activeElement);
  };

  const getBodyContainer = () => contentEl.querySelector('.think-modal__body') as HTMLElement | null;

  const readViewportState = (): QuickInputKeyboardViewportState => {
    const viewport = window.visualViewport;
    return resolveQuickInputKeyboardViewportState({
      baselineViewportHeight,
      viewportHeight: viewport?.height || window.innerHeight,
      viewportTop: viewport?.offsetTop || 0,
      focused: hasActiveKeyboardInput(),
    });
  };

  const ensureTargetVisible = (state: QuickInputKeyboardViewportState, target?: HTMLElement | null) => {
    const activeTarget = target && contentEl.contains(target) ? target : (document.activeElement as HTMLElement | null);
    if (!activeTarget || !isKeyboardInput(activeTarget) || !contentEl.contains(activeTarget)) return;

    const container = getBodyContainer();
    if (!container) return;

    const anchor = activeTarget.closest('.think-form-row, .think-inline-field-row, .think-textarea-row') as HTMLElement | null;
    const node = anchor || activeTarget;
    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const safeTop = Math.max(containerRect.top + FOCUSED_FIELD_TOP_GUTTER_PX, state.viewportTop + FOCUSED_FIELD_TOP_GUTTER_PX);

    // Once VisualViewport has shrunk, its bottom edge is the authoritative keyboard
    // boundary. Before that measurement arrives, proactively place the focused row
    // in an upper focus band instead of waiting for the first typed character/native
    // browser autoscroll to reveal it.
    let safeBottom = Math.min(containerRect.bottom, state.viewportBottom) - FOCUSED_FIELD_BOTTOM_GUTTER_PX;
    if (state.focused && !state.detected) {
      const predictiveFocusBand = clamp(Math.round(state.viewportHeight * 0.46), 150, 360);
      safeBottom = Math.min(safeBottom, safeTop + predictiveFocusBand);
    }
    safeBottom = Math.max(safeTop + 44, safeBottom);

    if (nodeRect.bottom > safeBottom) {
      container.scrollTop += nodeRect.bottom - safeBottom + 24;
    } else if (nodeRect.top < safeTop) {
      container.scrollTop -= safeTop - nodeRect.top + 12;
    }

    if (activeTarget instanceof HTMLTextAreaElement) {
      const lineReserve = 44;
      const caretBottom = activeTarget.scrollHeight - activeTarget.scrollTop;
      const visibleHeight = activeTarget.clientHeight - lineReserve;
      if (caretBottom > visibleHeight) {
        activeTarget.scrollTop = Math.max(0, activeTarget.scrollHeight - visibleHeight);
      }
    }
  };

  const updateKeyboardState = (target?: HTMLElement | null) => {
    const state = readViewportState();
    const active = state.focused;

    modalEl.classList.toggle('think-quick-input-keyboard-active', active);
    modalEl.classList.toggle('think-quick-input-keyboard-detected', state.detected);
    modalEl.classList.toggle('think-quick-input-keyboard-suspected', active && !state.detected);

    setVisibleViewportHeight(state.viewportHeight);
    setKeyboardHeight(state.detected ? state.keyboardHeight : 0);
    setAccessoryInset(state.detected ? 0 : state.anticipatedInset);

    if (active) {
      modalEl.style.setProperty('--keyboard-offset', `${state.viewportTop}px`);
    } else {
      modalEl.style.removeProperty('--keyboard-offset');
    }

    if (!active && state.keyboardHeight <= 0) {
      baselineViewportHeight = state.viewportHeight;
    }

    if (active) ensureTargetVisible(state, target);
  };

  const scheduleVisibilityPasses = (target?: HTMLElement | null) => {
    const run = () => updateKeyboardState(target);
    requestAnimationFrame(run);
    window.setTimeout(run, 80);
    window.setTimeout(run, 180);
    window.setTimeout(run, 320);
    window.setTimeout(run, 520);
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!isKeyboardInput(target)) return;
    // Run synchronously so the field moves before the keyboard animation completes.
    updateKeyboardState(target);
    scheduleVisibilityPasses(target);
  };

  const handleFocusOut = () => {
    window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
  };

  const handleInput = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!isKeyboardInput(target)) return;
    // Some embedded WebViews report their final VisualViewport geometry only after
    // composition/input begins. This pass consumes that measurement, but visibility
    // no longer depends on it because focus already performed the predictive move.
    updateKeyboardState(target);
  };

  const handleViewportResize = () => {
    updateKeyboardState(document.activeElement as HTMLElement | null);
  };

  const handleViewportScroll = () => {
    updateKeyboardState(document.activeElement as HTMLElement | null);
  };

  const handleOrientationChange = () => {
    setTimeout(() => {
      baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
      updateKeyboardState(document.activeElement as HTMLElement | null);
    }, 500);
  };

  contentEl.addEventListener('focusin', handleFocusIn);
  contentEl.addEventListener('focusout', handleFocusOut);
  contentEl.addEventListener('input', handleInput);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportScroll, { passive: true });
  } else {
    window.addEventListener('resize', handleViewportResize);
  }

  window.addEventListener('orientationchange', handleOrientationChange);
  setKeyboardHeight(0);
  setAccessoryInset(0);
  setVisibleViewportHeight(window.visualViewport?.height || window.innerHeight);
  updateKeyboardState(document.activeElement as HTMLElement | null);

  return () => {
    contentEl.removeEventListener('focusin', handleFocusIn);
    contentEl.removeEventListener('focusout', handleFocusOut);
    contentEl.removeEventListener('input', handleInput);

    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleViewportResize);
      window.visualViewport.removeEventListener('scroll', handleViewportScroll);
    } else {
      window.removeEventListener('resize', handleViewportResize);
    }

    window.removeEventListener('orientationchange', handleOrientationChange);
    document.documentElement.style.removeProperty('--keyboard-height');
    modalEl.style.removeProperty('--keyboard-height');
    modalEl.style.removeProperty('--keyboard-accessory-inset');
    modalEl.style.removeProperty('--keyboard-offset');
    modalEl.style.removeProperty('--quick-input-visible-viewport-height');
    modalEl.classList.remove('think-quick-input-keyboard-active');
    modalEl.classList.remove('think-quick-input-keyboard-detected');
    modalEl.classList.remove('think-quick-input-keyboard-suspected');
  };
}
