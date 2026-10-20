/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useEffect, useRef } from 'preact/hooks';
import { useTimelineZoom } from '@core/view/public';

function touch(identifier: number, x: number, y: number): Touch {
  return { identifier, clientX: x, clientY: y } as Touch;
}

function list(items: Touch[]): TouchList {
  return { length: items.length, item: (index: number) => items[index] ?? null } as TouchList;
}

function touchEvent(type: string, active: Touch[], changed: Touch[]): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { configurable: true, value: list(active) });
  Object.defineProperty(event, 'changedTouches', { configurable: true, value: list(changed) });
  return event;
}

const allowPinch = () => true;

function ZoomHarness({ canPinch = allowPinch }: { canPinch?: () => boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { hourHeight, zoomHandlers } = useTimelineZoom({ defaultHeight: 60, minHeight: 20, maxHeight: 200 });
  useEffect(() => {
    const surface = ref.current;
    if (surface) return zoomHandlers.bindTouchSurface(surface, canPinch);
  }, [zoomHandlers.bindTouchSurface, canPinch]);
  return (
    <div class="zoom-harness" ref={ref} data-hour-height={String(hourHeight)} onWheel={zoomHandlers.onWheel}>
      <div class="timeline-scrollable-body" onTouchStart={(event) => event.stopPropagation()} />
    </div>
  );
}

describe('Timeline iOS/Android native touch zoom', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('reserves one finger for scrolling and time-range dragging, never zoom', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const aMoved = touch(1, 20, 220);
    const start = touchEvent('touchstart', [a], [a]);
    const move = touchEvent('touchmove', [aMoved], [aMoved]);
    await act(async () => {
      target.dispatchEvent(start);
      target.dispatchEvent(move);
      target.dispatchEvent(touchEvent('touchend', [], [aMoved]));
    });
    expect(start.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight).toBe('60');
  });

  it('zooms by two actual local TouchEvents, even when children stop bubbling', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const b = touch(2, 20, 200);
    const far = touch(2, 20, 250);
    const first = touchEvent('touchstart', [a], [a]);
    const second = touchEvent('touchstart', [a, b], [b]);
    const move = touchEvent('touchmove', [a, far], [far]);
    await act(async () => {
      target.dispatchEvent(first);
      target.dispatchEvent(second);
      target.dispatchEvent(move);
    });
    expect(first.defaultPrevented).toBe(false);
    expect(second.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
    expect(Number((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight)).toBeCloseTo(90, 3);
  });

  it('supports iOS gesturechange fallback without applying scale twice', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const b = touch(2, 20, 200);
    const change = new Event('gesturechange', { bubbles: true, cancelable: true });
    Object.defineProperty(change, 'scale', { value: 1.5 });
    await act(async () => {
      target.dispatchEvent(touchEvent('touchstart', [a], [a]));
      target.dispatchEvent(touchEvent('touchstart', [a, b], [b]));
      target.dispatchEvent(change); // iOS variant without touchmove
    });
    expect(change.defaultPrevented).toBe(true);
    expect(Number((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight)).toBeCloseTo(90, 3);
    await act(async () => {
      target.dispatchEvent(touchEvent('touchmove', [a, touch(2, 20, 240)], [b]));
    });
    expect(Number((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight)).toBeCloseTo(84, 3);
  });

  it('does not let lost pointercancel/old finger IDs make the next single-finger drag zoom', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const b = touch(2, 20, 200);
    const c = touch(3, 20, 100);
    await act(async () => {
      target.dispatchEvent(touchEvent('touchstart', [a], [a]));
      target.dispatchEvent(touchEvent('touchstart', [a, b], [b]));
      target.dispatchEvent(new Event('pointercancel', { bubbles: true }));
      // Simulate a missed touchend: the next event's touches is authoritative.
      target.dispatchEvent(touchEvent('touchstart', [c], [c]));
      target.dispatchEvent(touchEvent('touchmove', [touch(3, 20, 240)], [c]));
      target.dispatchEvent(touchEvent('touchend', [], [c]));
    });
    expect((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight).toBe('60');
  });

  it('does not turn an already active time selection into zoom', async () => {
    const canPinch = jest.fn(() => false);
    await act(async () => render(<ZoomHarness canPinch={canPinch} />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const b = touch(2, 20, 200);
    await act(async () => {
      target.dispatchEvent(touchEvent('touchstart', [a], [a]));
      target.dispatchEvent(touchEvent('touchstart', [a, b], [b]));
      target.dispatchEvent(touchEvent('touchmove', [a, touch(2, 20, 260)], [b]));
    });
    expect(canPinch).toHaveBeenCalledTimes(1);
    expect((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight).toBe('60');
  });

  it('does not adopt a second finger started outside this timeline', async () => {
    await act(async () => render(<ZoomHarness />, host));
    const target = host.querySelector('.timeline-scrollable-body') as HTMLElement;
    const a = touch(1, 20, 100);
    const outside = touch(99, 20, 200);
    const move = touchEvent('touchmove', [a, touch(99, 20, 260)], [outside]);
    await act(async () => {
      target.dispatchEvent(touchEvent('touchstart', [a], [a]));
      target.dispatchEvent(move);
    });
    expect(move.defaultPrevented).toBe(false);
    expect((host.querySelector('.zoom-harness') as HTMLElement).dataset.hourHeight).toBe('60');
  });
});
