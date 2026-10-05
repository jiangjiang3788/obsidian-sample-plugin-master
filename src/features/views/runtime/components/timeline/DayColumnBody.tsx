import { h } from 'preact';
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
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

interface ActiveRangeGesture {
  pointerId: number;
  startClientY: number;
  startMinute: number;
  dragging: boolean;
  captureTarget: HTMLElement | null;
}

interface PassiveTouchTap {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 4;
const TOUCH_TAP_SLOP_PX = 10;
const DOUBLE_TAP_WINDOW_MS = 350;
const DOUBLE_TAP_SLOP_PX = 24;

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
  const touchTapRef = useRef<PassiveTouchTap | null>(null);
  const suppressClickUntilRef = useRef(0);
  const rangeGestureRef = useRef<ActiveRangeGesture | null>(null);
  const [dragSelection, setDragSelection] = useState<TimelineDragSelectionModel | null>(null);

  const handleBodyClick = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      return;
    }
    onColumnClick(day, event);
  };

  const minuteFromClientY = (clientY: number) => {
    const target = columnRef.current;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return timelineMinuteFromOffset(clientY - rect.top, hourHeight, maxHours);
  };

  const beginRangeGesture = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    const minute = minuteFromClientY(event.clientY);
    if (minute == null) return false;
    const captureTarget = event.currentTarget as HTMLElement | null;
    rangeGestureRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startMinute: minute,
      dragging: false,
      captureTarget,
    };
    captureTarget?.setPointerCapture?.(event.pointerId);
    setDragSelection(null);
    return true;
  };

  const updateRangeGesture = (event: PointerEvent) => {
    const start = rangeGestureRef.current;
    if (!start || start.pointerId !== event.pointerId) return false;
    if (!start.dragging && Math.abs(event.clientY - start.startClientY) < DRAG_THRESHOLD_PX) return true;
    const minute = minuteFromClientY(event.clientY);
    if (minute == null) return true;
    const selection = buildTimelineDragSelection(start.startMinute, minute, maxHours);
    if (!selection) return true;
    start.dragging = true;
    event.preventDefault();
    setDragSelection(selection);
    return true;
  };

  const finishRangeGesture = (event: PointerEvent, cancelled = false) => {
    const start = rangeGestureRef.current;
    if (!start || start.pointerId !== event.pointerId) return false;
    rangeGestureRef.current = null;
    start.captureTarget?.releasePointerCapture?.(event.pointerId);

    const movedEnough = Math.abs(event.clientY - start.startClientY) >= DRAG_THRESHOLD_PX;
    if (cancelled || (!start.dragging && !movedEnough)) {
      setDragSelection(null);
      return true;
    }

    const minute = minuteFromClientY(event.clientY);
    const selection = minute == null ? dragSelection : buildTimelineDragSelection(start.startMinute, minute, maxHours);
    if (!selection) {
      setDragSelection(null);
      return true;
    }

    suppressClickUntilRef.current = Date.now() + 350;
    event.preventDefault();
    onColumnClick(day, event, { startMinute: selection.startMinute, endMinute: selection.endMinute });
    setDragSelection(null);
    return true;
  };

  const handleBodyPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      touchTapRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      };
      return;
    }
    beginRangeGesture(event);
  };

  const handleBodyPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      const tap = touchTapRef.current;
      if (!tap || tap.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - tap.startClientX, event.clientY - tap.startClientY) > TOUCH_TAP_SLOP_PX) {
        tap.moved = true;
      }
      return;
    }
    updateRangeGesture(event);
  };

  const handleBodyPointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      const tap = touchTapRef.current;
      if (!tap || tap.pointerId !== event.pointerId) return;
      touchTapRef.current = null;
      suppressClickUntilRef.current = Date.now() + 450;
      if (tap.moved) {
        lastTouchRef.current = null;
        return;
      }

      const now = Date.now();
      const previous = lastTouchRef.current;
      const isDoubleTap = !!previous
        && now - previous.time <= DOUBLE_TAP_WINDOW_MS
        && Math.abs(previous.x - event.clientX) <= DOUBLE_TAP_SLOP_PX
        && Math.abs(previous.y - event.clientY) <= DOUBLE_TAP_SLOP_PX;

      if (isDoubleTap) {
        event.preventDefault();
        onColumnClick(day, event);
        lastTouchRef.current = null;
      } else {
        lastTouchRef.current = { time: now, x: event.clientX, y: event.clientY };
      }
      return;
    }
    finishRangeGesture(event);
  };

  const handleBodyPointerCancel = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (touchTapRef.current?.pointerId === event.pointerId) touchTapRef.current = null;
      lastTouchRef.current = null;
      return;
    }
    finishRangeGesture(event, true);
  };

  const handleRangeRailPointerDown = (event: PointerEvent) => {
    // Touch range creation lives on an explicit edge rail. The rest of the day
    // column always remains a native pan surface, so vertical scrolling no longer
    // races a long-press timer for ownership of the same gesture.
    event.stopPropagation();
    if (!beginRangeGesture(event)) return;
    event.preventDefault();
  };

  const handleRangeRailPointerMove = (event: PointerEvent) => {
    event.stopPropagation();
    updateRangeGesture(event);
  };

  const handleRangeRailPointerUp = (event: PointerEvent) => {
    event.stopPropagation();
    finishRangeGesture(event);
  };

  const handleRangeRailPointerCancel = (event: PointerEvent) => {
    event.stopPropagation();
    finishRangeGesture(event, true);
  };

  return (
    <div
      ref={columnRef}
      class="day-column-body"
      style={{
        height: `${timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}px`,
      } as JSX.CSSProperties}
      onClick={(event) => handleBodyClick(event as any)}
      onPointerDown={(event) => handleBodyPointerDown(event as any)}
      onPointerMove={(event) => handleBodyPointerMove(event as any)}
      onPointerUp={(event) => handleBodyPointerUp(event as any)}
      onPointerCancel={(event) => handleBodyPointerCancel(event as any)}
    >
      <TimeRulerGrid
        ticks={(scale ?? buildTimelineScale({ hourHeight, maxHours })).ticks}
        height={timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}
        variant="grid"
      />

      <div
        class="timeline-range-create-rail"
        aria-label="拖动此边缘选择时段"
        title="拖动此边缘：选择一个时段"
        onPointerDown={(event) => handleRangeRailPointerDown(event as any)}
        onPointerMove={(event) => handleRangeRailPointerMove(event as any)}
        onPointerUp={(event) => handleRangeRailPointerUp(event as any)}
        onPointerCancel={(event) => handleRangeRailPointerCancel(event as any)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
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
