/**
 * Shared long-press gesture arbitration for the task blocks and empty day cells.
 *
 * A finger swipe ALWAYS belongs to the browser until a stationary long press
 * has completed. In particular, start/move never call preventDefault: iOS and
 * Android keep their native vertical/horizontal scrolling and multi-touch.
 * Pointer/mouse interactions are handled separately by the owning view.
 */
export interface TimelineTouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
}

export interface TimelineTouchAnchor<Mode extends string> extends TimelineTouchPoint {
  mode: Mode;
}

export type TimelineTouchMove = 'none' | 'pending' | 'scroll' | 'armed' | 'drag';
export type TimelineTouchEnd<Mode extends string> = {
  kind: 'tap' | 'press' | 'drag';
  anchor: TimelineTouchAnchor<Mode>;
  point: TimelineTouchPoint;
} | null;

/** Shared UX contract. Only one timer exists per touched surface. */
export const TIMELINE_TOUCH_POLICY = Object.freeze({
  longPressMs: 520,
  panSlopPx: 10,
  dragThresholdPx: 2,
});

interface ActiveTouch<Mode extends string> {
  anchor: TimelineTouchAnchor<Mode>;
  armed: boolean;
  dragging: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export class TimelineTouchGesture<Mode extends string> {
  private active: ActiveTouch<Mode> | null = null;

  constructor(private readonly onArm: (anchor: TimelineTouchAnchor<Mode>) => void) {}

  start(point: TimelineTouchPoint, mode: Mode, touchCount = 1): boolean {
    this.cancel();
    if (touchCount !== 1) return false;
    const anchor = { identifier: point.identifier, clientX: point.clientX, clientY: point.clientY, mode };
    const current: ActiveTouch<Mode> = { anchor, armed: false, dragging: false, timer: null };
    current.timer = setTimeout(() => {
      if (this.active !== current) return;
      current.timer = null;
      current.armed = true;
      this.onArm(anchor);
    }, TIMELINE_TOUCH_POLICY.longPressMs);
    this.active = current;
    return true;
  }

  move(point: TimelineTouchPoint, touchCount: number): TimelineTouchMove {
    const current = this.active;
    if (!current || current.anchor.identifier !== point.identifier) {
      if (touchCount !== 1) this.cancel();
      return 'none';
    }
    if (touchCount !== 1) {
      this.cancel();
      return 'scroll';
    }
    const dx = point.clientX - current.anchor.clientX;
    const dy = point.clientY - current.anchor.clientY;
    if (!current.armed) {
      if (Math.hypot(dx, dy) <= TIMELINE_TOUCH_POLICY.panSlopPx) return 'pending';
      this.cancel();
      return 'scroll';
    }
    if (!current.dragging && Math.abs(dy) < TIMELINE_TOUCH_POLICY.dragThresholdPx) return 'armed';
    current.dragging = true;
    return 'drag';
  }

  end(point: TimelineTouchPoint, cancelled = false): TimelineTouchEnd<Mode> {
    const current = this.active;
    if (!current || current.anchor.identifier !== point.identifier) return null;
    this.cancel();
    if (cancelled) return null;
    const moved = Math.abs(point.clientY - current.anchor.clientY) >= TIMELINE_TOUCH_POLICY.dragThresholdPx;
    return {
      kind: !current.armed ? 'tap' : (current.dragging || moved ? 'drag' : 'press'),
      anchor: current.anchor,
      point,
    };
  }

  cancel(): void {
    if (this.active?.timer !== null && this.active?.timer !== undefined) clearTimeout(this.active.timer);
    this.active = null;
  }

  get armed(): boolean { return !!this.active?.armed; }
  get pending(): boolean { return !!this.active; }
}

/** A TouchList is not always iterable on legacy Android WebViews. */
export function findTimelineTouch(touches: TouchList | undefined, identifier: number): Touch | null {
  if (!touches) return null;
  for (let i = 0; i < touches.length; i += 1) {
    const touch = touches.item(i);
    if (touch?.identifier === identifier) return touch;
  }
  return null;
}
