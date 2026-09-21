/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT } from '@shared/ui/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import type { WhiteboardClientPoint } from './WhiteboardTransferModel';
import {
  createWhiteboardDragSession,
  resolveWhiteboardDragPreview,
  type WhiteboardDragSession,
} from './WhiteboardDragModel';

export interface WhiteboardCardProps {
  whiteboardItem: WhiteboardItem;
  record: RecordViewItem | null;
  activeZIndex: number;
  zoom?: number;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onMove: (whiteboardItemId: string, position: WhiteboardPosition) => void | Promise<void>;
  onPreviewChange?: (whiteboardItemId: string, position: WhiteboardPosition | null) => void;
  onDragPointerChange?: (whiteboardItemId: string, point: WhiteboardClientPoint | null) => void;
  onDropToSource?: (whiteboardItemId: string, point: WhiteboardClientPoint) => boolean | Promise<boolean>;
  onBeginConnection?: (whiteboardItemId: string, event: PointerEvent) => void;
  connectionActive?: boolean;
  connectionTarget?: boolean;
  workbenchTitle?: string | null;
  selected?: boolean;
  onToggleSelection?: (whiteboardItemId: string) => void;
  findState?: 'idle' | 'match' | 'active' | 'dimmed';
}

const CLICK_SUPPRESS_AFTER_DRAG_MS = 350;

