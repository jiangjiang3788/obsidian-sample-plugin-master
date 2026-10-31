/** @covers F089/unit */
import { attachTimelineAxisLockedPan } from '@/shared/ui/timeline/TimelineAxisPan';

function touches(points: Array<{ identifier: number; clientX: number; clientY: number }>): TouchList {
  return {
    length: points.length,
    item: (index: number) => points[index] ?? null,
    ...Object.fromEntries(points.map((point, index) => [index, point])),
  } as unknown as TouchList;
}
function sendTouch(surface: HTMLElement, type: string, x: number, y: number, count = 1) {
  const finger = { identifier: 7, clientX: x, clientY: y };
  const list = count === 2 ? touches([finger, { identifier: 8, clientX: x + 50, clientY: y }])
    : type === 'touchend' || type === 'touchcancel' ? touches([]) : touches([finger]);
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: list });
  Object.defineProperty(event, 'changedTouches', { value: touches([finger]) });
  surface.dispatchEvent(event);
  return event;
}

describe('Timeline single-axis cross-device scroll', () => {
  let surface: HTMLDivElement;
  beforeEach(() => {
    surface = document.createElement('div');
    Object.defineProperties(surface, {
      scrollWidth: { configurable: true, value: 1200 },
      clientWidth: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1600 },
      clientHeight: { configurable: true, value: 400 },
    });
    surface.scrollLeft = 200;
    surface.scrollTop = 140;
    document.body.appendChild(surface);
  });
  afterEach(() => surface.remove());

  it('locks a mostly vertical swipe to native Y without touching X', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 100);
    const move = sendTouch(surface, 'touchmove', 94, 48);
    expect(move.defaultPrevented).toBe(false);
    expect(surface.scrollLeft).toBe(200);
    detach();
  });

  it('locks mostly horizontal swipes to X and restores pre-gesture Y', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 100);
    surface.scrollTop = 142; // Simulate an early browser orthogonal drift.
    const move = sendTouch(surface, 'touchmove', 30, 91);
    expect(move.defaultPrevented).toBe(true);
    expect(surface.scrollLeft).toBe(270);
    expect(surface.scrollTop).toBe(140);
    detach();
  });

  it('does not scroll while a time edit is armed, or convert a second finger into a pan', () => {
    let editing = false;
    const detach = attachTimelineAxisLockedPan(surface, () => editing);
    sendTouch(surface, 'touchstart', 100, 100);
    editing = true;
    expect(sendTouch(surface, 'touchmove', 20, 100).defaultPrevented).toBe(true);
    expect(surface.scrollLeft).toBe(200);
    editing = false;
    sendTouch(surface, 'touchstart', 100, 100);
    sendTouch(surface, 'touchstart', 100, 100, 2);
    expect(sendTouch(surface, 'touchmove', 20, 100, 2).defaultPrevented).toBe(false);
    expect(surface.scrollLeft).toBe(200);
    detach();
  });

  it('suppresses trackpad diagonal leakage without intercepting alt-wheel zoom', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    const vertical = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 2, deltaY: 40 });
    surface.dispatchEvent(vertical);
    expect(vertical.defaultPrevented).toBe(true);
    expect(surface.scrollTop).toBe(180);
    expect(surface.scrollLeft).toBe(200);
    // Trackpad can emit an isolated X delta after the initial Y-dominant event.
    const strayX = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 3, deltaY: 0 });
    surface.dispatchEvent(strayX);
    expect(strayX.defaultPrevented).toBe(true);
    expect(surface.scrollLeft).toBe(200);
    const zoom = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 2, deltaY: -40, altKey: true });
    surface.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBe(false);
    detach();
  });
});
