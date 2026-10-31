/**
 * A timeline is both vertically and horizontally scrollable. Native pan-x pan-y
 * permits diagonal drift on several WebViews. Leave vertical pan to the browser
 * (including its momentum), and handle horizontal swipes on one locked axis.
 *
 * The surface uses touch-action:pan-y. This keeps ordinary page/column vertical
 * scrolling, lets the application own horizontal panning, and does not steal a
 * long-press time edit or the existing two-finger pinch controller.
 */

type PanAxis = 'x' | 'y';

interface TouchPanSession {
  id: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  axis: PanAxis | null;
}

const PAN_SLOP_PX = 10;
const WHEEL_BURST_MS = 160;

/** Attach native capture listeners so blocks and blank-cell gestures share the decision. */
export function attachTimelineAxisLockedPan(surface: HTMLElement, isTimeEditing: () => boolean = () => false): () => void {
  let touch: TouchPanSession | null = null;
  let kineticFrame: number | null = null;
  let wheelAxis: PanAxis | null = null;
  let lastWheelAt = -Infinity;

  const stopKinetic = () => {
    if (kineticFrame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(kineticFrame);
    kineticFrame = null;
  };

  const maxLeft = () => Math.max(0, surface.scrollWidth - surface.clientWidth);
  const setLeft = (left: number) => {
    surface.scrollLeft = Math.max(0, Math.min(maxLeft(), left));
  };

  const onTouchStart = (event: TouchEvent) => {
    stopKinetic();
    if (event.touches.length !== 1) { touch = null; return; }
    const finger = event.touches.item(0);
    if (!finger) return;
    touch = {
      id: finger.identifier,
      startX: finger.clientX,
      startY: finger.clientY,
      startScrollLeft: surface.scrollLeft,
      startScrollTop: surface.scrollTop,
      lastX: finger.clientX,
      lastTime: Date.now(),
      velocity: 0,
      axis: null,
    };
  };

  const onTouchMove = (event: TouchEvent) => {
    const session = touch;
    if (!session) return;
    if (event.touches.length !== 1) { touch = null; return; }
    const finger = event.touches.item(0);
    if (!finger || finger.identifier !== session.id) { touch = null; return; }
    // Only a pending stationary gesture can arm. After axis lock, the child
    // has already cancelled its long-press candidate on first movement.
    if (!session.axis && isTimeEditing()) {
      // Capture BEFORE the browser starts native pan-y. Once a stationary
      // long-press is armed, the owning child must receive its drag instead.
      if (event.cancelable) event.preventDefault();
      touch = null;
      return;
    }

    const dx = finger.clientX - session.startX;
    const dy = finger.clientY - session.startY;
    if (!session.axis) {
      if (Math.hypot(dx, dy) < PAN_SLOP_PX) return;
      // Once selected, the axis cannot change during this finger gesture.
      session.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (session.axis === 'y') return; // Browser owns native pan-y and inertia.

    if (event.cancelable) event.preventDefault();
    setLeft(session.startScrollLeft - dx);
    // Correct any early orthogonal drift; x-scrolling cannot move vertical time.
    if (surface.scrollTop !== session.startScrollTop) surface.scrollTop = session.startScrollTop;
    const now = Date.now();
    const elapsed = now - session.lastTime;
    if (elapsed > 0) {
      const sample = Math.max(-1.6, Math.min(1.6, -(finger.clientX - session.lastX) / elapsed));
      session.velocity = session.velocity * 0.45 + sample * 0.55;
    }
    session.lastX = finger.clientX;
    session.lastTime = now;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const session = touch;
    // A pinch may leave one finger on the timeline: that is not a fresh swipe.
    touch = null;
    if (!session || session.axis !== 'x' || event.type === 'touchcancel' || event.touches.length) return;
    if (Date.now() - session.lastTime > 90 || isTimeEditing()
      || Math.abs(session.velocity) < 0.12 || typeof requestAnimationFrame !== 'function') return;
    // Users requesting reduced motion should not receive a kinetic tail.
    if (surface.ownerDocument?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let velocity = session.velocity;
    let previous = 0;
    const tick = (now: number) => {
      const dt = previous ? Math.min(34, Math.max(1, now - previous)) : 16;
      previous = now;
      const before = surface.scrollLeft;
      setLeft(before + velocity * dt);
      velocity *= Math.pow(0.88, dt / 16);
      if (Math.abs(velocity) < 0.025 || before === surface.scrollLeft) {
        kineticFrame = null;
        return;
      }
      kineticFrame = requestAnimationFrame(tick);
    };
    kineticFrame = requestAnimationFrame(tick);
  };

  const onWheel = (event: WheelEvent) => {
    // Alt+wheel is the existing zoom shortcut; single-axis wheels remain native.
    if (event.altKey || event.ctrlKey || event.metaKey || !event.cancelable) return;
    const x = Math.abs(event.deltaX);
    const y = Math.abs(event.deltaY);
    if (x < 0.5 && y < 0.5) return;
    const now = Date.now();
    if (!wheelAxis || now - lastWheelAt > WHEEL_BURST_MS) {
      wheelAxis = x > y ? 'x' : 'y';
    }
    lastWheelAt = now;
    const mixed = x >= 0.5 && y >= 0.5;
    const orthogonalOnly = wheelAxis === 'y' ? y < 0.5 : x < 0.5;
    // Keep pure wheels browser-native; suppress pure off-axis jitter that occurs
    // mid-gesture on some desktop trackpads as a separate wheel event.
    if (!mixed && !orthogonalOnly) return;
    if (wheelAxis === 'y' && surface.scrollHeight <= surface.clientHeight) return;
    if (wheelAxis === 'x' && surface.scrollWidth <= surface.clientWidth) return;
    event.preventDefault();
    if (orthogonalOnly) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (surface.clientHeight || 500) : 1;
    if (wheelAxis === 'x') setLeft(surface.scrollLeft + event.deltaX * factor);
    else surface.scrollTop += event.deltaY * factor;
  };

  surface.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  surface.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  surface.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
  surface.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
  surface.addEventListener('wheel', onWheel, { capture: true, passive: false });
  return () => {
    stopKinetic();
    surface.removeEventListener('touchstart', onTouchStart, true);
    surface.removeEventListener('touchmove', onTouchMove, true);
    surface.removeEventListener('touchend', onTouchEnd, true);
    surface.removeEventListener('touchcancel', onTouchEnd, true);
    surface.removeEventListener('wheel', onWheel, true);
    touch = null;
  };
}
