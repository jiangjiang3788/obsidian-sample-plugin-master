import { h } from 'preact';
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TaskBlock } from '@core/types/public';
import { TimeRulerGrid } from '@shared/ui/public';
import {
  buildTimelineDragSelection,
  buildTimelineScale,
  type TimelineScale,
  timelineMinuteFromOffset,
  timelineOffsetFromMinute,
  timelineVisibleEndMinute,
  type TimelineDragSelectionModel,
} from '@core/utils/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, UpdateTimelineRangeHandler } from '@shared/types/public';
import { TimelineTaskBlock } from './TimelineTaskBlock';

interface DayColumnBodyProps {
  day: string;
  blocks: TaskBlock[];
  hourHeight: number;
  scale?: TimelineScale;
  colorMap: Record<string, string>;
  maxHours: number;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent | PointerEvent, selectedRange?: { startMinute: number; endMinute: number } | null) => void;
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onNotice?: (message: string) => void;
}

interface ActiveTouchSelection {
  identifier: number;
  startClientX: number;
  startClientY: number;
  startMinute: number;
  armed: boolean;
  dragging: boolean;
  cancelled: boolean;
  timerId: number | null;
}

const DRAG_THRESHOLD_PX = 4;
const TOUCH_RANGE_LONG_PRESS_MS = 350;
const TOUCH_RANGE_PRESS_SLOP_PX = 10;
const TOUCH_RANGE_DRAG_THRESHOLD_PX = 2;

const formatTimeMinute = (minute: number) => {
  const total = Math.round(minute);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatRangeBoundaryMinute = (minute: number) => minute === 24 * 60 ? '24:00' : formatTimeMinute(minute);

function findTouch(touches: TouchList | undefined, identifier: number): Touch | null {
  if (!touches) return null;
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === identifier) return touch;
  }
  return null;
}

