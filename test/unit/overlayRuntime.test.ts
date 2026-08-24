/** @jest-environment jsdom */
import {
  focusOverlay,
  getOverlayHost,
  getOverlayZIndex,
  isTopOverlay,
  registerOverlay,
  unregisterOverlay,
} from '@/shared/ui/overlay/OverlayRuntime';

describe('OverlayRuntime', () => {
  afterEach(() => {
    unregisterOverlay('overlay-a');
    unregisterOverlay('overlay-b');
    document.getElementById('think-overlay-host')?.remove();
  });

  it('keeps one global active order and moves focused overlays to the top', () => {
    registerOverlay('overlay-a');
    registerOverlay('overlay-b');

    expect(isTopOverlay('overlay-b')).toBe(true);
    expect(getOverlayZIndex('overlay-b')).toBeGreaterThan(getOverlayZIndex('overlay-a'));

    focusOverlay('overlay-a');
    expect(isTopOverlay('overlay-a')).toBe(true);
    expect(getOverlayZIndex('overlay-a')).toBeGreaterThan(getOverlayZIndex('overlay-b'));
  });

  it('uses a single body-level overlay host', () => {
    const first = getOverlayHost();
    const second = getOverlayHost();
    expect(second).toBe(first);
    expect(first.parentElement).toBe(document.body);
    expect(first.id).toBe('think-overlay-host');
  });
});
