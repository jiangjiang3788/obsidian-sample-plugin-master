/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { TaskBlock } from '@core/types/public';
import {
  buildTimelineDragSelection,
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
  colorMap,
  maxHours,
  onColumnClick,
  onUpdateTimelineRange,
  onOpenRecord,
  onOpenRecordOrigin,
  onNotice,
}: DayColumnBodyProps) {
  const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const dragStartRef = useRef<{ pointerId: number; clientY: number; minute: number } | null>(null);
  const [dragSelection, setDragSelection] = useState<TimelineDragSelectionModel | null>(null);

  const handleBodyClick = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    onColumnClick(day, event);
  };

  const minuteFromPointerEvent = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return timelineMinuteFromOffset(event.clientY - rect.top, hourHeight, maxHours);
  };

  const handleBodyPointerDown = (event: PointerEvent) => {
    // Touch keeps the existing deliberate double-tap create behavior. Mouse/pen can drag a range.
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

  const handleBodyTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches?.[0];
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

  return (
    <div
      class="day-column-body"
      style={{
        height: `${timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}px`,
        '--timeline-hour-height': `${hourHeight}px`,
        '--timeline-quarter-hour-height': `${hourHeight / 4}px`,
        '--timeline-five-minute-height': `${hourHeight / 12}px`,
      } as JSX.CSSProperties}
      onClick={(event) => handleBodyClick(event as any)}
      onPointerDown={(event) => handleBodyPointerDown(event as any)}
      onPointerMove={(event) => handleBodyPointerMove(event as any)}
      onPointerUp={(event) => handleBodyPointerUp(event as any)}
      onPointerCancel={(event) => handleBodyPointerCancel(event as any)}
      onTouchEnd={(event) => handleBodyTouchEnd(event as any)}
    >
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
