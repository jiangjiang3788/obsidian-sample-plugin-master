/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TaskBlock } from '@core/types/public';
import {
  buildTimelineBlockGesturePreview,
  dayjs,
  getTimelineGoalKey,
  resizeTimelineLogicalRange,
  shiftTimelineLogicalRange,
  timelineMinuteFromOffset,
  timelineOffsetFromMinute,
} from '@core/utils/public';
import { getTaskSessionResultPresentation, getTaskStatusPresentation } from '@core/records/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, UpdateTimelineRangeHandler } from '@shared/types/public';
import { createRecordGestureHandlers, RECORD_MODIFIER_ORIGIN_HINT, ThinkIcon, ThinkIconButton } from '@shared/ui/public';

interface TimelineTaskBlockProps {
  block: TaskBlock;
  prevBlock: TaskBlock | null;
  nextBlock: TaskBlock | null;
  hourHeight: number;
  maxHours: number;
  colorMap: Record<string, string>;
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onNotice?: (message: string) => void;
}

type GestureMode = 'move' | 'resize-start' | 'resize-end';

interface ActiveGesture {
  pointerId: number;
  mode: GestureMode;
  startClientY: number;
  anchorMinute: number;
  dragging: boolean;
}

interface ActiveTouchGesture {
  identifier: number;
  mode: GestureMode;
  startClientX: number;
  startClientY: number;
  anchorMinute: number;
  armed: boolean;
  dragging: boolean;
  timerId: number | null;
}

const MOUSE_DRAG_THRESHOLD_PX = 4;
const TOUCH_LONG_PRESS_MS = 350;
const TOUCH_PRESS_SLOP_PX = 10;
const TOUCH_DRAG_THRESHOLD_PX = 2;

function findTouch(touches: TouchList | undefined, identifier: number): Touch | null {
  if (!touches) return null;
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === identifier) return touch;
  }
  return null;
}

