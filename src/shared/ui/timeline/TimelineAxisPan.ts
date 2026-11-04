/**
 * Timeline scroll ownership (2026-10-31 regression repair).
 *
 * Preserve the pre-1.18.3 continuous seven-column timeline. A touch selects
 * exactly one axis. Native WebView owns Y and its momentum; the timeline owns
 * X only while the finger is actually dragging, with NO synthetic X inertia,
 * snapping, or day navigation. A new touch always reads the live scrollLeft;
 * it must never reuse a horizontal coordinate from an old Y guard.
 *
 * An armed time edit or second finger preempts panning. The page's normal
 * vertical scrolling and desktop wheel/trackpad interactions are unchanged.
 */
import { TIMELINE_TOUCH_POLICY } from './TimelineTouchGesture';

export type TimelinePanAxis = 'x' | 'y';

interface FingerPan {
  id: number;
  x: number;
  y: number;
  lastY: number;
  edgeOwnedY: boolean;
  left: number;
  top: number;
  axis: TimelinePanAxis | null;
}

interface VerticalGuard {
  left: number;
  lastTop: number;
  lastMotionAt: number;
  releasedAt: number | null;
}

// Mobile gestures are vertically biased: a casual diagonal should not move
// across day columns. Desktop trackpad remains compatible with prior behavior.
const TOUCH_SLOP = Math.max(16, TIMELINE_TOUCH_POLICY.panSlopPx);
const TOUCH_X_DOMINANCE = 2.0;
const WHEEL_X_DOMINANCE = 1.3;
const WHEEL_BURST_MS = 150;
const WHEEL_EPSILON = 0.5;
const VERTICAL_IDLE_MS = 300;
// iOS 的 Y 惯性滚动可能在 touchcancel 后 800ms 才再次触发 scroll。
// 延长最小保护期，且仅在观察到 Y 静止后才释放水平位置锁。
const RELEASE_SETTLE_MS = 900;

export function resolveTimelinePanAxis(dx: number, dy: number): TimelinePanAxis | null {
  if (Math.hypot(dx, dy) < TOUCH_SLOP) return null;
  return Math.abs(dx) > Math.abs(dy) * TOUCH_X_DOMINANCE ? 'x' : 'y';
}

