// src/platform/obsidian/modals/modalBackdropGuard.ts
/**
 * Prevent selected Promise-based modals from closing on a direct backdrop click.
 *
 * Important boundary rule:
 * - only the backdrop itself may be cancelled;
 * - events originating from modal descendants must never be swallowed;
 * - pointer events are sufficient in current Obsidian/Electron runtimes, so we do
 *   not register scroll-blocking touchstart listeners.
 */

const BACKDROP_CLOSE_EVENTS = ['pointerdown', 'click'] as const;

interface ObsidianModalWithBackdrop {
  bgEl?: HTMLElement | null;
}

export function installBackdropCloseGuard(modal: unknown): () => void {
  const bgEl = (modal as ObsidianModalWithBackdrop).bgEl;
  if (!bgEl) return () => undefined;

  const stopDirectBackdropClose = (event: Event) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const options: AddEventListenerOptions = { capture: true };
  BACKDROP_CLOSE_EVENTS.forEach((eventName) => {
    bgEl.addEventListener(eventName, stopDirectBackdropClose, options);
  });

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    BACKDROP_CLOSE_EVENTS.forEach((eventName) => {
      bgEl.removeEventListener(eventName, stopDirectBackdropClose, options);
    });
  };
}
