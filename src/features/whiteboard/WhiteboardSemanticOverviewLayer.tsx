/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT } from '@shared/ui/public';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { getWhiteboardGroupPathIds } from '@core/whiteboard/public';
import { WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import type { WhiteboardSemanticZoomState } from './WhiteboardSemanticZoomModel';
import type { WhiteboardSemanticPresentationModel, WhiteboardPresentationMode } from './WhiteboardSemanticPresentationModel';
import { getWhiteboardAnnotationWorldAnchor, getWhiteboardGroupWorldAnchor, getWhiteboardItemWorldAnchor } from './WhiteboardWorldGeometryModel';

export interface WhiteboardSemanticOverviewLayerProps {
  semantic: WhiteboardSemanticZoomState;
  presentation?: WhiteboardSemanticPresentationModel | null;
  items: readonly WhiteboardItem[];
  groups: readonly WhiteboardGroup[];
  annotations: readonly WhiteboardAnnotation[];
  recordsById: ReadonlyMap<string, RecordViewItem>;
  selectedItemIds: ReadonlySet<string>;
  selectedGroupIds?: ReadonlySet<string>;
  semanticDragDelta?: { dx: number; dy: number } | null;
  activeFindItemId?: string | null;
  findMatchSet?: ReadonlySet<string>;
  activeFindGroupId?: string | null;
  dropTargetGroupId?: string | null;
  onFocusItem: (item: WhiteboardItem) => void;
  onFocusGroup: (group: WhiteboardGroup) => void;
  onFocusAnnotation: (annotation: WhiteboardAnnotation) => void;
  onMoveAnnotation?: (annotationId: string, position: WhiteboardPosition) => void | boolean | Promise<void | boolean>;
  onNodePointerDown?: (event: PointerEvent, kind: 'item' | 'group', id: string) => void;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onBeginConnection?: (whiteboardItemId: string, event: PointerEvent) => void;
  onContextMenu?: (event: MouseEvent) => void;
  connectionSourceItemId?: string | null;
  connectionTargetItemId?: string | null;
  shouldSuppressFocusClick?: () => boolean;
}

type AnnotationDrag = { annotationId: string; dx: number; dy: number };

interface OverviewCardMarkerProps {
  item: WhiteboardItem;
  record: RecordViewItem | null;
  label: string;
  selected: boolean;
  findState: string;
  shiftedPoint: WhiteboardWorldPoint;
  markerMode?: WhiteboardPresentationMode;
  workbenchTitle?: string | null;
  onFocusItem: (item: WhiteboardItem) => void;
  onNodePointerDown?: (event: PointerEvent, kind: 'item' | 'group', id: string) => void;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onBeginConnection?: (whiteboardItemId: string, event: PointerEvent) => void;
  onContextMenu?: (event: MouseEvent) => void;
  connectionActive?: boolean;
  connectionTarget?: boolean;
  shouldSuppressFocusClick?: () => boolean;
}

function OverviewCardMarker({
  item, record, label, selected, findState, shiftedPoint, markerMode = 'label', workbenchTitle = null,
  onFocusItem, onNodePointerDown, onOpenRecord, onOpenRecordOrigin, onBeginConnection, onContextMenu,
  connectionActive = false, connectionTarget = false, shouldSuppressFocusClick,
}: OverviewCardMarkerProps) {
  const presentation = record ? buildWhiteboardRecordPresentation(record) : null;
  const gesture = useMemo(() => record ? createRecordGestureHandlers({
    item: record,
    onOpenOrigin: onOpenRecordOrigin,
    onPrimary: () => { void onOpenRecord?.(record); },
  }) : null, [onOpenRecord, onOpenRecordOrigin, record]);
  useEffect(() => () => gesture?.cancelPendingPrimary(), [gesture]);
  const pointerDown = (event: PointerEvent) => onNodePointerDown ? onNodePointerDown(event, 'item', item.id) : stopPointer(event);
  const guardGesture = (event: Event, handler?: (event: Event) => void) => {
    if (shouldSuppressFocusClick?.()) { event.preventDefault(); event.stopPropagation(); return; }
    handler?.(event);
  };
  const beginConnection = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); onBeginConnection?.(item.id, event);
  };
  const suppressConnectionClick = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
  const connectionHandles = (['top', 'right', 'bottom', 'left'] as const).map((side) => (
    <button key={side} type="button" class={`think-whiteboard-card__edge-handle is-${side}`} aria-label={`从卡片${side === 'top' ? '上' : side === 'right' ? '右' : side === 'bottom' ? '下' : '左'}边拖出连线`} data-whiteboard-edge-handle={side} onPointerDown={beginConnection as never} onClick={suppressConnectionClick as never} />
  ));
  return (
    <div class={`think-whiteboard-overview-marker think-whiteboard-overview-marker--card${markerMode === 'dot' ? ' is-presentation-dot' : ''}`} style={pointStyle(shiftedPoint)} data-whiteboard-overview-item-id={item.id}>
      <button type="button" class={`think-whiteboard-overview-marker__button${selected ? ' is-selected' : ''}${findState}${connectionActive ? ' is-connection-source' : ''}${connectionTarget ? ' is-connection-target' : ''}`} aria-label={`定位卡片：${label}`}
        title={`${label}；按住控制键或⌘键点击多选，拖动可移动；悬浮后可直接编辑、打开原文、连线或右键整理；单击定位点回到 100%`} data-record-type={record?.recordType ?? 'missing'}
        onPointerDown={pointerDown as never}
        onContextMenu={onContextMenu as never}
        onClick={((event: Event) => stopAndRun(event, () => { if (!shouldSuppressFocusClick?.()) onFocusItem(item); })) as never}>
        <span class="think-whiteboard-overview-marker__dot" aria-hidden="true" /><span class="think-whiteboard-overview-marker__label">{label}</span>
      </button>
      <article
        class={`think-whiteboard-overview-card-preview think-whiteboard-card think-card${record ? ' think-card--interactive' : ' think-whiteboard-card--missing'}${selected ? ' is-selected' : ''}${connectionActive ? ' is-connection-source' : ''}${findState}`}
        data-whiteboard-hover-item-id={item.id}
        data-whiteboard-selected={selected ? 'true' : 'false'}
        data-whiteboard-connection-source={connectionActive ? 'true' : 'false'}
        data-whiteboard-connection-target={connectionTarget ? 'true' : 'false'}
        data-record-type={record?.recordType ?? 'missing'}
        role="button"
        tabIndex={0}
        title={record ? `类型：${presentation?.typeLabel ?? ''}；${RECORD_GESTURE_HINT}；拖动可调整位置；按住控制键或⌘键点击多选；从四边拖出连线；右键可归档或移出` : '原记录当前不可用；拖动仍可调整位置，右键可整理'}
        onPointerDown={pointerDown as never}
        onContextMenu={onContextMenu as never}
        onClick={record ? ((event: Event) => guardGesture(event, gesture?.onClick)) as never : undefined}
        onDblClick={record ? ((event: Event) => guardGesture(event, gesture?.onDblClick)) as never : undefined}
        onTouchEnd={record ? ((event: Event) => guardGesture(event, gesture?.onTouchEnd)) as never : undefined}
        onKeyDown={record ? gesture?.onKeyDown as never : undefined}
      >
        {connectionHandles}
        {record ? (
          <>
            <div class="think-whiteboard-card__header">
              <span class="think-whiteboard-card__goal" title={presentation?.goalLabel || '未归属目标'}>{presentation?.goalLabel || '未归属目标'}</span>
              {presentation?.temporalLabel && <span class="think-whiteboard-card__date">{presentation.temporalLabel}</span>}
            </div>
            <div class="think-whiteboard-card__title">{presentation?.primaryText}</div>
            {workbenchTitle && <div class="think-whiteboard-card__workbench">▣ {workbenchTitle}</div>}
            {presentation?.summary && <div class="think-whiteboard-card__summary">{presentation.summary}</div>}
            {(presentation?.detailLabels.length ?? 0) > 0 && <div class="think-whiteboard-card__meta">{presentation?.detailLabels.map((detail) => <span key={detail}>{detail}</span>)}</div>}
          </>
        ) : (
          <>
            <div class="think-whiteboard-card__header"><span class="think-whiteboard-card__goal">原记录不可用</span></div>
            <div class="think-whiteboard-card__title">⚠ 原记录当前不可用</div>
            <div class="think-whiteboard-card__record-id">{item.recordId}</div>
            {workbenchTitle && <div class="think-whiteboard-card__workbench">▣ {workbenchTitle}</div>}
          </>
        )}
      </article>
    </div>
  );
}


