/** @covers F089/unit */
import { attachTimelineAxisLockedPan, attachTimelineViewportInteractions, resolveTimelinePanAxis } from '@/shared/ui/timeline/TimelineAxisPan';

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

  it('prefers vertical for nearly diagonal input and restores WebView X drift', () => {
    expect(resolveTimelinePanAxis(5, 5)).toBeNull();
    expect(resolveTimelinePanAxis(20, 17)).toBe('y');
    expect(resolveTimelinePanAxis(25, 10)).toBe('x');
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 100);
    surface.scrollLeft = 205; // Simulate a WebView/ancestor leaking X while panning Y.
    surface.scrollTop = 170;
    const first = sendTouch(surface, 'touchmove', 80, 83);
    const second = sendTouch(surface, 'touchmove', 50, 45);
    expect(first.defaultPrevented).toBe(false);
    expect(second.defaultPrevented).toBe(false);
    expect(surface.scrollLeft).toBe(200);
    expect(surface.scrollTop).toBe(170);
    sendTouch(surface, 'touchend', 50, 45);
    surface.scrollLeft = 214;
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.scrollLeft).toBe(200);
    detach();
  });

  it('uses one binding lifecycle for axis lock and pinch, then tears both down', () => {
    const bindPinch = jest.fn(() => jest.fn());
    const detach = attachTimelineViewportInteractions(surface, {
      isTimeEditing: () => false, requestPinch: () => true, bindPinch,
    });
    expect(bindPinch).toHaveBeenCalledTimes(1);
    sendTouch(surface, 'touchstart', 100, 100);
    sendTouch(surface, 'touchmove', 10, 90);
    expect(surface.scrollLeft).toBe(290);
    detach();
    expect(bindPinch.mock.results[0].value).toHaveBeenCalledTimes(1);
    sendTouch(surface, 'touchstart', 100, 100);
    sendTouch(surface, 'touchmove', 0, 90);
    expect(surface.scrollLeft).toBe(290);
  });

  it('locks mostly horizontal swipes to X without writing the Y axis', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 100);
    surface.scrollTop = 142; // Simulate an early browser orthogonal drift.
    const move = sendTouch(surface, 'touchmove', 30, 91);
    expect(move.defaultPrevented).toBe(true);
    expect(surface.scrollLeft).toBe(270);
    expect(surface.scrollTop).toBe(142); // The X owner must not rewind native Y.
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

/** Regression for real iOS schema-2 logs: X moved hundreds of pixels only
 * after touchend while Y continued scrolling for more than 750ms. */
describe('Timeline Y momentum ownership regression', () => {
  let surface: HTMLDivElement;
  beforeEach(() => {
    jest.useFakeTimers();
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
  afterEach(() => {
    surface.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps the day column stable until Y inertia is truly idle', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 300);
    sendTouch(surface, 'touchmove', 170, 135);
    sendTouch(surface, 'touchend', 170, 135);
    for (let elapsed = 0; elapsed < 1500; elapsed += 100) {
      jest.advanceTimersByTime(100);
      surface.scrollTop += 18;
      surface.scrollLeft = 230 + (elapsed % 300);
      surface.dispatchEvent(new Event('scroll'));
      expect(surface.scrollLeft).toBe(200);
    }
    jest.advanceTimersByTime(400);
    // A different, deliberate scroll after inertial Y has stopped is allowed.
    surface.scrollLeft = 250;
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.scrollLeft).toBe(250);
    detach();
  });

  it('does not drop the Y guard on a native touchcancel', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 300);
    sendTouch(surface, 'touchmove', 110, 160);
    sendTouch(surface, 'touchcancel', 110, 160);
    jest.advanceTimersByTime(800);
    surface.scrollTop += 200;
    surface.scrollLeft = 310;
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.scrollLeft).toBe(200);
    detach();
  });

  it('does not leave a permanent lock after a second finger interrupts Y', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 100, 300);
    sendTouch(surface, 'touchmove', 103, 180);
    sendTouch(surface, 'touchstart', 103, 180, 2);
    sendTouch(surface, 'touchend', 103, 180);
    jest.advanceTimersByTime(400);
    surface.scrollLeft = 240;
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.scrollLeft).toBe(240);
    detach();
  });
});