export function WhiteboardCard({
  whiteboardItem,
  record,
  activeZIndex,
  zoom = 1,
  onOpenRecord,
  onOpenRecordOrigin,
  onMove,
  onPreviewChange,
  onDragPointerChange,
  onDropToSource,
  onBeginConnection,
  connectionActive = false,
  connectionTarget = false,
  workbenchTitle = null,
  selected = false,
  onToggleSelection,
  findState = 'idle',
}: WhiteboardCardProps) {
  const dragSessionRef = useRef<WhiteboardDragSession | null>(null);
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const dragListenerCleanupRef = useRef<(() => void) | null>(null);
  const previewRef = useRef<WhiteboardPosition | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [preview, setPreview] = useState<WhiteboardPosition | null>(null);
  const [committing, setCommitting] = useState(false);

  const visiblePosition = preview ?? whiteboardItem;
  const cardStyle = {
    left: `${visiblePosition.x}px`,
    top: `${visiblePosition.y}px`,
    zIndex: visiblePosition.zIndex ?? 1,
  };

  const clearDragListeners = () => {
    dragListenerCleanupRef.current?.();
    dragListenerCleanupRef.current = null;
  };

  const handlePointerMove = (event: PointerEvent) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const next = resolveWhiteboardDragPreview(session, event.clientX, event.clientY, zoom);
    if (!next) return;
    event.preventDefault();
    previewRef.current = next;
    setPreview(next);
    onPreviewChange?.(whiteboardItem.id, next);
    onDragPointerChange?.(whiteboardItem.id, { clientX: event.clientX, clientY: event.clientY });
  };

  const finishDrag = (event: PointerEvent, cancelled = false) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragSessionRef.current = null;
    clearDragListeners();
    try {
      dragTargetRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Host may have already released capture.
    }
    dragTargetRef.current = null;

    const committedPreview = previewRef.current;
    if (cancelled || !committedPreview) {
      previewRef.current = null;
      setPreview(null);
      onPreviewChange?.(whiteboardItem.id, null);
      onDragPointerChange?.(whiteboardItem.id, null);
      return;
    }

    event.preventDefault();
    suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_AFTER_DRAG_MS;
    onDragPointerChange?.(whiteboardItem.id, null);
    setCommitting(true);
    const point = { clientX: event.clientX, clientY: event.clientY };
    void Promise.resolve(onDropToSource?.(whiteboardItem.id, point) ?? false)
      .then((consumedBySource) => consumedBySource ? undefined : onMove(whiteboardItem.id, committedPreview))
      .catch(() => undefined)
      .finally(() => {
        previewRef.current = null;
        setPreview(null);
        setCommitting(false);
        onPreviewChange?.(whiteboardItem.id, null);
      });
  };


  const beginDrag = (event: PointerEvent) => {
    if (committing) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_AFTER_DRAG_MS;
      onToggleSelection?.(whiteboardItem.id);
      return;
    }
    event.stopPropagation();
    clearDragListeners();
    dragSessionRef.current = createWhiteboardDragSession({
      item: whiteboardItem,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      activeZIndex,
    });
    const target = event.currentTarget as HTMLElement;
    dragTargetRef.current = target;
    target.setPointerCapture?.(event.pointerId);

    const move = (nextEvent: PointerEvent) => handlePointerMove(nextEvent);
    const up = (nextEvent: PointerEvent) => finishDrag(nextEvent, false);
    const cancel = (nextEvent: PointerEvent) => finishDrag(nextEvent, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    dragListenerCleanupRef.current = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
  };

  useEffect(() => () => {
    dragListenerCleanupRef.current?.();
    dragListenerCleanupRef.current = null;
    dragSessionRef.current = null;
    dragTargetRef.current = null;
    onDragPointerChange?.(whiteboardItem.id, null);
  }, [onDragPointerChange, whiteboardItem.id]);

  const beginConnection = (event: PointerEvent) => { event.preventDefault(); event.stopPropagation(); onBeginConnection?.(whiteboardItem.id, event); };
  const suppressConnectionClick = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
  const connectionHandles = (['top', 'right', 'bottom', 'left'] as const).map((side) => (
    <button key={side} type="button" class={`think-whiteboard-card__edge-handle is-${side}`} aria-label={`从卡片${side === 'top' ? '上' : side === 'right' ? '右' : side === 'bottom' ? '下' : '左'}边拖出连线`} data-whiteboard-edge-handle={side} onPointerDown={beginConnection as never} onClick={suppressConnectionClick as never} />
  ));

  const findClass = findState === 'idle' ? '' : ` is-find-${findState}`;

  const sharedArticleProps = {
    style: cardStyle,
    'data-whiteboard-item-id': whiteboardItem.id,
    'data-whiteboard-dragging': preview ? 'true' : 'false',
    'data-whiteboard-connection-source': connectionActive ? 'true' : 'false',
    'data-whiteboard-connection-target': connectionTarget ? 'true' : 'false',
    'data-whiteboard-find-state': findState,
    'data-whiteboard-selected': selected ? 'true' : 'false',
    onPointerDown: beginDrag as never,
  };

  if (!record) {
    return (
      <article
        {...sharedArticleProps}
        class={`think-whiteboard-card think-card think-whiteboard-card--missing${preview ? ' is-dragging' : ''}${selected ? ' is-selected' : ''}${connectionActive ? ' is-connection-source' : ''}${findClass}`}
        data-record-type="missing"
      >
        {connectionHandles}
        <div class="think-whiteboard-card__header">
          <span class="think-whiteboard-card__goal">原记录不可用</span>
        </div>
        <div class="think-whiteboard-card__title">⚠ 原记录当前不可用</div>
        <div class="think-whiteboard-card__record-id">{whiteboardItem.recordId}</div>
        {workbenchTitle && <div class="think-whiteboard-card__workbench">▣ {workbenchTitle}</div>}
      </article>
    );
  }

  const presentation = buildWhiteboardRecordPresentation(record);
  const gesture = createRecordGestureHandlers({
    item: record,
    onOpenOrigin: onOpenRecordOrigin,
    onPrimary: () => {
      void onOpenRecord?.(record);
    },
  });

  const guardAfterDrag = (event: Event, handler?: (event: Event) => void) => {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    handler?.(event);
  };

  return (
    <article
      {...sharedArticleProps}
      class={`think-whiteboard-card think-card think-card--interactive${preview ? ' is-dragging' : ''}${selected ? ' is-selected' : ''}${committing ? ' is-committing' : ''}${connectionActive ? ' is-connection-source' : ''}${findClass}`}
      data-record-type={record.recordType}
      role="button"
      tabIndex={0}
      title={`类型：${presentation.typeLabel}；${RECORD_GESTURE_HINT}；拖动卡片可调整位置；按住控制键、⌘键或换挡键点击多选；从四边拖出连线；右键可归档或移出`}
      onClick={((event: Event) => guardAfterDrag(event, gesture.onClick)) as never}
      onDblClick={((event: Event) => guardAfterDrag(event, gesture.onDblClick)) as never}
      onTouchEnd={((event: Event) => guardAfterDrag(event, gesture.onTouchEnd)) as never}
      onKeyDown={gesture.onKeyDown as never}
    >
      {connectionHandles}
      <div class="think-whiteboard-card__header">
        <span class="think-whiteboard-card__goal" title={presentation.goalLabel || '未归属目标'}>{presentation.goalLabel || '未归属目标'}</span>
        {presentation.temporalLabel && <span class="think-whiteboard-card__date">{presentation.temporalLabel}</span>}
      </div>
      <div class="think-whiteboard-card__title">{presentation.primaryText}</div>
      {workbenchTitle && <div class="think-whiteboard-card__workbench">▣ {workbenchTitle}</div>}
      {presentation.summary && <div class="think-whiteboard-card__summary">{presentation.summary}</div>}
      {presentation.detailLabels.length > 0 && (
        <div class="think-whiteboard-card__meta">
          {presentation.detailLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
      )}
    </article>
  );
}
