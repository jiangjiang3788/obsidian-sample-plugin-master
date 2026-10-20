import { createContext } from 'preact';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { TimelineTouchGesture, type TimelineTouchAnchor, type TimelineTouchScope } from './TimelineTouchGesture';

/** Scoped to a single TimelineDailyView; no cross-tab/global gesture state. */
export const TimelineTouchScopeContext = createContext<TimelineTouchScope | null>(null);

/** Stable per-surface controller; an ancestor pinch can cancel active edits. */
export function useTimelineTouchGesture<Mode extends string>(
  onArm: (anchor: TimelineTouchAnchor<Mode>) => void,
  onPinchCancel?: (wasActive: boolean) => void,
): TimelineTouchGesture<Mode> {
  const scope = useContext(TimelineTouchScopeContext);
  const onArmRef = useRef(onArm);
  onArmRef.current = onArm;
  const onPinchCancelRef = useRef(onPinchCancel);
  onPinchCancelRef.current = onPinchCancel;
  const controllerRef = useRef<TimelineTouchGesture<Mode> | null>(null);
  if (!controllerRef.current) controllerRef.current = new TimelineTouchGesture<Mode>((anchor) => onArmRef.current(anchor));
  useEffect(() => {
    const controller = controllerRef.current;
    if (!scope || !controller) return;
    return scope.register({
      pending: () => controller.pending,
      dragging: () => controller.dragging,
      cancel: () => {
        const wasActive = controller.pending;
        controller.cancel();
        onPinchCancelRef.current?.(wasActive);
      },
    });
  }, [scope]);
  useEffect(() => () => controllerRef.current?.cancel(), []);
  return controllerRef.current;
}