/** Regression from 2026-10-31 iPhone logs. Keep the existing seven-day view. */
describe('Timeline 1.18.4 horizontal rebound prevention', () => {
  let surface: HTMLDivElement;
  beforeEach(() => {
    jest.useFakeTimers();
    surface = document.createElement('div');
    Object.defineProperties(surface, {
      scrollWidth: { configurable: true, value: 912 },
      clientWidth: { configurable: true, value: 428 },
      scrollHeight: { configurable: true, value: 2600 },
      clientHeight: { configurable: true, value: 500 },
    });
    surface.scrollLeft = 100;
    surface.scrollTop = 200;
    document.body.appendChild(surface);
  });
  afterEach(() => {
    surface.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not continue a 105px horizontal drag when the finger is lifted', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(surface, 'touchstart', 260, 160);
    const move = sendTouch(surface, 'touchmove', 155, 145);
    expect(move.defaultPrevented).toBe(true);
    expect(surface.scrollLeft).toBe(205);
    sendTouch(surface, 'touchend', 155, 145);
    jest.advanceTimersByTime(1800);
    expect(surface.scrollLeft).toBe(205);
    detach();
  });

  it('can reach the right edge, stop exactly there, and reverse without snapping', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    surface.scrollLeft = 0;
    for (const pixels of [180, 180, 124]) {
      sendTouch(surface, 'touchstart', 300, 180);
      sendTouch(surface, 'touchmove', 300 - pixels, 178);
      sendTouch(surface, 'touchend', 300 - pixels, 178);
      jest.advanceTimersByTime(1000);
    }
    expect(surface.scrollLeft).toBe(484);
    sendTouch(surface, 'touchstart', 100, 180);
    sendTouch(surface, 'touchmove', 150, 178);
    sendTouch(surface, 'touchend', 150, 178);
    jest.advanceTimersByTime(1000);
    expect(surface.scrollLeft).toBe(434);
    detach();
  });

  it('never reuses the left coordinate from a preceding Y-momentum guard', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    surface.scrollLeft = 440;
    sendTouch(surface, 'touchstart', 240, 200);
    sendTouch(surface, 'touchmove', 250, 140);
    sendTouch(surface, 'touchend', 250, 140);
    surface.scrollLeft = 390;
    sendTouch(surface, 'touchstart', 250, 210);
    sendTouch(surface, 'touchmove', 210, 210);
    expect(surface.scrollLeft).toBe(430);
    sendTouch(surface, 'touchend', 210, 210);
    detach();
  });

  it('prevents an X swipe from bubbling to the Obsidian parent after child handling', () => {
    const detach = attachTimelineAxisLockedPan(surface);
    const parent = jest.fn();
    document.body.addEventListener('touchmove', parent);
    const child = document.createElement('div');
    surface.appendChild(child);
    sendTouch(child, 'touchstart', 240, 160);
    sendTouch(child, 'touchmove', 155, 150);
    expect(parent).not.toHaveBeenCalled();
    sendTouch(child, 'touchend', 155, 150);
    sendTouch(child, 'touchstart', 240, 160);
    sendTouch(child, 'touchmove', 250, 90);
    expect(parent).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('touchmove', parent);
    detach();
  });
});


describe('Timeline nested gesture ownership', () => {
  let surface: HTMLDivElement;
  beforeEach(() => {
    surface = document.createElement('div');
    Object.defineProperties(surface, {
      scrollWidth: { configurable: true, value: 1000 },
      clientWidth: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1600 },
      clientHeight: { configurable: true, value: 400 },
    });
    surface.scrollLeft = 160;
    surface.scrollTop = 200;
    document.body.appendChild(surface);
  });
  afterEach(() => surface.remove());

  it('does not let parent JS see timeline-origin Y while leaving browser Y native', () => {
    const outside = jest.fn();
    document.body.addEventListener('touchmove', outside);
    const child = document.createElement('div');
    surface.appendChild(child);
    const detach = attachTimelineAxisLockedPan(surface);
    sendTouch(child, 'touchstart', 100, 230);
    const move = sendTouch(child, 'touchmove', 110, 100);
    expect(move.defaultPrevented).toBe(false);
    expect(outside).not.toHaveBeenCalled();
    sendTouch(child, 'touchend', 110, 100);
    detach();
    document.body.removeEventListener('touchmove', outside);
  });

  it('prevents outward native Y chaining at a cancelable boundary but permits inward Y', () => {
    surface.scrollTop = 1200;
    const detach = attachTimelineAxisLockedPan(surface);
    surface.scrollTop = 1175; // 25px from bottom
    sendTouch(surface, 'touchstart', 100, 200);
    expect(sendTouch(surface, 'touchmove', 100, 80).defaultPrevented).toBe(true);
    expect(surface.scrollTop).toBe(1200);
    expect(sendTouch(surface, 'touchmove', 100, 140).defaultPrevented).toBe(true);
    expect(surface.scrollTop).toBe(1140);
    sendTouch(surface, 'touchend', 100, 140);
    surface.scrollTop = 1200;
    sendTouch(surface, 'touchstart', 100, 200);
    expect(sendTouch(surface, 'touchmove', 100, 320).defaultPrevented).toBe(false);
    sendTouch(surface, 'touchend', 100, 320);
    detach();
  });
});
