import { TIMELINE_TOUCH_POLICY, TimelineTouchGesture } from '@/shared/ui/timeline/TimelineTouchGesture';

const point = (clientX = 10, clientY = 50, identifier = 7) => ({ identifier, clientX, clientY });

describe('Timeline unified touch gesture arbitration', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  it('allows native vertical and horizontal swipe, never arms edits or creates records', () => {
    const arm = jest.fn();
    const gesture = new TimelineTouchGesture(arm);
    gesture.start(point(), 'select');
    expect(gesture.move(point(10, 72), 1)).toBe('scroll');
    jest.advanceTimersByTime(1500);
    expect(arm).not.toHaveBeenCalled();
    expect(gesture.end(point(10, 72))).toBeNull();
    gesture.start(point(), 'move');
    expect(gesture.move(point(38, 51), 1)).toBe('scroll');
    jest.advanceTimersByTime(1500);
    expect(arm).not.toHaveBeenCalled();
  });

  it('does not steal short tap, or a small drift while waiting', () => {
    const arm = jest.fn();
    const gesture = new TimelineTouchGesture(arm);
    gesture.start(point(), 'select');
    expect(gesture.move(point(12, 52), 1)).toBe('pending');
    const end = gesture.end(point(12, 52));
    expect(end?.kind).toBe('tap');
    jest.advanceTimersByTime(1500);
    expect(arm).not.toHaveBeenCalled();
  });

  it('arms only after shared long-press policy and commits one drag on release', () => {
    const arm = jest.fn();
    const gesture = new TimelineTouchGesture(arm);
    gesture.start(point(), 'resize-end');
    jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs - 1);
    expect(arm).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(arm).toHaveBeenCalledTimes(1);
    expect(arm.mock.calls[0][0].mode).toBe('resize-end');
    expect(gesture.move(point(10, 70), 1)).toBe('drag');
    expect(gesture.end(point(10, 70))?.kind).toBe('drag');
    expect(gesture.armed).toBe(false);
  });

  it('does not accidentally commit on stationary hold or cancelled pointer/touch', () => {
    const gesture = new TimelineTouchGesture(jest.fn());
    gesture.start(point(), 'select');
    jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs);
    expect(gesture.end(point())?.kind).toBe('press');
    gesture.start(point(), 'select');
    jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs);
    expect(gesture.end(point(), true)).toBeNull();
  });

  it('cancels the pending timer on multi-touch and cleanup', () => {
    const arm = jest.fn();
    const gesture = new TimelineTouchGesture(arm);
    gesture.start(point(), 'move');
    expect(gesture.move(point(), 2)).toBe('scroll');
    jest.advanceTimersByTime(1500);
    expect(arm).not.toHaveBeenCalled();
    gesture.start(point(), 'move');
    gesture.cancel();
    jest.advanceTimersByTime(1500);
    expect(arm).not.toHaveBeenCalled();
  });
});
