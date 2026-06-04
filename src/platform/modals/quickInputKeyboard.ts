// src/platform/modals/quickInputKeyboard.ts
// Mobile keyboard viewport handling for QuickInputModal.
// Kept outside the modal class so the modal stays focused on lifecycle + rendering.

interface KeyboardDetectionHost {
  contentEl: HTMLElement;
  modalEl: HTMLElement;
}

function setCssPx(el: HTMLElement, name: string, height: number): void {
  el.style.setProperty(name, `${Math.max(0, Math.round(height))}px`);
}

function isKeyboardInput(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable;
}

export function setupQuickInputKeyboardDetection(host: KeyboardDetectionHost): () => void {
  const { contentEl, modalEl } = host;
  let baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
  const keyboardActivationThreshold = 150;
  const suspectedBottomInset = 156;
  const detectedBottomInsetExtra = 120;

  const setKeyboardHeight = (height: number) => {
    setCssPx(modalEl, '--keyboard-height', height);
    setCssPx(document.documentElement, '--keyboard-height', height);
  };

  const setAccessoryInset = (height: number) => {
    setCssPx(modalEl, '--keyboard-accessory-inset', height);
  };

  const hasActiveKeyboardInput = () => {
    const activeElement = document.activeElement;
    return !!activeElement && contentEl.contains(activeElement) && isKeyboardInput(activeElement);
  };

  const getBodyContainer = () => contentEl.querySelector('.think-modal__body') as HTMLElement | null;

  const ensureTargetVisible = (target?: HTMLElement | null) => {
    const activeTarget = target && contentEl.contains(target) ? target : (document.activeElement as HTMLElement | null);
    if (!activeTarget || !isKeyboardInput(activeTarget) || !contentEl.contains(activeTarget)) return;

    const container = getBodyContainer();
    if (!container) return;

    const anchor = activeTarget.closest('.think-form-row, .think-inline-field-row, .think-textarea-row') as HTMLElement | null;
    const node = anchor || activeTarget;
    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const accessoryInset = Number.parseInt(modalEl.style.getPropertyValue('--keyboard-accessory-inset') || '0', 10) || suspectedBottomInset;
    const safeTop = containerRect.top + 12;
    const safeBottom = containerRect.bottom - Math.max(72, accessoryInset);

    if (nodeRect.bottom > safeBottom) {
      container.scrollTop += nodeRect.bottom - safeBottom + 28;
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
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const heightDiff = Math.max(0, Math.round(baselineViewportHeight - viewportHeight));
    const hasFocusedInput = hasActiveKeyboardInput();
    const detected = heightDiff > keyboardActivationThreshold && hasFocusedInput;
    const suspected = hasFocusedInput;

    modalEl.classList.toggle('keyboard-detected', detected);
    modalEl.classList.toggle('keyboard-suspected', suspected);

    if (detected) {
      setKeyboardHeight(heightDiff);
      setAccessoryInset(heightDiff + detectedBottomInsetExtra);
      const offsetTop = window.visualViewport?.offsetTop || 0;
      modalEl.style.setProperty('--keyboard-offset', `${offsetTop}px`);
    } else if (suspected) {
      setKeyboardHeight(0);
      setAccessoryInset(suspectedBottomInset);
      modalEl.style.removeProperty('--keyboard-offset');
    } else {
      setKeyboardHeight(0);
      setAccessoryInset(0);
      modalEl.style.removeProperty('--keyboard-offset');
    }

    if (heightDiff <= 0 && !hasFocusedInput) {
      baselineViewportHeight = viewportHeight;
    }

    if (suspected) {
      ensureTargetVisible(target);
    }
  };

  const scheduleVisibilityPasses = (target?: HTMLElement | null) => {
    const run = () => updateKeyboardState(target);
    requestAnimationFrame(run);
    window.setTimeout(run, 120);
    window.setTimeout(run, 260);
    window.setTimeout(run, 420);
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!isKeyboardInput(target)) return;
    scheduleVisibilityPasses(target);
  };

  const handleFocusOut = (event: FocusEvent) => {
    if (!(event.target instanceof HTMLElement)) {
      window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
      return;
    }
    if (!contentEl.contains(event.target)) {
      window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
      return;
    }
    window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
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

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportScroll, { passive: true });
  } else {
    window.addEventListener('resize', handleViewportResize);
  }

  window.addEventListener('orientationchange', handleOrientationChange);
  setKeyboardHeight(0);
  setAccessoryInset(0);
  updateKeyboardState(document.activeElement as HTMLElement | null);

  return () => {
    contentEl.removeEventListener('focusin', handleFocusIn);
    contentEl.removeEventListener('focusout', handleFocusOut);

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
    modalEl.classList.remove('keyboard-detected');
    modalEl.classList.remove('keyboard-suspected');
  };
}
