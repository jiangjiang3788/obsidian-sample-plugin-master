import { h } from 'preact';
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { TaskBlock } from '@core/types/public';
import { findTimelineTouch, TimeRulerGrid, useTimelineTouchGesture } from '@shared/ui/public';
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

const DRAG_THRESHOLD_PX = 4;

const formatTimeMinute = (minute: number) => {
  const total = Math.round(minute);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatRangeBoundaryMinute = (minute: number) => minute === 24 * 60 ? '24:00' : formatTimeMinute(minute);

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
  const touchIdentifierRef = useRef<number | null>(null);
  const touchStartMinuteRef = useRef<number | null>(null);
  const touchSwipeCancelledRef = useRef(false);
  const [dragSelection, setDragSelection] = useState<TimelineDragSelectionModel | null>(null);
  const [isTouchSelectionArmed, setIsTouchSelectionArmed] = useState(false);

  const touchGesture = useTimelineTouchGesture<'select'>(() => {
    const minute = touchStartMinuteRef.current;
    if (minute == null) return;
    setIsTouchSelectionArmed(true);
    // An armed stationary press shows one 5-minute cell, but only a real
    // long-press drag is allowed to create a range.
    setDragSelection(buildTimelineDragSelection(minute, minute, maxHours));
    try { navigator.vibrate?.(8); } catch { /* optional feedback */ }
  });

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

  const resetTouchSelection = () => {
    setIsTouchSelectionArmed(false);
    setDragSelection(null);
  };

  const handleBodyTouchStart = (event: TouchEvent) => {
    if (event.touches?.length !== 1) {
      touchGesture.cancel();
      touchIdentifierRef.current = null;
      touchSwipeCancelledRef.current = true;
      lastTouchRef.current = null;
      resetTouchSelection();
      return;
    }
    const touch = event.changedTouches?.item(0);
    if (!touch) return;
    const minute = minuteFromClientY(touch.clientY);
    if (minute == null) return;
    touchSwipeCancelledRef.current = false;
    touchIdentifierRef.current = touch.identifier;
    touchStartMinuteRef.current = minute;
    resetTouchSelection();
    touchGesture.start(touch, 'select');
  };

  const handleBodyTouchMove = (event: TouchEvent) => {
    const identifier = touchIdentifierRef.current;
    if (identifier == null) return;
    const touch = findTimelineTouch(event.touches, identifier);
    if (!touch || event.touches.length !== 1) {
      touchGesture.cancel();
      touchIdentifierRef.current = null;
      touchSwipeCancelledRef.current = true;
      lastTouchRef.current = null;
      resetTouchSelection();
      return;
    }
    const outcome = touchGesture.move(touch, event.touches.length);
    if (outcome === 'scroll') {
      // Native pan owns both axes before the long press; never show a range.
      touchIdentifierRef.current = null;
      touchSwipeCancelledRef.current = true;
      lastTouchRef.current = null;
      suppressClickUntilRef.current = Date.now() + 350;
      resetTouchSelection();
      return;
    }
    if (outcome !== 'drag') return;
    const startMinute = touchStartMinuteRef.current;
    const minute = minuteFromClientY(touch.clientY);
    if (startMinute == null || minute == null) return;
    const selection = buildTimelineDragSelection(startMinute, minute, maxHours);
    if (!selection) return;
    event.preventDefault();
    event.stopPropagation();
    setDragSelection(selection);
  };

  const handleBodyTouchEnd = (event: TouchEvent) => {
    // A scroll (or a second finger) must never turn into a point-creation tap.
    if (touchSwipeCancelledRef.current) {
      touchSwipeCancelledRef.current = false;
      touchGesture.cancel();
      resetTouchSelection();
      return;
    }
    const identifier = touchIdentifierRef.current;
    const touch = identifier == null ? null : findTimelineTouch(event.changedTouches, identifier);
    if (!touch) return;
    const outcome = touchGesture.end(touch);
    touchIdentifierRef.current = null;
    resetTouchSelection();
    if (!outcome) return;
    if (outcome.kind !== 'tap') {
      suppressClickUntilRef.current = Date.now() + 450;
      lastTouchRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      if (outcome.kind !== 'drag') return;
      const startMinute = touchStartMinuteRef.current;
      const minute = minuteFromClientY(touch.clientY);
      const selection = startMinute == null || minute == null
        ? null : buildTimelineDragSelection(startMinute, minute, maxHours);
      if (selection) onColumnClick(day, event, {
        startMinute: selection.startMinute, endMinute: selection.endMinute,
      });
      return;
    }
    // Keep mobile double tap to create a point, but only after TWO true taps.
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

  const handleBodyTouchCancel = (_event: TouchEvent) => {
    touchGesture.cancel();
    touchIdentifierRef.current = null;
    touchSwipeCancelledRef.current = true;
    lastTouchRef.current = null;
    resetTouchSelection();
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
