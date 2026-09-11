/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { getWhiteboardGroupPathIds } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX, WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import type { WhiteboardSemanticZoomState } from './WhiteboardSemanticZoomModel';
import { WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX, WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX, WHITEBOARD_WORKBENCH_MIN_WIDTH_PX } from './WhiteboardWorkbenchModel';

export interface WhiteboardSemanticOverviewLayerProps {
  semantic: WhiteboardSemanticZoomState;
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
  onMoveAnnotation?: (annotationId: string, position: WhiteboardPosition) => void | Promise<void>;
  onNodePointerDown?: (event: PointerEvent, kind: 'item' | 'group', id: string) => void;
  shouldSuppressFocusClick?: () => boolean;
}

type AnnotationDrag = { annotationId: string; dx: number; dy: number };

function pointStyle(point: WhiteboardWorldPoint): string { return `left:${point.x}px;top:${point.y}px;`; }
function cardPoint(item: WhiteboardItem): WhiteboardWorldPoint { return { x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 }; }
function groupPoint(group: WhiteboardGroup): WhiteboardWorldPoint { return { x: group.x + (group.collapsed ? WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX : WHITEBOARD_WORKBENCH_MIN_WIDTH_PX) / 2, y: group.y + WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX / 2 }; }
function annotationPoint(annotation: WhiteboardAnnotation): WhiteboardWorldPoint { return { x: annotation.x + 130, y: annotation.y + (annotation.kind === 'sticky' ? 66 : 24) }; }
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
  semantic, items, groups, annotations, recordsById, selectedItemIds, selectedGroupIds = new Set<string>(), semanticDragDelta = null,
  activeFindItemId = null, findMatchSet = new Set<string>(), activeFindGroupId = null, dropTargetGroupId = null,
  onFocusItem, onFocusGroup, onFocusAnnotation, onMoveAnnotation, onNodePointerDown, shouldSuppressFocusClick,
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
        return <div key={group.id} class="think-whiteboard-overview-marker think-whiteboard-overview-marker--group" style={pointStyle(moved(groupPoint(group), shift, semanticDragDelta))} data-whiteboard-overview-group-id={group.id}>
          <button type="button" class={`think-whiteboard-overview-marker__button${selected ? ' is-selected' : ''}${activeFindGroupId === group.id ? ' is-find-active' : ''}${dropTargetGroupId === group.id ? ' is-drop-target' : ''}`}
            aria-label={`定位工作台：${group.title}`} title={`工作台：${group.title}；Ctrl/⌘ 点击多选，拖动已选节点可整体移动，右键整理，单击回到 100%`}
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
        return <div key={item.id} class="think-whiteboard-overview-marker think-whiteboard-overview-marker--card" style={pointStyle(moved(cardPoint(item), shift, semanticDragDelta))} data-whiteboard-overview-item-id={item.id}>
          <button type="button" class={`think-whiteboard-overview-marker__button${selected ? ' is-selected' : ''}${findState}`} aria-label={`定位卡片：${label}`}
            title={`${label}；Ctrl/⌘ 点击多选，拖动已选节点可整体移动，也可拖回左侧移出白板；右键整理，单击回到 100%`} data-record-type={record?.coreBlock ?? 'missing'}
            onPointerDown={((event: PointerEvent) => onNodePointerDown ? onNodePointerDown(event, 'item', item.id) : stopPointer(event)) as never}
            onClick={((event: Event) => focus(event, () => onFocusItem(item))) as never}>
            <span class="think-whiteboard-overview-marker__dot" aria-hidden="true" /><span class="think-whiteboard-overview-marker__label">{label}</span>
          </button>
        </div>;
      })}
      {semantic.showAnnotationLocators && annotations.map((annotation) => {
        const shift = annotationDrag?.annotationId === annotation.id ? annotationDrag : null;
        return <div key={annotation.id} class="think-whiteboard-overview-marker think-whiteboard-overview-marker--annotation" style={pointStyle(moved(annotationPoint(annotation), Boolean(shift), shift))} data-whiteboard-overview-annotation-id={annotation.id}>
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
