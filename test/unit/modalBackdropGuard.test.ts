import { installBackdropCloseGuard } from '@/platform/obsidian/modals/modalBackdropGuard';

describe('modalBackdropGuard', () => {
  it('never cancels pointer events that start inside modal descendants', () => {
    const backdrop = document.createElement('div');
    const modalSurface = document.createElement('div');
    const saveButton = document.createElement('button');
    modalSurface.appendChild(saveButton);
    backdrop.appendChild(modalSurface);
    document.body.appendChild(backdrop);

    const cleanup = installBackdropCloseGuard({ bgEl: backdrop });
    const event = new Event('pointerdown', { bubbles: true, cancelable: true });
    saveButton.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    cleanup();
    backdrop.remove();
  });

  it('only cancels a direct backdrop close gesture and releases it after cleanup', () => {
    const backdrop = document.createElement('div');
    document.body.appendChild(backdrop);
    const cleanup = installBackdropCloseGuard({ bgEl: backdrop });

    const guarded = new Event('pointerdown', { bubbles: true, cancelable: true });
    backdrop.dispatchEvent(guarded);
    expect(guarded.defaultPrevented).toBe(true);

    cleanup();
    const afterCleanup = new Event('pointerdown', { bubbles: true, cancelable: true });
    backdrop.dispatchEvent(afterCleanup);
    expect(afterCleanup.defaultPrevented).toBe(false);
    backdrop.remove();
  });
});
