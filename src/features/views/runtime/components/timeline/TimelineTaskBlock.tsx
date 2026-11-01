/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
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
import { classifyTimelineTap, createRecordGestureHandlers, findTimelineTouch, hasPlatformModifier, ThinkIcon, ThinkIconButton, useTimelineTouchGesture } from '@shared/ui/public';

interface TimelineTaskBlockProps {
  block: TaskBlock;
  selectedBlockKey?: string | null;
  onSelectBlock?: (key: string | null) => void;
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

const MOUSE_DRAG_THRESHOLD_PX = 4;
const TIMELINE_TASK_INTERACTION_HINT = '单击选中后显示上下把手；双击编辑；拖动上下短横柄调整边界；Esc取消选中；Ctrl/⌘+单击打开原文；触屏长按再拖动';

function formatTimeMinute(minute: number): string {
  const total = Math.round(minute);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return total === 24 * 60 ? '24:00' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateTaskBlockTitle(block: TaskBlock): string {
  if (!block.timelineRange.end) {
    return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间点: ${formatTimeMinute(block.startMinute)}\n鼠标拖动块主体；触屏长按后拖动可修改时间\n${TIMELINE_TASK_INTERACTION_HINT}`;
  }

  const start = dayjs(block.timelineRange.start);
  const end = dayjs(block.timelineRange.end);
  const rangeText = start.isSame(end, 'day')
    ? `${start.format('HH:mm')} - ${end.format('HH:mm')}`
    : `${start.format('MM-DD HH:mm')} - ${end.format('MM-DD HH:mm')}`;
  return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间: ${rangeText}\n鼠标拖动块主体可平移；选中后拖动上下把手可调整边界；触屏长按后拖动\n${TIMELINE_TASK_INTERACTION_HINT}`;
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
  selectedBlockKey,
  onSelectBlock,
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
  const touchIdentifierRef = useRef<number | null>(null);
  const touchAnchorMinuteRef = useRef<number | null>(null);
  const touchGestureModeRef = useRef<GestureMode>('move');
  const suppressClickUntilRef = useRef(0);
  const lastTaskTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const previewRef = useRef<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchArmed, setIsTouchArmed] = useState(false);
  // Selection is owned by the whole timeline. Standalone block renderers have
  // a local fallback for embedded consumers and focused UI tests.
  const [localSelected, setLocalSelected] = useState(false);
  const blockSelectionKey = `${block.day}::${block.id}`;
  const isEditMode = selectedBlockKey === undefined
    ? localSelected : selectedBlockKey === blockSelectionKey;
  const selectBlock = () => {
    if (onSelectBlock) onSelectBlock(blockSelectionKey);
    else setLocalSelected(true);
  };

  // Task blocks and empty day cells consume the SAME long-press policy. The
  // controller owns cancellation/timers; native scrolling stays the default.
  const touchGesture = useTimelineTouchGesture<GestureMode>(() => {
    setIsTouchArmed(true);
    selectBlock();
    try { navigator.vibrate?.(8); } catch { /* optional vibration */ }
  }, (wasActive) => {
    if (!wasActive) return;
    // A second finger may land on another block. Root capture cancels this
    // editor before zoom can start, not just when this block sees touchmove.
    touchIdentifierRef.current = null;
    touchAnchorMinuteRef.current = null;
    lastTaskTapRef.current = null;
    suppressClickUntilRef.current = Date.now() + 450;
    previewRef.current = null;
    setPreview(null);
    setIsDragging(false);
    setIsTouchArmed(false);
    // Keep the existing resize handle mounted during the pinch: removing the
    // touched DOM node mid-gesture can cause a WebKit touchcancel.
  });

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

  // Timeline specializes the Record contract: click only selects the block,
  // double-click / mobile double-tap opens the editor, Ctrl/⌘+click opens the
  // origin. Keyboard Enter/Space remains an accessible editor shortcut.
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
    selectBlock();
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
    })).catch(() => onNotice?.('时间调整保存失败，请重试'));
  };

  const resetTouchPreview = () => {
    previewRef.current = null;
    setPreview(null);
    setIsDragging(false);
    setIsTouchArmed(false);
  };

  const beginTouchGesture = (event: TouchEvent, mode: GestureMode) => {
    // Do not let empty-cell handlers start while a finger touches a task.
    // Stopping propagation is safe; preventing default here is NOT (iOS scroll).
    event.stopPropagation();
    if (event.touches?.length !== 1) {
      touchGesture.cancel();
      touchIdentifierRef.current = null;
      lastTaskTapRef.current = null;
      resetTouchPreview();
      return;
    }
    const touch = event.changedTouches?.item(0);
    if (!touch) return;
    const minute = minuteFromClientY(touch.clientY);
    if (minute == null) return;
    touchIdentifierRef.current = touch.identifier;
    touchAnchorMinuteRef.current = minute;
    touchGestureModeRef.current = mode;
    resetTouchPreview();
    touchGesture.start(touch, mode);
  };

  const handleTouchMove = (event: TouchEvent) => {
    const identifier = touchIdentifierRef.current;
    if (identifier == null) return;
    const touch = findTimelineTouch(event.touches, identifier);
    if (!touch || event.touches.length !== 1) {
      touchGesture.cancel();
      touchIdentifierRef.current = null;
      lastTaskTapRef.current = null;
      resetTouchPreview();
      return;
    }
    const outcome = touchGesture.move(touch, event.touches.length);
    if (outcome === 'scroll') {
      // On an ordinary finger swipe let the browser pan without interference.
      suppressClickUntilRef.current = Date.now() + 350;
      touchIdentifierRef.current = null;
      lastTaskTapRef.current = null;
      resetTouchPreview();
      return;
    }
    if (outcome !== 'drag') return;
    const anchorMinute = touchAnchorMinuteRef.current;
    const currentMinute = minuteFromClientY(touch.clientY);
    if (anchorMinute == null || currentMinute == null) return;
    const mode = touchGestureModeRef.current;
    const nextPreview = buildTimelineBlockGesturePreview({
      block, mode, anchorMinute, currentMinute, maxHours,
    });
    if (!nextPreview) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  };

  const finishTouchGesture = (event: TouchEvent, cancelled = false) => {
    // Always stop bubbling to the empty-cell double-tap create handler, even if
    // the user swiped and the long-press candidate was already discarded.
    event.stopPropagation();
    if (cancelled) lastTaskTapRef.current = null;
    const identifier = touchIdentifierRef.current;
    const touch = identifier == null ? null : findTimelineTouch(event.changedTouches, identifier);
    if (!touch) {
      if (cancelled) { touchGesture.cancel(); resetTouchPreview(); }
      return;
    }
    const outcome = touchGesture.end(touch, cancelled);
    touchIdentifierRef.current = null;
    setIsTouchArmed(false);
    if (!outcome || outcome.kind === 'tap') {
      resetTouchPreview();
      if (!outcome || cancelled) return;
      // A synthesized click follows many mobile touchends; only the second
      // real tap edits, and neither tap may have been a swipe or drag.
      const dx = touch.clientX - outcome.anchor.clientX;
      const dy = touch.clientY - outcome.anchor.clientY;
      if (Math.hypot(dx, dy) > 10) { lastTaskTapRef.current = null; return; }
      const now = Date.now();
      const { doubleTap, next } = classifyTimelineTap(lastTaskTapRef.current, touch, now);
      lastTaskTapRef.current = next;
      selectBlock();
      if (!doubleTap) return;
      suppressClickUntilRef.current = now + 500;
      event.preventDefault();
      handleOpenTask();
      return;
    }
    lastTaskTapRef.current = null;
    suppressClickUntilRef.current = Date.now() + 450;
    event.preventDefault();
    const anchorMinute = touchAnchorMinuteRef.current;
    // Rebuild from the released finger position, not a potentially stale state
    // update: WebKit may coalesce the last touchmove before touchend.
    const currentMinute = minuteFromClientY(touch.clientY);
    const committedPreview = !cancelled && outcome.kind === 'drag' && anchorMinute != null && currentMinute != null
      ? buildTimelineBlockGesturePreview({ block, mode: outcome.anchor.mode, anchorMinute, currentMinute, maxHours })
      : null;
    resetTouchPreview();
    if (!committedPreview) return;
    if (!onUpdateTimelineRange) {
      onNotice?.('未提供时间轴保存处理器，无法更新时间');
      return;
    }
    Promise.resolve(onUpdateTimelineRange({
      target: block.timelineEditTarget,
      range: committedPreview.range,
    })).catch(() => onNotice?.('时间调整保存失败，请重试'));
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
      .catch(() => onNotice?.('时间调整保存失败，请重试'));
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

  // One 5-minute keyboard step (Shift: 15 minutes) works on desktop and with
  // iOS/Android hardware keyboards; it uses the same range validator/saver.
  const handleGripKeyDown = (event: KeyboardEvent, edge: 'start' | 'end') => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    selectBlock();
    const delta = (event.key === 'ArrowDown' ? 1 : -1) * (event.shiftKey ? 15 : 5);
    const minute = (edge === 'start' ? block.blockStartMinute : block.blockEndMinute) + delta;
    const range = resizeTimelineLogicalRange(block.timelineRange, edge, block.day, minute, maxHours);
    commitRange(range, '无法调整：时间段至少需要 5 分钟，且不能越过另一端');
  };

  const canAlign = !isPoint && !isPlanned && block.isRangeStart && block.isRangeEnd;
  const canAlignToNext = !!(canAlign && nextBlock && nextBlock.blockStartMinute > block.blockStartMinute);
  const className = `timeline-task-block timeline-task-block--${lifecycle.className}`
    + `${isPoint ? ' timeline-task-block--point' : ''}`
    + `${!isPoint && renderHeight < 24 ? ' timeline-task-block--short' : ''}`
    + `${isPlanned ? ' timeline-task-block--planned' : ''}`
    + `${isTouchArmed ? ' timeline-task-block--touch-armed' : ''}`
    + `${isEditMode ? ' timeline-task-block--edit-mode' : ''}`
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
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onSelectBlock?.(null);
        setLocalSelected(false);
      }}
      onClick={(event) => {
        // Never reopen after moving/resizing or a touch double-tap.
        event.stopPropagation();
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          return;
        }
        if (hasPlatformModifier(event) && onOpenRecordOrigin) {
          blockGesture.onClick?.(event as any);
          return;
        }
        // A single click/tap is selection, NOT an editor activation.
        selectBlock();
      }}
      onDblClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (Date.now() < suppressClickUntilRef.current || hasPlatformModifier(event)) return;
        selectBlock();
        handleOpenTask();
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
          aria-label="拖动修改开始时间（上下方向键每次调整5分钟，Shift调整15分钟）"
          aria-orientation="horizontal"
          aria-valuetext={formatTimeMinute(block.blockStartMinute)}
          tabIndex={0}
          onKeyDown={(event) => handleGripKeyDown(event as any, 'start')}
          onFocus={selectBlock}
          onPointerDown={(event) => beginGesture(event as any, 'resize-start')}
          onTouchStart={(event) => beginTouchGesture(event as any, 'resize-start')}
          onClick={(event) => event.stopPropagation()}
          onDblClick={(event) => event.stopPropagation()}
        />
      ) : null}

      <div
        class="timeline-task-link"
        role="button"
        tabIndex={0}
        onKeyDown={blockGesture.onKeyDown as any}
        onFocus={selectBlock}
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
        onDblClick={(event) => event.stopPropagation()}
      >
        {canAlign && isEditMode ? (
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
          aria-label="拖动修改结束时间（上下方向键每次调整5分钟，Shift调整15分钟）"
          aria-orientation="horizontal"
          aria-valuetext={formatTimeMinute(block.blockEndMinute)}
          tabIndex={0}
          onKeyDown={(event) => handleGripKeyDown(event as any, 'end')}
          onFocus={selectBlock}
          onPointerDown={(event) => beginGesture(event as any, 'resize-end')}
          onTouchStart={(event) => beginTouchGesture(event as any, 'resize-end')}
          onClick={(event) => event.stopPropagation()}
          onDblClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </div>
  );
}
