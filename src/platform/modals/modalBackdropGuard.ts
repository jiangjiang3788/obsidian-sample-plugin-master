// src/platform/modals/modalBackdropGuard.ts
/**
 * Prevent Obsidian's modal backdrop from closing selected Promise-based modals.
 *
 * Some flows must finish through explicit buttons so their Promise resolves through
 * the expected success/cancel branch. Obsidian keeps the backdrop element on the
 * Modal instance as `bgEl`, which is not part of the public TypeScript surface,
 * so the unsafe access is isolated here instead of repeated in every modal.
 */

const BACKDROP_CLOSE_EVENTS = [
  'pointerdown',
  'mousedown',
  'click',
  'touchstart',
  'touchend',
] as const;

interface ObsidianModalWithBackdrop {
  bgEl?: HTMLElement | null;
}

export function installBackdropCloseGuard(modal: unknown): () => void {
  const bgEl = (modal as ObsidianModalWithBackdrop).bgEl;
  if (!bgEl) return () => undefined;

  const stopBackdropClose = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  BACKDROP_CLOSE_EVENTS.forEach((eventName) => {
    bgEl.addEventListener(eventName, stopBackdropClose, true);
  });

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    BACKDROP_CLOSE_EVENTS.forEach((eventName) => {
      bgEl.removeEventListener(eventName, stopBackdropClose, true);
    });
  };
}
