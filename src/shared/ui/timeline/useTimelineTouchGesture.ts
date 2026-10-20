import { useEffect, useRef } from 'preact/hooks';
import { TimelineTouchGesture } from './TimelineTouchGesture';
import type { TimelineTouchAnchor } from './TimelineTouchGesture';

/** Stable per-surface controller; the callback always comes from the current render. */
export function useTimelineTouchGesture<Mode extends string>(onArm: (anchor: TimelineTouchAnchor<Mode>) => void): TimelineTouchGesture<Mode> {
  const onArmRef = useRef(onArm);
  onArmRef.current = onArm;
  const controllerRef = useRef<TimelineTouchGesture<Mode> | null>(null);
  if (!controllerRef.current) controllerRef.current = new TimelineTouchGesture<Mode>((anchor) => onArmRef.current(anchor));
  useEffect(() => () => controllerRef.current?.cancel(), []);
  return controllerRef.current;
}
