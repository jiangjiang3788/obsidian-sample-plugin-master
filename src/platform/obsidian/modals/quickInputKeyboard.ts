// Mobile keyboard viewport handling for QuickInputModal.
// VisualViewport reports the visible region above the software keyboard in
// iOS WebKit; CSS 100dvh alone does not reliably subtract the keyboard.

interface KeyboardDetectionHost {
  contentEl: HTMLElement;
  modalEl: HTMLElement;
}

export interface QuickInputKeyboardViewportInput {
  baselineViewportHeight: number;
  viewportHeight: number;
  viewportTop?: number;
  focused: boolean;
}

export function resolveQuickInputKeyboardViewportState(input: QuickInputKeyboardViewportInput) {
  const heightDiff = Math.max(0, Math.round(input.baselineViewportHeight - input.viewportHeight));
  const detected = input.focused && heightDiff > 150;
  return {
    detected,
    keyboardHeight: detected ? heightDiff : 0,
    viewportBottom: (input.viewportTop || 0) + input.viewportHeight,
    // For WebViews which do not expose keyboard resize, reserve space only
    // after focus has been stable for a short time (see fallback below).
    anticipatedInset: input.focused && !detected
      ? Math.min(320, Math.max(220, Math.round(input.baselineViewportHeight * 0.34)))
      : 0,
  };
}

function setCssPx(el: HTMLElement, name: string, height: number): void {
  const value = `${Math.max(0, Math.round(height))}px`;
  if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}

function isKeyboardInput(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable;
}

/** A blank-space tap changes focus, never the Record draft or Modal lifecycle. */
export function shouldDismissQuickInputKeyboard(
  target: EventTarget | null,
  active: Element | null,
  host: HTMLElement,
): active is HTMLElement {
  if (!isKeyboardInput(active) || !host.contains(active)) return false;
  if (!(target instanceof Element) || !host.contains(target)) return false;
  // A tap on a real control should keep its normal action (and any IME commit).
  return !target.closest([
    'input', 'textarea', 'select', 'button', 'a', 'label', 'summary',
    '[contenteditable]', '[role="button"]', '[role="option"]', '[role="tab"]',
    '[role="textbox"]', '[role="combobox"]', '[tabindex]:not([tabindex="-1"])',
  ].join(','));
}

