/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useTimelineZoom } from '@core/view/public';
import { createPointerEvent } from '../support/uiTestUtils';

function ZoomHarness() {
  const { hourHeight, zoomHandlers } = useTimelineZoom({ defaultHeight: 60, minHeight: 20, maxHeight: 200 });
  return (
    <div class="zoom-harness" data-hour-height={String(hourHeight)} {...zoomHandlers} />
  );
}

describe('Timeline pointer zoom contract', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('keeps one-finger pointer movement native and non-cancelled', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const surface = host.querySelector('.zoom-harness') as HTMLElement;

    const down = createPointerEvent('pointerdown', {
      pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 100,
    });
    const move = createPointerEvent('pointermove', {
      pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 180,
    });

    await act(async () => {
      surface.dispatchEvent(down);
      surface.dispatchEvent(move);
      surface.dispatchEvent(createPointerEvent('pointercancel', {
        pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 180,
      }));
    });

    expect(down.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(surface.dataset.hourHeight).toBe('60');
  });

  it('zooms from two touch pointers without preventDefault touchmove arbitration', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const surface = host.querySelector('.zoom-harness') as HTMLElement;

    const firstDown = createPointerEvent('pointerdown', {
      pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 100,
    });
    const secondDown = createPointerEvent('pointerdown', {
      pointerType: 'touch', pointerId: 2, clientX: 20, clientY: 200,
    });
    const secondMove = createPointerEvent('pointermove', {
      pointerType: 'touch', pointerId: 2, clientX: 20, clientY: 250,
    });

    await act(async () => {
      surface.dispatchEvent(firstDown);
      surface.dispatchEvent(secondDown);
      surface.dispatchEvent(secondMove);
    });

    expect(secondMove.defaultPrevented).toBe(false);
    expect(Number(surface.dataset.hourHeight)).toBeCloseTo(90, 4);
  });
});