function formatTimeMinute(minute: number): string {
  const total = Math.round(minute);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateTaskBlockTitle(block: TaskBlock): string {
  if (!block.timelineRange.end) {
    return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间点: ${formatTimeMinute(block.startMinute)}\n鼠标拖动；触屏长按后拖动可修改时间\n${RECORD_MODIFIER_ORIGIN_HINT}`;
  }

  const start = dayjs(block.timelineRange.start);
  const end = dayjs(block.timelineRange.end);
  const rangeText = start.isSame(end, 'day')
    ? `${start.format('HH:mm')} - ${end.format('HH:mm')}`
    : `${start.format('MM-DD HH:mm')} - ${end.format('MM-DD HH:mm')}`;
  return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间: ${rangeText}\n鼠标直接拖动；触屏长按后拖动块或上下边缘可修改时间\n${RECORD_MODIFIER_ORIGIN_HINT}`;
}

function formatPreviewLabel(range: { start: string; end?: string }, durationMinutes: number): string {
  const start = dayjs(range.start);
  if (!range.end) return start.format('HH:mm');
  const end = dayjs(range.end);
  const rangeText = start.isSame(end, 'day')
    ? `${start.format('HH:mm')}–${end.format('HH:mm')}`
    : `${start.format('MM-DD HH:mm')}–${end.format('MM-DD HH:mm')}`;
  return `${rangeText} · ${Math.round(durationMinutes * 100) / 100} 分钟`;
}

export function TimelineTaskBlock({
  block,
  prevBlock,
  nextBlock,
  hourHeight,
  maxHours,
  colorMap,
  onUpdateTimelineRange,
  onOpenRecord,
  onOpenRecordOrigin,
  onNotice,
}: TimelineTaskBlockProps) {
  const blockRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const touchGestureRef = useRef<ActiveTouchGesture | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [preview, setPreview] = useState<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const previewRef = useRef<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchArmed, setIsTouchArmed] = useState(false);

  useEffect(() => () => {
    const active = touchGestureRef.current;
    if (active?.timerId != null) window.clearTimeout(active.timerId);
  }, []);

  const isPlanned = block.timelineSource === 'task-plan';
  const isPoint = !block.timelineRange.end;
  const goalKey = getTimelineGoalKey(block);
  const goalColor = colorMap[goalKey] || 'var(--think-data-neutral)';
  const lifecycle = block.timelineSource === 'task-session'
    ? (getTaskSessionResultPresentation(block.sessionResult) || getTaskStatusPresentation(block.status))
    : getTaskStatusPresentation(block.status);

  const visibleStart = preview?.blockStartMinute ?? block.blockStartMinute;
  const visibleEnd = preview?.blockEndMinute ?? block.blockEndMinute;
  const top = timelineOffsetFromMinute(visibleStart, hourHeight);
  const naturalHeight = timelineOffsetFromMinute(visibleEnd, hourHeight) - top;
  const renderHeight = isPoint ? 22 : Math.max(naturalHeight, 2);

  const editItem = { ...block, id: block.taskRecordId, recordType: 'task' } as any;
  const originItem = block.timelineSource === 'task-session' ? ({ ...block, id: block.sessionRecordId || block.id } as any) : editItem;
  const handleOpenTask = () => {
    void onOpenRecord?.(editItem);
  };

  // Timeline uses the shared Record interaction contract at the block boundary:
  // normal click edits the owning Task; Ctrl/⌘+click opens the origin.
  // Pointer gestures remain responsible only for move/resize and suppress the
  // synthetic click after a real drag.
  const blockGesture = createRecordGestureHandlers({
    item: originItem,
    onOpenOrigin: onOpenRecordOrigin,
    onPrimary: handleOpenTask,
    originActivation: 'modifier-only',
  });

  const minuteFromClientY = (clientY: number): number | null => {
    const column = blockRef.current?.parentElement;
    if (!column) return null;
    const rect = column.getBoundingClientRect();
    return timelineMinuteFromOffset(clientY - rect.top, hourHeight, maxHours);
  };

  const beginGesture = (event: PointerEvent, mode: GestureMode) => {
    // Touch has its own deliberate long-press state machine below. Keeping it
    // out of PointerEvent drag handling prevents a normal scroll from becoming
    // a timeline edit after only a few pixels of finger movement.
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const minute = minuteFromClientY(event.clientY);
    if (minute == null) return;
    event.stopPropagation();
    gestureRef.current = {
      pointerId: event.pointerId,
      mode,
      startClientY: event.clientY,
      anchorMinute: minute,
      dragging: false,
    };
    blockRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const active = gestureRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!active.dragging && Math.abs(event.clientY - active.startClientY) < MOUSE_DRAG_THRESHOLD_PX) return;

    const currentMinute = minuteFromClientY(event.clientY);
    if (currentMinute == null) return;
    const nextPreview = buildTimelineBlockGesturePreview({
      block,
      mode: active.mode,
      anchorMinute: active.anchorMinute,
      currentMinute,
      maxHours,
    });
    if (!nextPreview) return;

    active.dragging = true;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  };

  const finishGesture = (event: PointerEvent, cancelled = false) => {
    const active = gestureRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    blockRef.current?.releasePointerCapture?.(event.pointerId);

    let committedPreview = previewRef.current;
    // Pointer-move events can be coalesced or omitted by hosts/test DOMs. Rebuild the final
    // preview from pointer-up so a real drag still commits its logical range exactly once.
    if (!cancelled && !committedPreview && Math.abs(event.clientY - active.startClientY) >= MOUSE_DRAG_THRESHOLD_PX) {
      const currentMinute = minuteFromClientY(event.clientY);
      if (currentMinute != null) {
        committedPreview = buildTimelineBlockGesturePreview({
          block,
          mode: active.mode,
          anchorMinute: active.anchorMinute,
          currentMinute,
          maxHours,
        });
      }
    }
    const didDrag = !!committedPreview && !cancelled;
    previewRef.current = null;
    setPreview(null);
    setIsDragging(false);
    if (!didDrag || !committedPreview) return;

    suppressClickUntilRef.current = Date.now() + 350;
    event.preventDefault();
    event.stopPropagation();
    if (!onUpdateTimelineRange) {
      onNotice?.('未提供时间轴保存处理器，无法更新时间');
      return;
    }
    Promise.resolve(onUpdateTimelineRange({
      target: block.timelineEditTarget,
      range: committedPreview.range,
    })).catch(() => undefined);
  };

  const clearTouchTimer = (active: ActiveTouchGesture | null) => {
    if (!active || active.timerId == null) return;
    window.clearTimeout(active.timerId);
    active.timerId = null;
  };

  const beginTouchGesture = (event: TouchEvent, mode: GestureMode) => {
    const touch = event.changedTouches?.item(0);
    if (!touch) return;
    const minute = minuteFromClientY(touch.clientY);
    if (minute == null) return;

    event.stopPropagation();
    clearTouchTimer(touchGestureRef.current);
    previewRef.current = null;
    setPreview(null);
    setIsDragging(false);
    setIsTouchArmed(false);

    const active: ActiveTouchGesture = {
      identifier: touch.identifier,
      mode,
      startClientX: touch.clientX,
      startClientY: touch.clientY,
      anchorMinute: minute,
      armed: false,
      dragging: false,
      timerId: null,
    };
    active.timerId = window.setTimeout(() => {
      if (touchGestureRef.current !== active) return;
      active.armed = true;
      active.timerId = null;
      setIsTouchArmed(true);
      try { navigator.vibrate?.(8); } catch { /* optional tactile acknowledgement */ }
    }, TOUCH_LONG_PRESS_MS);
    touchGestureRef.current = active;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const active = touchGestureRef.current;
    if (!active) return;
    const touch = findTouch(event.touches, active.identifier);
    if (!touch) return;
    const deltaX = touch.clientX - active.startClientX;
    const deltaY = touch.clientY - active.startClientY;
    const travel = Math.hypot(deltaX, deltaY);

    // Before the long press is confirmed, movement in either axis is native
    // scrolling. Horizontal day swipes must cancel the edit candidate just as
    // vertical timeline swipes do.
    if (!active.armed) {
      if (travel <= TOUCH_PRESS_SLOP_PX) return;
      clearTouchTimer(active);
      touchGestureRef.current = null;
      suppressClickUntilRef.current = Date.now() + 350;
      return;
    }

    if (!active.dragging && Math.abs(deltaY) < TOUCH_DRAG_THRESHOLD_PX) return;
    const currentMinute = minuteFromClientY(touch.clientY);
    if (currentMinute == null) return;
    const nextPreview = buildTimelineBlockGesturePreview({
      block,
      mode: active.mode,
      anchorMinute: active.anchorMinute,
      currentMinute,
      maxHours,
    });
    if (!nextPreview) return;

    active.dragging = true;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  };

  const finishTouchGesture = (event: TouchEvent, cancelled = false) => {
    const active = touchGestureRef.current;
    if (!active) return;
    const touch = findTouch(event.changedTouches, active.identifier);
    if (!touch) return;

    clearTouchTimer(active);
    touchGestureRef.current = null;
    setIsTouchArmed(false);

    // A regular tap remains the existing click-to-open interaction. A long
    // press, however, is an explicit edit intent and must not synthesize a click.
    if (!active.armed) return;
    suppressClickUntilRef.current = Date.now() + 450;
    event.preventDefault();
    event.stopPropagation();

    let committedPreview = previewRef.current;
    if (!cancelled && !committedPreview && Math.abs(touch.clientY - active.startClientY) >= TOUCH_DRAG_THRESHOLD_PX) {
      const currentMinute = minuteFromClientY(touch.clientY);
      if (currentMinute != null) {
        committedPreview = buildTimelineBlockGesturePreview({
          block,
          mode: active.mode,
          anchorMinute: active.anchorMinute,
          currentMinute,
          maxHours,
        });
      }
    }

    const didDrag = !!committedPreview && !cancelled;
    previewRef.current = null;
    setPreview(null);
    setIsDragging(false);
    if (!didDrag || !committedPreview) return;

    if (!onUpdateTimelineRange) {
      onNotice?.('未提供时间轴保存处理器，无法更新时间');
      return;
    }
    Promise.resolve(onUpdateTimelineRange({
      target: block.timelineEditTarget,
      range: committedPreview.range,
    })).catch(() => undefined);
  };

  const commitRange = (range: TaskBlock['timelineRange'] | null, failureMessage: string) => {
    if (!range) {
      onNotice?.(failureMessage);
      return;
    }
    if (!onUpdateTimelineRange) {
      onNotice?.('未提供时间轴保存处理器，无法更新时间');
      return;
    }
    Promise.resolve(onUpdateTimelineRange({ target: block.timelineEditTarget, range }))
      .catch(() => undefined);
  };

  const handleAlignToPrev = () => {
    if (!prevBlock) return;
    const deltaMinutes = prevBlock.blockEndMinute - block.blockStartMinute;
    commitRange(shiftTimelineLogicalRange(block.timelineRange, deltaMinutes), '无法向前对齐');
  };

  const handleAlignToNext = () => {
    if (!nextBlock || !block.timelineRange.end) return;
    commitRange(
      resizeTimelineLogicalRange(block.timelineRange, 'end', block.day, nextBlock.blockStartMinute, maxHours),
      '无法向后对齐：时间段至少需要 5 分钟',
    );
  };

  const canAlign = !isPoint && !isPlanned && block.isRangeStart && block.isRangeEnd;
  const canAlignToNext = !!(canAlign && nextBlock && nextBlock.blockStartMinute > block.blockStartMinute);
  const className = `timeline-task-block timeline-task-block--${lifecycle.className}`
    + `${isPoint ? ' timeline-task-block--point' : ''}`
    + `${isPlanned ? ' timeline-task-block--planned' : ''}`
    + `${isTouchArmed ? ' timeline-task-block--touch-armed' : ''}`
    + `${isDragging ? ' timeline-task-block--dragging' : ''}`;

  const blockStyle = {
    top: `${top}px`,
    height: `${renderHeight}px`,
    '--timeline-goal-color': goalColor,
  } as JSX.CSSProperties;

  return (
    <div
      ref={blockRef}
      class={className}
      data-task-status={lifecycle.status}
      data-timeline-kind={isPoint ? 'point' : 'range'}
      data-timeline-layer={isPlanned ? 'planned' : (block.timelineSource === 'task-session' ? 'actual' : 'legacy')}
      data-timeline-editable="true"
      title={`${generateTaskBlockTitle(block)}\n状态: ${lifecycle.label}`}
      style={blockStyle}
      onClick={(event) => {
        // Pointerup drag may be followed by a synthetic click; the range is already saved.
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        // The whole task block is the primary interaction target. Child controls
        // stop their own clicks so alignment/resize affordances never open the editor.
        blockGesture.onClick?.(event as any);
      }}
      onPointerDown={(event) => beginGesture(event as any, 'move')}
      onPointerMove={(event) => handlePointerMove(event as any)}
      onPointerUp={(event) => finishGesture(event as any)}
      onPointerCancel={(event) => finishGesture(event as any, true)}
      onTouchStart={(event) => beginTouchGesture(event as any, 'move')}
      onTouchMove={(event) => handleTouchMove(event as any)}
      onTouchEnd={(event) => finishTouchGesture(event as any)}
      onTouchCancel={(event) => finishTouchGesture(event as any, true)}
    >
      {!isPoint && block.isRangeStart ? (
        <div
          class="timeline-task-resize-handle timeline-task-resize-handle--start"
          role="separator"
          aria-label="拖动修改开始时间"
          onPointerDown={(event) => beginGesture(event as any, 'resize-start')}
          onTouchStart={(event) => beginTouchGesture(event as any, 'resize-start')}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}

      <div
        class="timeline-task-link"
        role="button"
        tabIndex={0}
        onKeyDown={blockGesture.onKeyDown as any}
      >
        <div class="timeline-task-content">
          <span class="timeline-task-status" aria-label={lifecycle.label} title={lifecycle.label}>
            {lifecycle.emoji}
          </span>
          {block.icon ? <span class="timeline-task-icon">{block.icon}</span> : null}
          <span class="timeline-task-title">{block.title || block.pureText}</span>
        </div>
      </div>

      {preview ? (
        <span class="timeline-task-drag-label">
          {formatPreviewLabel(preview.range, preview.durationMinutes)}
        </span>
      ) : null}

      <div
        class="task-buttons"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {canAlign ? (
          <>
            <ThinkIconButton
              className="timeline-task-action"
              size="sm"
              label="向前对齐"
              icon={<ThinkIcon name="chevron-up" />}
              disabled={!prevBlock}
              onClick={handleAlignToPrev}
            />
            <ThinkIconButton
              className="timeline-task-action"
              size="sm"
              label="向后对齐"
              icon={<ThinkIcon name="chevron-down" />}
              disabled={!canAlignToNext}
              onClick={handleAlignToNext}
            />
          </>
        ) : null}
      </div>

      {!isPoint && block.isRangeEnd ? (
        <div
          class="timeline-task-resize-handle timeline-task-resize-handle--end"
          role="separator"
          aria-label="拖动修改结束时间"
          onPointerDown={(event) => beginGesture(event as any, 'resize-end')}
          onTouchStart={(event) => beginTouchGesture(event as any, 'resize-end')}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </div>
  );
}