export function setupQuickInputKeyboardDetection(host: KeyboardDetectionHost): () => void {
  const { contentEl, modalEl } = host;
  let baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
  let focusedAt = Date.now();
  let disposed = false;
  let visibilityFrame = 0;
  let viewportFrame = 0;
  const scheduledTimers = new Set<number>();

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      scheduledTimers.delete(id);
      if (!disposed) callback();
    }, delay);
    scheduledTimers.add(id);
  };

  const hasActiveKeyboardInput = () => {
    const activeElement = document.activeElement;
    return !!activeElement && contentEl.contains(activeElement) && isKeyboardInput(activeElement);
  };

  const getBodyContainer = () => contentEl.querySelector('.think-modal__body') as HTMLElement | null;

  const ensureTargetVisible = (target?: HTMLElement | null) => {
    if (disposed) return;
    const activeTarget = target && contentEl.contains(target) ? target : (document.activeElement as HTMLElement | null);
    if (!activeTarget || !isKeyboardInput(activeTarget) || !contentEl.contains(activeTarget)) return;

    const container = getBodyContainer();
    if (!container) return;

    // Align the editable surface itself. The old row-level anchor could be
    // taller than the viewport when a textarea held a large dictated passage.
    const node = activeTarget.tagName === 'TEXTAREA'
      ? activeTarget
      : (activeTarget.closest('.think-form-row, .think-inline-field-row, .think-textarea-row') as HTMLElement | null) || activeTarget;
    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const safeTop = containerRect.top + 12;
    const safeBottom = containerRect.bottom - 12;
    const availableHeight = Math.max(0, safeBottom - safeTop);
    if (availableHeight <= 0) return;

    const textarea = activeTarget instanceof HTMLTextAreaElement ? activeTarget : null;
    const typingAtEnd = !!textarea && textarea.selectionEnd >= textarea.value.length;

    if (nodeRect.height > availableHeight) {
      // If the editor is taller than its scrollport, do not chase its bottom
      // while the user edits earlier text. Let WebKit scroll the caret inside
      // the textarea and reveal its lower edge only when appending text.
      if (typingAtEnd && nodeRect.bottom > safeBottom) {
        container.scrollTop += nodeRect.bottom - safeBottom + 8;
      } else if (nodeRect.top > safeTop) {
        container.scrollTop += nodeRect.top - safeTop;
      } else if (nodeRect.bottom < safeBottom) {
        container.scrollTop -= safeBottom - nodeRect.bottom;
      }
    } else if (nodeRect.bottom > safeBottom) {
      container.scrollTop += nodeRect.bottom - safeBottom + 8;
    } else if (nodeRect.top < safeTop) {
      container.scrollTop -= safeTop - nodeRect.top + 8;
    }
    // Do not force textarea.scrollTop to the bottom: it moves the caret's
    // visible region away when someone edits the middle of a long passage.
  };

  const updateKeyboardState = (target?: HTMLElement | null) => {
    if (disposed) return;
    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height || window.innerHeight;
    const viewportTop = viewport?.offsetTop || 0;
    const focused = hasActiveKeyboardInput();
    const state = resolveQuickInputKeyboardViewportState({
      baselineViewportHeight,
      viewportHeight,
      viewportTop,
      focused,
    });
    // Some embedded iOS WebViews never emit a useful VisualViewport resize.
    // In that case use a delayed, conservative keyboard-height estimate.
    const fallback = focused && !state.detected && Date.now() - focusedAt >= 450;
    const availableHeight = Math.max(190, viewportHeight - (fallback ? state.anticipatedInset : 0) - 16);

    modalEl.classList.toggle('think-quick-input-keyboard-detected', state.detected);
    modalEl.classList.toggle('think-quick-input-keyboard-suspected', focused);
    modalEl.classList.toggle('think-quick-input-keyboard-fallback', fallback);
    setCssPx(modalEl, '--keyboard-height', state.keyboardHeight);
    setCssPx(modalEl, '--think-qif-visible-height', availableHeight);
    setCssPx(modalEl, '--think-qif-visible-top', viewportTop);
    setCssPx(modalEl, '--think-qif-textarea-max-height', Math.max(128, Math.min(320, availableHeight * 0.48)));
    setCssPx(document.documentElement, '--keyboard-height', state.keyboardHeight);

    if (!focused && viewportHeight >= baselineViewportHeight - 1) {
      baselineViewportHeight = viewportHeight;
    }

    if (focused) ensureTargetVisible(target);
  };

  const scheduleViewportUpdate = () => {
    if (disposed || viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(() => {
      viewportFrame = 0;
      updateKeyboardState();
    });
  };

  const scheduleVisibility = () => {
    if (disposed || visibilityFrame) return;
    // A second frame lets the controlled editor render and auto-size before
    // measuring it. Coalesce bursts of IME input into one scroll adjustment.
    visibilityFrame = window.requestAnimationFrame(() => {
      visibilityFrame = window.requestAnimationFrame(() => {
        visibilityFrame = 0;
        ensureTargetVisible();
      });
    });
  };

  const handleFocusIn = (event: FocusEvent) => {
    if (!isKeyboardInput(event.target)) return;
    focusedAt = Date.now();
    updateKeyboardState(event.target);
    scheduleTimeout(() => updateKeyboardState(), 120);
    scheduleTimeout(() => updateKeyboardState(), 280);
    scheduleTimeout(() => updateKeyboardState(), 540);
  };

  const handleFocusOut = () => scheduleTimeout(() => updateKeyboardState(), 60);
  const dismissOnBlankPointer = (event: PointerEvent) => {
    if (!shouldDismissQuickInputKeyboard(event.target, document.activeElement, modalEl)) return;
    // Focusout/compositionend commit the final dictated text to the same draft.
    // Do not preventDefault: that could suppress a WebKit IME commit.
    (document.activeElement as HTMLElement).blur();
  };
  const handleInput = (event: Event) => {
    if (isKeyboardInput(event.target)) scheduleVisibility();
  };
  const handleCompositionEnd = (event: CompositionEvent) => {
    if (isKeyboardInput(event.target)) {
      scheduleVisibility();
      scheduleTimeout(() => ensureTargetVisible(), 70);
    }
  };

  const handleOrientationChange = () => scheduleTimeout(() => {
    if (!hasActiveKeyboardInput()) {
      baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
    } else {
      baselineViewportHeight = Math.max(window.innerHeight, window.visualViewport?.height || 0);
    }
    updateKeyboardState();
  }, 500);

  contentEl.addEventListener('focusin', handleFocusIn);
  modalEl.addEventListener('pointerdown', dismissOnBlankPointer, true);
  contentEl.addEventListener('focusout', handleFocusOut);
  contentEl.addEventListener('input', handleInput, true);
  contentEl.addEventListener('compositionend', handleCompositionEnd, true);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportUpdate);
    window.visualViewport.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
  } else {
    window.addEventListener('resize', scheduleViewportUpdate);
  }
  window.addEventListener('orientationchange', handleOrientationChange);
  updateKeyboardState();

  return () => {
    disposed = true;
    contentEl.removeEventListener('focusin', handleFocusIn);
    modalEl.removeEventListener('pointerdown', dismissOnBlankPointer, true);
    contentEl.removeEventListener('focusout', handleFocusOut);
    contentEl.removeEventListener('input', handleInput, true);
    contentEl.removeEventListener('compositionend', handleCompositionEnd, true);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', scheduleViewportUpdate);
      window.visualViewport.removeEventListener('scroll', scheduleViewportUpdate);
    } else {
      window.removeEventListener('resize', scheduleViewportUpdate);
    }
    window.removeEventListener('orientationchange', handleOrientationChange);
    scheduledTimers.forEach((id) => window.clearTimeout(id));
    if (visibilityFrame) window.cancelAnimationFrame(visibilityFrame);
    if (viewportFrame) window.cancelAnimationFrame(viewportFrame);
    document.documentElement.style.removeProperty('--keyboard-height');
    for (const property of [
      '--keyboard-height',
      '--think-qif-visible-height',
      '--think-qif-visible-top',
      '--think-qif-textarea-max-height',
    ]) modalEl.style.removeProperty(property);
    modalEl.classList.remove(
      'think-quick-input-keyboard-detected',
      'think-quick-input-keyboard-suspected',
      'think-quick-input-keyboard-fallback',
    );
  };
}