function pointStyle(point: WhiteboardWorldPoint): string { return `left:${point.x}px;top:${point.y}px;`; }
function stopPointer(event: Event) { event.stopPropagation(); }
function stopAndRun(event: Event, run: () => void) { event.preventDefault(); event.stopPropagation(); run(); }
function coveredBySelectedGroup(groupId: string | undefined, groups: readonly WhiteboardGroup[], selected: ReadonlySet<string>): boolean {
  if (!groupId || selected.size === 0) return false;
  return getWhiteboardGroupPathIds(groups, groupId).some((id) => selected.has(id));
}
function moved(point: WhiteboardWorldPoint, shouldMove: boolean, delta?: { dx: number; dy: number } | null): WhiteboardWorldPoint {
  return shouldMove && delta ? { x: point.x + delta.dx, y: point.y + delta.dy } : point;
}

export function WhiteboardSemanticOverviewLayer({
  semantic, presentation = null, items, groups, annotations, recordsById, selectedItemIds, selectedGroupIds = new Set<string>(), semanticDragDelta = null,
  activeFindItemId = null, findMatchSet = new Set<string>(), activeFindGroupId = null, dropTargetGroupId = null,
  onFocusItem, onFocusGroup, onFocusAnnotation, onMoveAnnotation, onNodePointerDown, onOpenRecord, onOpenRecordOrigin, onBeginConnection, onContextMenu,
  connectionSourceItemId = null, connectionTargetItemId = null, shouldSuppressFocusClick,
}: WhiteboardSemanticOverviewLayerProps) {
  const [annotationDrag, setAnnotationDrag] = useState<AnnotationDrag | null>(null);
  const annotationCleanupRef = useRef<(() => void) | null>(null);
  const suppressAnnotationClickUntilRef = useRef(0);
  useEffect(() => () => annotationCleanupRef.current?.(), []);
  if (semantic.level === 'detail') return null;
  const focus = (event: Event, run: () => void) => stopAndRun(event, () => { if (!shouldSuppressFocusClick?.()) run(); });
  const beginAnnotationDrag = (event: PointerEvent, annotation: WhiteboardAnnotation) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation(); annotationCleanupRef.current?.();
    const pointerId = event.pointerId; const startX = event.clientX; const startY = event.clientY; let didMove = false;
    const safeZoom = Number.isFinite(semantic.zoom) && semantic.zoom > 0 ? semantic.zoom : 1;
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const sx = next.clientX - startX; const sy = next.clientY - startY;
      if (!didMove && Math.hypot(sx, sy) < WHITEBOARD_DRAG_THRESHOLD_PX) return;
      didMove = true; next.preventDefault(); next.stopPropagation(); setAnnotationDrag({ annotationId: annotation.id, dx: sx / safeZoom, dy: sy / safeZoom });
    };
    const finish = (next: PointerEvent, cancelled: boolean) => {
      if (next.pointerId !== pointerId) return;
      annotationCleanupRef.current?.(); annotationCleanupRef.current = null;
      const sx = next.clientX - startX; const sy = next.clientY - startY; setAnnotationDrag(null);
      if (!didMove || cancelled) return;
      next.preventDefault(); next.stopPropagation(); suppressAnnotationClickUntilRef.current = Date.now() + 350;
      void onMoveAnnotation?.(annotation.id, { x: annotation.x + sx / safeZoom, y: annotation.y + sy / safeZoom, zIndex: annotation.zIndex });
    };
    const up = (next: PointerEvent) => finish(next, false); const cancel = (next: PointerEvent) => finish(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    annotationCleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  };
  return (
    <div class="think-whiteboard-overview-layer" data-whiteboard-overview-level={semantic.level} aria-label="白板缩放概览定位层">
      {semantic.showGroupLocators && groups.map((group) => {
        const selected = selectedGroupIds.has(group.id); const shift = selected || coveredBySelectedGroup(group.parentGroupId, groups, selectedGroupIds);
        const placement = presentation?.groups.get(group.id); const basePoint = placement?.worldPoint ?? getWhiteboardGroupWorldAnchor(group);
        return <div key={group.id} class={`think-whiteboard-overview-marker think-whiteboard-overview-marker--group${placement?.mode === 'dot' ? ' is-presentation-dot' : ''}`} style={pointStyle(moved(basePoint, shift, semanticDragDelta))} data-whiteboard-overview-group-id={group.id}>
          <button type="button" class={`think-whiteboard-overview-marker__button${selected ? ' is-selected' : ''}${activeFindGroupId === group.id ? ' is-find-active' : ''}${dropTargetGroupId === group.id ? ' is-drop-target' : ''}`}
            aria-label={`定位工作台：${group.title}`} title={`工作台：${group.title}；按住控制键或⌘键点击多选，拖动已选节点可整体移动，右键整理，单击回到 100%`}
            onPointerDown={((event: PointerEvent) => onNodePointerDown ? onNodePointerDown(event, 'group', group.id) : stopPointer(event)) as never}
            onClick={((event: Event) => focus(event, () => onFocusGroup(group))) as never}>
            <span aria-hidden="true">▣</span><span class="think-whiteboard-overview-marker__label">{group.title}</span>
          </button>
        </div>;
      })}
      {semantic.showCardLocators && items.map((item) => {
        const record = recordsById.get(item.recordId) ?? null; const label = record ? buildWhiteboardRecordPresentation(record).primaryText : '原记录不可用';
        const findState = activeFindItemId === item.id ? ' is-find-active' : findMatchSet.has(item.id) ? ' is-find-match' : '';
        const selected = selectedItemIds.has(item.id); const shift = selected || coveredBySelectedGroup(item.groupId, groups, selectedGroupIds);
        const workbenchTitle = item.groupId ? groups.find((group) => group.id === item.groupId)?.title ?? null : null;
        const placement = presentation?.items.get(item.id); const basePoint = placement?.worldPoint ?? getWhiteboardItemWorldAnchor(item);
        return <OverviewCardMarker key={item.id} item={item} record={record} label={label} selected={selected} findState={findState}
          shiftedPoint={moved(basePoint, shift, semanticDragDelta)} markerMode={placement?.mode ?? (semantic.level === 'overview' ? 'dot' : 'label')} workbenchTitle={workbenchTitle} onFocusItem={onFocusItem}
          onNodePointerDown={onNodePointerDown} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} onBeginConnection={onBeginConnection} onContextMenu={onContextMenu}
          connectionActive={connectionSourceItemId === item.id} connectionTarget={connectionTargetItemId === item.id} shouldSuppressFocusClick={shouldSuppressFocusClick} />;
      })}
      {semantic.showAnnotationLocators && annotations.map((annotation) => {
        const shift = annotationDrag?.annotationId === annotation.id ? annotationDrag : null;
        const placement = presentation?.annotations.get(annotation.id); const basePoint = placement?.worldPoint ?? getWhiteboardAnnotationWorldAnchor(annotation);
        return <div key={annotation.id} class="think-whiteboard-overview-marker think-whiteboard-overview-marker--annotation" style={pointStyle(moved(basePoint, Boolean(shift), shift))} data-whiteboard-overview-annotation-id={annotation.id}>
          <button type="button" class={`think-whiteboard-overview-marker__button${shift ? ' is-dragging' : ''}`} aria-label={`定位${annotation.kind === 'sticky' ? '便签' : '文字标注'}`} title="拖动可移动标注；单击回到 100%"
            onPointerDown={((event: PointerEvent) => beginAnnotationDrag(event, annotation)) as never}
            onClick={((event: Event) => { if (Date.now() >= suppressAnnotationClickUntilRef.current) focus(event, () => onFocusAnnotation(annotation)); else { event.preventDefault(); event.stopPropagation(); } }) as never}>
            <span aria-hidden="true">{annotation.kind === 'sticky' ? '◆' : 'T'}</span>
          </button>
        </div>;
      })}
    </div>
  );
}
