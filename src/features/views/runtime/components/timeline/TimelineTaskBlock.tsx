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
import { createRecordGestureHandlers, RECORD_DOUBLE_PRIMARY_HINT, ThinkIcon, ThinkIconButton } from '@shared/ui/public';

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

interface PassiveTouchTap {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
}

const DIRECT_MANIPULATION_THRESHOLD_PX = 4;
const TOUCH_TAP_SLOP_PX = 10;

function formatTimeMinute(minute: number): string {
  const total = Math.round(minute);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateTaskBlockTitle(block: TaskBlock): string {
  if (!block.timelineRange.end) {
    return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间点: ${formatTimeMinute(block.startMinute)}\n拖动左侧握柄移动时间点；${RECORD_DOUBLE_PRIMARY_HINT}`;
  }

  const start = dayjs(block.timelineRange.start);
  const end = dayjs(block.timelineRange.end);
  const rangeText = start.isSame(end, 'day')
    ? `${start.format('HH:mm')} - ${end.format('HH:mm')}`
    : `${start.format('MM-DD HH:mm')} - ${end.format('MM-DD HH:mm')}`;
  return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间: ${rangeText}\n拖动左侧握柄移动整个时段；拖动上/下边界修改开始/结束时间；${RECORD_DOUBLE_PRIMARY_HINT}`;
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
  const touchTapRef = useRef<PassiveTouchTap | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [preview, setPreview] = useState<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const previewRef = useRef<ReturnType<typeof buildTimelineBlockGesturePreview>>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeGestureMode, setActiveGestureMode] = useState<GestureMode | null>(null);

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
  const compactDirectManipulation = !isPoint && renderHeight < 24;

  const editItem = { ...block, id: block.taskRecordId, recordType: 'task' } as any;
  const originItem = block.timelineSource === 'task-session' ? ({ ...block, id: block.sessionRecordId || block.id } as any) : editItem;
  const handleOpenTask = () => {
    void onOpenRecord?.(editItem);
  };

  // Timeline is a direct-manipulation surface. A plain click/tap is intentionally
  // inert; double activation edits, while Ctrl/⌘+click retains origin navigation.
  // Keyboard Enter/Space remains a direct edit action for accessibility.
  const blockGesture = createRecordGestureHandlers({
    item: originItem,
    onOpenOrigin: onOpenRecordOrigin,
    onPrimary: handleOpenTask,
    originActivation: 'modifier-only',
    primaryActivation: 'double',
  });

  const minuteFromClientY = (clientY: number): number | null => {
    const column = blockRef.current?.parentElement;
    if (!column) return null;
    const rect = column.getBoundingClientRect();
    return timelineMinuteFromOffset(clientY - rect.top, hourHeight, maxHours);
  };

  const beginGesture = (event: PointerEvent, mode: GestureMode) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const minute = minuteFromClientY(event.clientY);
    if (minute == null) return;

    // Only explicit handles call this function. Because those handles use
    // touch-action:none, the same pointer state machine is safe for mouse, pen,
    // and touch without competing with normal timeline scrolling.
    event.stopPropagation();
    gestureRef.current = {
      pointerId: event.pointerId,
      mode,
      startClientY: event.clientY,
      anchorMinute: minute,
      dragging: false,
    };
    setActiveGestureMode(mode);
    blockRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const active = gestureRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!active.dragging && Math.abs(event.clientY - active.startClientY) < DIRECT_MANIPULATION_THRESHOLD_PX) return;

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
    // Pointer-move events can be coalesced or omitted by hosts/test DOMs. Rebuild
    // from pointer-up so a real handle drag still commits exactly once.
    if (!cancelled && !committedPreview && Math.abs(event.clientY - active.startClientY) >= DIRECT_MANIPULATION_THRESHOLD_PX) {
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
    setActiveGestureMode(null);
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

  const handleBlockPointerDown = (event: PointerEvent) => {
    // Prevent clicks on the task body from starting the column's blank-range drag.
    // Do not preventDefault: the body deliberately remains a native scroll surface.
    event.stopPropagation();
    if (event.pointerType !== 'touch') return;
    touchTapRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  };

  const updateTouchTap = (event: PointerEvent) => {
    const tap = touchTapRef.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - tap.startClientX, event.clientY - tap.startClientY) > TOUCH_TAP_SLOP_PX) {
      tap.moved = true;
    }
  };

  const finishTouchTap = (event: PointerEvent, cancelled = false) => {
    const tap = touchTapRef.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    touchTapRef.current = null;
    if (cancelled || tap.moved) {
      blockGesture.cancelPendingPrimary();
      return;
    }
    blockGesture.onTouchEnd(event as any);
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
    + `${isDragging ? ' timeline-task-block--dragging' : ''}`;

  const blockStyle = {
    top: `${top}px`,
    height: `${renderHeight}px`,
    '--timeline-goal-color': goalColor,
  } as JSX.CSSProperties;

  const consumeSuppressedActivation = (event: Event): boolean => {
    if (Date.now() >= suppressClickUntilRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  return (
    <div
      ref={blockRef}
      class={className}
      data-task-status={lifecycle.status}
      data-timeline-kind={isPoint ? 'point' : 'range'}
      data-timeline-layer={isPlanned ? 'planned' : (block.timelineSource === 'task-session' ? 'actual' : 'legacy')}
      data-timeline-editable="true"
      data-timeline-compact-range={compactDirectManipulation ? 'true' : 'false'}
      data-timeline-gesture={activeGestureMode || undefined}
      title={`${generateTaskBlockTitle(block)}\n状态: ${lifecycle.label}`}
      style={blockStyle}
      onClick={(event) => {
        if (consumeSuppressedActivation(event as any)) return;
        blockGesture.onClick?.(event as any);
      }}
      onDblClick={(event) => {
        if (consumeSuppressedActivation(event as any)) return;
        blockGesture.onDblClick?.(event as any);
      }}
      onPointerDown={(event) => handleBlockPointerDown(event as any)}
      onPointerMove={(event) => {
        updateTouchTap(event as any);
        handlePointerMove(event as any);
      }}
      onPointerUp={(event) => {
        finishTouchTap(event as any);
        finishGesture(event as any);
      }}
      onPointerCancel={(event) => {
        finishTouchTap(event as any, true);
        finishGesture(event as any, true);
      }}
    >
      {!isPoint && block.isRangeStart ? (
        <div
          class="timeline-task-resize-handle timeline-task-resize-handle--start"
          role="separator"
          aria-label="拖动修改开始时间"
          title="拖动：修改开始时间"
          onPointerDown={(event) => beginGesture(event as any, 'resize-start')}
          onClick={(event) => event.stopPropagation()}
          onDblClick={(event) => event.stopPropagation()}
        />
      ) : null}

      <div
        class="timeline-task-move-handle"
        role="separator"
        aria-label="拖动移动整个任务时段"
        title="拖动：移动整个任务时段"
        onPointerDown={(event) => beginGesture(event as any, 'move')}
        onClick={(event) => event.stopPropagation()}
        onDblClick={(event) => event.stopPropagation()}
      />

      <div
        class="timeline-task-link"
        role="button"
        tabIndex={0}
        aria-label={`${block.title || block.pureText}，双击编辑`}
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
        onClick={(event) => event.stopPropagation()}
        onDblClick={(event) => event.stopPropagation()}
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
          title="拖动：修改结束时间"
          onPointerDown={(event) => beginGesture(event as any, 'resize-end')}
          onClick={(event) => event.stopPropagation()}
          onDblClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </div>
  );
}