export function attachTimelineAxisLockedPan(
  surface: HTMLElement,
  isTimeEditing: () => boolean = () => false,
): () => void {
  let finger: FingerPan | null = null;
  let vertical: VerticalGuard | null = null;
  let correctionFrame: number | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let wheelAxis: TimelinePanAxis | null = null;
  let lastWheelAt = -Infinity;
  let detached = false;

  const stopCorrection = () => {
    if (correctionFrame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(correctionFrame);
    correctionFrame = null;
  };
  const stopIdleTimer = () => {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = null;
  };
  const scrollX = (left: number) => {
    const maximum = Math.max(0, surface.scrollWidth - surface.clientWidth);
    const clamped = Math.max(0, Math.min(maximum, left));
    if (surface.scrollLeft !== clamped) surface.scrollLeft = clamped;
  };
  const clearVertical = () => {
    stopIdleTimer();
    stopCorrection();
    vertical = null;
  };
  const scheduleIdleCheck = () => {
    stopIdleTimer();
    const guard = vertical;
    if (!guard || guard.releasedAt === null || detached) return;
    const readyAt = Math.max(guard.releasedAt + RELEASE_SETTLE_MS,
      guard.lastMotionAt + VERTICAL_IDLE_MS);
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (detached || vertical !== guard) return;
      const now = Date.now();
      if (now >= guard.releasedAt! + RELEASE_SETTLE_MS &&
          now >= guard.lastMotionAt + VERTICAL_IDLE_MS) clearVertical();
      else scheduleIdleCheck();
    }, Math.max(1, readyAt - Date.now()));
  };
  const observeVertical = () => {
    const guard = vertical;
    if (!guard || detached) return;
    const top = surface.scrollTop;
    if (top !== guard.lastTop) {
      guard.lastTop = top;
      guard.lastMotionAt = Date.now();
    }
    // Guard the day position only; never fight native Y momentum.
    if (surface.scrollLeft !== guard.left) {
      scrollX(guard.left);
      guard.lastMotionAt = Date.now();
    }
    if (guard.releasedAt !== null) scheduleIdleCheck();
  };
  const scheduleCorrection = () => {
    if (correctionFrame !== null || typeof requestAnimationFrame !== 'function') return;
    correctionFrame = requestAnimationFrame(() => {
      correctionFrame = null;
      observeVertical();
    });
  };
  const lockVertical = (left: number) => {
    clearVertical();
    vertical = {
      left, lastTop: surface.scrollTop,
      lastMotionAt: Date.now(), releasedAt: null,
    };
    observeVertical();
  };
  const releaseVertical = () => {
    if (!vertical || vertical.releasedAt !== null) return;
    vertical.releasedAt = Date.now();
    observeVertical();
    scheduleCorrection();
    scheduleIdleCheck();
  };

  const start = (event: TouchEvent) => {
    // Crucial regression fix: never inherit an old vertical guard's X when a
    // new finger lands. That produced 484px jumps in the iPhone schema-2 log.
    clearVertical();
    finger = null;
    if (event.touches.length !== 1) return;
    const touch = event.touches.item(0);
    if (!touch) return;
    finger = {
      id: touch.identifier, x: touch.clientX, y: touch.clientY, lastY: touch.clientY, edgeOwnedY: false,
      left: surface.scrollLeft, top: surface.scrollTop, axis: null,
    };
  };
  const move = (event: TouchEvent) => {
    const current = finger;
    if (!current) return;
    if (event.touches.length !== 1) {
      if (current.axis === 'y') releaseVertical();
      finger = null;
      return;
    }
    const touch = event.touches.item(0);
    if (!touch || touch.identifier !== current.id) {
      if (current.axis === 'y') releaseVertical();
      finger = null;
      return;
    }
    if (isTimeEditing()) {
      if (event.cancelable) event.preventDefault();
      finger = null;
      return;
    }

    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    if (current.axis === null) {
      const direction = resolveTimelinePanAxis(dx, dy);
      if (!direction) return;
      // WebKit has already started native Y when touchmove is noncancelable.
      // Never take that gesture over as a JS horizontal pan.
      current.axis = direction === 'x' && !event.cancelable ? 'y' : direction;
      if (current.axis === 'y') lockVertical(current.left);
    }
    if (current.axis === 'y') {
      // Native WebView owns Y. The timeline controller is not allowed to
      // write scrollTop while the finger is scrolling vertically.
      observeVertical();
      // Native Y owns the interior. A WebKit touchmove may cross the last
      // few pixels of the inner scrollport AND start moving the dashboard in
      // the same frame. Take over ONLY that edge-crossing touchmove (if still
      // cancelable), clamp Y to the inner boundary, and keep the same finger
      // in this explicit 'Y edge' state until it ends. Do not synthesize
      // momentum and never write ancestor scroll offsets.
      const directionY = touch.clientY - current.lastY;
      current.lastY = touch.clientY;
      const maxTop = Math.max(0, surface.scrollHeight - surface.clientHeight);
      const nextTop = surface.scrollTop - directionY;
      const crossesEdge = nextTop < 0 || nextTop > maxTop;
      if (event.cancelable && (current.edgeOwnedY || crossesEdge)) {
        current.edgeOwnedY = true;
        event.preventDefault();
        surface.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
        observeVertical();
      }
      return;
    }
    current.lastY = touch.clientY;
    if (!event.cancelable) {
      // Once the browser has claimed this stream, our JS pan may not compete.
      finger = null;
      return;
    }
    event.preventDefault();
    // Horizontal owner writes ONLY scrollLeft. Never reset scrollTop to its
    // touchstart value: late native Y movement would otherwise jump backwards.
    scrollX(current.left - dx);
  };
  // The timeline is the gesture focus region. Block parent JavaScript swipe
  // recognizers for touches which ORIGINATE here, not native browser scrolling.
  // stopPropagation() does NOT stop native scroll chaining (CSS + edge guard
  // handle that separately); descendants already got their event first.
  const stopAtTimelineBoundary = (event: TouchEvent) => event.stopPropagation();
  const end = (event: TouchEvent) => {
    const current = finger;
    finger = null;
    if (current?.axis === 'y') {
      releaseVertical();
    } else if (current?.axis === null && event.type === 'touchcancel' &&
      surface.scrollTop !== current.top) {
      lockVertical(current.left);
      releaseVertical();
    }
  };
  const scroll = (event: Event) => {
    if (event.target !== surface || !vertical) return;
    observeVertical();
    scheduleCorrection();
  };
  const wheel = (event: WheelEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !event.cancelable) return;
    const x = Math.abs(event.deltaX);
    const y = Math.abs(event.deltaY);
    if (x < WHEEL_EPSILON && y < WHEEL_EPSILON) return;
    clearVertical();
    const now = Date.now();
    if (wheelAxis === null || now - lastWheelAt > WHEEL_BURST_MS) {
      wheelAxis = x > y * WHEEL_X_DOMINANCE ? 'x' : 'y';
    }
    lastWheelAt = now;
    const mixed = x >= WHEEL_EPSILON && y >= WHEEL_EPSILON;
    const offAxis = wheelAxis === 'y' ? y < WHEEL_EPSILON : x < WHEEL_EPSILON;
    if (!mixed && !offAxis) return;
    const hasRoom = wheelAxis === 'y'
      ? surface.scrollHeight > surface.clientHeight
      : surface.scrollWidth > surface.clientWidth;
    if (!hasRoom) return;
    event.preventDefault();
    if (offAxis) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2
      ? (wheelAxis === 'y' ? surface.clientHeight : surface.clientWidth) || 500 : 1;
    if (wheelAxis === 'x') scrollX(surface.scrollLeft + event.deltaX * factor);
    else surface.scrollTop += event.deltaY * factor;
  };

  surface.addEventListener('touchstart', start, { capture: true, passive: true });
  surface.addEventListener('touchstart', stopAtTimelineBoundary, { passive: true });
  surface.addEventListener('touchmove', move, { capture: true, passive: false });
  surface.addEventListener('touchmove', stopAtTimelineBoundary, { passive: true });
  surface.addEventListener('touchend', end, { capture: true, passive: true });
  surface.addEventListener('touchend', stopAtTimelineBoundary, { passive: true });
  surface.addEventListener('touchcancel', end, { capture: true, passive: true });
  surface.addEventListener('touchcancel', stopAtTimelineBoundary, { passive: true });
  surface.addEventListener('wheel', wheel, { capture: true, passive: false });
  surface.addEventListener('scroll', scroll, { capture: true, passive: true });
  return () => {
    detached = true;
    clearVertical();
    surface.removeEventListener('touchstart', start, { capture: true });
    surface.removeEventListener('touchstart', stopAtTimelineBoundary);
    surface.removeEventListener('touchmove', move, { capture: true });
    surface.removeEventListener('touchmove', stopAtTimelineBoundary);
    surface.removeEventListener('touchend', end, { capture: true });
    surface.removeEventListener('touchend', stopAtTimelineBoundary);
    surface.removeEventListener('touchcancel', end, { capture: true });
    surface.removeEventListener('touchcancel', stopAtTimelineBoundary);
    surface.removeEventListener('wheel', wheel, { capture: true });
    surface.removeEventListener('scroll', scroll, { capture: true });
    finger = null;
    wheelAxis = null;
  };
}

/** Keep pinch and edit recognition attached under one viewport lifecycle. */
export function attachTimelineViewportInteractions(
  surface: HTMLElement,
  options: {
    isTimeEditing: () => boolean;
    requestPinch: () => boolean;
    bindPinch?: (surface: HTMLElement, requestPinch: () => boolean) => () => void;
  },
): () => void {
  const detachPan = attachTimelineAxisLockedPan(surface, options.isTimeEditing);
  const detachPinch = options.bindPinch?.(surface, options.requestPinch);
  return () => {
    detachPinch?.();
    detachPan();
  };
}