export function DayColumnBody({
  day,
  blocks,
  hourHeight,
  scale,
  colorMap,
  maxHours,
  onColumnClick,
  onUpdateTimelineRange,
  onOpenRecord,
  onOpenRecordOrigin,
  onNotice,
}: DayColumnBodyProps) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const dragStartRef = useRef<{ pointerId: number; clientY: number; minute: number } | null>(null);
  const touchSelectionRef = useRef<ActiveTouchSelection | null>(null);
  const [dragSelection, setDragSelection] = useState<TimelineDragSelectionModel | null>(null);
  const [isTouchSelectionArmed, setIsTouchSelectionArmed] = useState(false);

  useEffect(() => () => {
    const active = touchSelectionRef.current;
    if (active?.timerId != null) window.clearTimeout(active.timerId);
  }, []);

  const handleBodyClick = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    onColumnClick(day, event);
  };

  const minuteFromClientY = (clientY: number) => {
    const target = columnRef.current;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return timelineMinuteFromOffset(clientY - rect.top, hourHeight, maxHours);
  };

  const minuteFromPointerEvent = (event: PointerEvent) => minuteFromClientY(event.clientY);

  const handleBodyPointerDown = (event: PointerEvent) => {
    // Touch uses a long-press-to-arm range gesture below. Mouse/pen keep the
    // direct desktop drag-selection interaction.
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const minute = minuteFromPointerEvent(event);
    if (minute == null) return;
    dragStartRef.current = { pointerId: event.pointerId, clientY: event.clientY, minute };
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    setDragSelection(null);
  };

  const handleBodyPointerMove = (event: PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (!dragSelection && Math.abs(event.clientY - start.clientY) < DRAG_THRESHOLD_PX) return;
    const minute = minuteFromPointerEvent(event);
    if (minute == null) return;
    const selection = buildTimelineDragSelection(start.minute, minute, maxHours);
    if (!selection) return;
    event.preventDefault();
    setDragSelection(selection);
  };

  const handleBodyPointerUp = (event: PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    dragStartRef.current = null;
    (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    if (Math.abs(event.clientY - start.clientY) < DRAG_THRESHOLD_PX) {
      setDragSelection(null);
      return;
    }

    const minute = minuteFromPointerEvent(event);
    const selection = minute == null ? dragSelection : buildTimelineDragSelection(start.minute, minute, maxHours);
    if (!selection) {
      setDragSelection(null);
      return;
    }
    suppressClickUntilRef.current = Date.now() + 350;
    event.preventDefault();
    onColumnClick(day, event, { startMinute: selection.startMinute, endMinute: selection.endMinute });
    setDragSelection(null);
  };

  const handleBodyPointerCancel = (event: PointerEvent) => {
    if (dragStartRef.current?.pointerId !== event.pointerId) return;
    dragStartRef.current = null;
    setDragSelection(null);
  };

  const clearTouchSelectionTimer = (active: ActiveTouchSelection | null) => {
    if (!active || active.timerId == null) return;
    window.clearTimeout(active.timerId);
    active.timerId = null;
  };

  const handleBodyTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches?.item(0);
    if (!touch) return;
    const minute = minuteFromClientY(touch.clientY);
    if (minute == null) return;

    clearTouchSelectionTimer(touchSelectionRef.current);
    setDragSelection(null);
    setIsTouchSelectionArmed(false);

    const active: ActiveTouchSelection = {
      identifier: touch.identifier,
      startClientX: touch.clientX,
      startClientY: touch.clientY,
      startMinute: minute,
      armed: false,
      dragging: false,
      cancelled: false,
      timerId: null,
    };

    active.timerId = window.setTimeout(() => {
      if (touchSelectionRef.current !== active || active.cancelled) return;
      active.armed = true;
      active.timerId = null;
      setIsTouchSelectionArmed(true);
      // Show the first five-minute cell as acknowledgement that the long press
      // has switched from scrolling to range creation. Releasing without a drag
      // still cancels and creates nothing.
      setDragSelection(buildTimelineDragSelection(active.startMinute, active.startMinute, maxHours));
      try { navigator.vibrate?.(8); } catch { /* optional tactile acknowledgement */ }
    }, TOUCH_RANGE_LONG_PRESS_MS);

    touchSelectionRef.current = active;
  };

  const handleBodyTouchMove = (event: TouchEvent) => {
    const active = touchSelectionRef.current;
    if (!active) return;
    const touch = findTouch(event.touches, active.identifier);
    if (!touch) return;

    const deltaX = touch.clientX - active.startClientX;
    const deltaY = touch.clientY - active.startClientY;
    const travel = Math.hypot(deltaX, deltaY);

    // Before the long press, every ordinary swipe belongs to native scrolling
    // (horizontal day navigation or vertical timeline scrolling). Do not steal it.
    if (!active.armed) {
      if (travel <= TOUCH_RANGE_PRESS_SLOP_PX) return;
      clearTouchSelectionTimer(active);
      active.cancelled = true;
      lastTouchRef.current = null;
      suppressClickUntilRef.current = Date.now() + 350;
      return;
    }

    if (!active.dragging && Math.abs(deltaY) < TOUCH_RANGE_DRAG_THRESHOLD_PX) return;
    const minute = minuteFromClientY(touch.clientY);
    if (minute == null) return;
    const selection = buildTimelineDragSelection(active.startMinute, minute, maxHours);
    if (!selection) return;

    active.dragging = true;
    event.preventDefault();
    event.stopPropagation();
    setDragSelection(selection);
  };

  const handleBodyTouchEnd = (event: TouchEvent) => {
    const active = touchSelectionRef.current;
    if (active) {
      const touch = findTouch(event.changedTouches, active.identifier);
      if (touch) {
        clearTouchSelectionTimer(active);
        touchSelectionRef.current = null;
        setIsTouchSelectionArmed(false);

        if (active.cancelled) {
          setDragSelection(null);
          lastTouchRef.current = null;
          return;
        }

        if (active.armed) {
          suppressClickUntilRef.current = Date.now() + 450;
          lastTouchRef.current = null;
          event.preventDefault();
          event.stopPropagation();

          const minute = minuteFromClientY(touch.clientY);
          const movedEnough = Math.abs(touch.clientY - active.startClientY) >= TOUCH_RANGE_DRAG_THRESHOLD_PX;
          const selection = movedEnough && minute != null
            ? buildTimelineDragSelection(active.startMinute, minute, maxHours)
            : (active.dragging ? dragSelection : null);

          setDragSelection(null);
          if (selection && (active.dragging || movedEnough)) {
            onColumnClick(day, event, { startMinute: selection.startMinute, endMinute: selection.endMinute });
          }
          return;
        }
      }
    }

    // Preserve the existing mobile double-tap point-create shortcut. It only
    // runs when the touch never became a scroll or long-press range gesture.
    const touch = event.changedTouches?.item(0);
    if (!touch) return;

    const now = Date.now();
    const previous = lastTouchRef.current;
    const isDoubleTap = !!previous
      && now - previous.time <= 350
      && Math.abs(previous.x - touch.clientX) <= 24
      && Math.abs(previous.y - touch.clientY) <= 24;

    lastTouchRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    suppressClickUntilRef.current = now + 450;
    if (!isDoubleTap) return;

    event.preventDefault();
    onColumnClick(day, event);
    lastTouchRef.current = null;
  };

  const handleBodyTouchCancel = (event: TouchEvent) => {
    const active = touchSelectionRef.current;
    if (!active) return;
    const touch = findTouch(event.changedTouches, active.identifier);
    if (!touch) return;
    clearTouchSelectionTimer(active);
    touchSelectionRef.current = null;
    lastTouchRef.current = null;
    setIsTouchSelectionArmed(false);
    setDragSelection(null);
  };

  return (
    <div
      ref={columnRef}
      class={`day-column-body${isTouchSelectionArmed ? ' day-column-body--touch-select-armed' : ''}`}
      style={{
        height: `${timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}px`,

      } as JSX.CSSProperties}
      onClick={(event) => handleBodyClick(event as any)}
      onPointerDown={(event) => handleBodyPointerDown(event as any)}
      onPointerMove={(event) => handleBodyPointerMove(event as any)}
      onPointerUp={(event) => handleBodyPointerUp(event as any)}
      onPointerCancel={(event) => handleBodyPointerCancel(event as any)}
      onTouchStart={(event) => handleBodyTouchStart(event as any)}
      onTouchMove={(event) => handleBodyTouchMove(event as any)}
      onTouchEnd={(event) => handleBodyTouchEnd(event as any)}
      onTouchCancel={(event) => handleBodyTouchCancel(event as any)}
    >
      <TimeRulerGrid
        ticks={(scale ?? buildTimelineScale({ hourHeight, maxHours })).ticks}
        height={timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}
        variant="grid"
      />
      {dragSelection ? (
        <div
          class="timeline-range-selection"
          style={{
            top: `${timelineOffsetFromMinute(dragSelection.startMinute, hourHeight)}px`,
            height: `${Math.max(18, timelineOffsetFromMinute(dragSelection.durationMinutes, hourHeight))}px`,
          }}
        >
          <span class="timeline-range-selection__label">
            {formatRangeBoundaryMinute(dragSelection.startMinute)}–{formatRangeBoundaryMinute(dragSelection.endMinute)} · {dragSelection.durationMinutes} 分钟
          </span>
        </div>
      ) : null}

      {blocks.map((block, index) => (
        <TimelineTaskBlock
          key={block.id + block.day}
          block={block}
          prevBlock={index > 0 ? blocks[index - 1] : null}
          nextBlock={index < blocks.length - 1 ? blocks[index + 1] : null}
          hourHeight={hourHeight}
          maxHours={maxHours}
          colorMap={colorMap}
          onUpdateTimelineRange={onUpdateTimelineRange}
          onOpenRecord={onOpenRecord}
          onOpenRecordOrigin={onOpenRecordOrigin}
          onNotice={onNotice}
        />
      ))}
    </div>
  );
}
