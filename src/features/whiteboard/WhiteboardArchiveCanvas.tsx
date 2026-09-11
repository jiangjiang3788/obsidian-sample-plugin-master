/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardArchivedItem, WhiteboardItem } from '@core/whiteboard/public';
import { ThinkButton, ThinkIconButton } from '@shared/ui/public';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import { useWhiteboardViewportController } from './WhiteboardZoomController';
import { getWhiteboardCanvasContentBounds, getWhiteboardCanvasHomePoint } from './WhiteboardContentBoundsModel';
import { arrangeWhiteboardItems } from './WhiteboardArrangeModel';
import { arrangeWhiteboardItemsBySpec, type WhiteboardSemanticLayoutGuide } from './WhiteboardSemanticLayoutModel';
import { WhiteboardSemanticLayoutOverlay } from './WhiteboardSemanticLayoutOverlay';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX, WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import { createWhiteboardMarqueeSession, getWhiteboardItemsIntersectingRect, mergeWhiteboardSelection, resolveWhiteboardMarqueeRects, type WhiteboardRect } from './WhiteboardSelectionModel';

interface Props {
  items: readonly WhiteboardArchivedItem[];
  recordsById: ReadonlyMap<string, RecordViewItem>;
  restoringItemIds: ReadonlySet<string>;
  onRestore: (itemId: string) => void | Promise<void>;
  onMoveItems: (moves: readonly { itemId: string; archiveX: number; archiveY: number; archiveZIndex?: number }[]) => void | Promise<boolean>;
  onClose: () => void;
  gridVisible?: boolean;
}

function displayItem(item: WhiteboardArchivedItem, index: number): WhiteboardItem {
  return { id: item.id, recordId: item.recordId, x: item.archiveX ?? 48 + (index % 4) * 304, y: item.archiveY ?? 72 + Math.floor(index / 4) * 308, zIndex: item.archiveZIndex ?? index + 1 };
}

export function WhiteboardArchiveCanvas({ items, recordsById, restoringItemIds, onRestore, onMoveItems, onClose, gridVisible = false }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewport = useWhiteboardViewportController(viewportRef);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<WhiteboardRect | null>(null);
  const [guides, setGuides] = useState<WhiteboardSemanticLayoutGuide[]>([]);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const displayItems = useMemo(() => items.map(displayItem), [items]);
  const displayById = useMemo(() => new Map(displayItems.map((item) => [item.id, item])), [displayItems]);
  const bounds = useMemo(() => getWhiteboardCanvasContentBounds(displayItems, [], []), [displayItems]);
  const home = useMemo(() => getWhiteboardCanvasHomePoint(displayItems, [], []), [displayItems]);
  useEffect(() => { const valid = new Set(displayItems.map((item) => item.id)); setSelectedIds((current) => new Set([...current].filter((id) => valid.has(id)))); }, [displayItems]);
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const moveFromDisplay = useCallback(async (moves: readonly { itemId: string; position: { x: number; y: number; zIndex?: number } }[]) => {
    await onMoveItems(moves.map(({ itemId, position }) => ({ itemId, archiveX: position.x, archiveY: position.y, archiveZIndex: position.zIndex })));
  }, [onMoveItems]);
  const targetItems = useCallback(() => selectedIds.size > 0 ? displayItems.filter((item) => selectedIds.has(item.id)) : displayItems, [displayItems, selectedIds]);
  const arrangeTargetCount = selectedIds.size > 0 ? selectedIds.size : displayItems.length;
  const arrangeGrid = useCallback(() => { const targets = targetItems(); if (targets.length < 2) return; setGuides([]); void moveFromDisplay(arrangeWhiteboardItems(targets, 'grid')); }, [moveFromDisplay, targetItems]);
  const arrangeSemantic = useCallback(() => { const targets = targetItems(); if (targets.length < 2) return; const result = arrangeWhiteboardItemsBySpec(targets, recordsById); setGuides(result.guides); void moveFromDisplay(result.moves); }, [moveFromDisplay, recordsById, targetItems]);
  const moveGuide = useCallback((guideId: string, position: { x: number; y: number }) => setGuides((current) => current.map((guide) => guide.id === guideId ? { ...guide, x: position.x, y: position.y } : guide)), []);

  const beginCanvasPointerDown = useCallback((event: PointerEvent) => {
    if (!(event.ctrlKey || event.metaKey) || (event.pointerType === 'mouse' && event.button !== 0)) { setSelectedIds(new Set()); viewport.beginPan(event); return; }
    const host = viewportRef.current; if (!host) return; event.preventDefault(); event.stopPropagation(); dragCleanupRef.current?.();
    const rect = host.getBoundingClientRect(); const baseSelection = event.shiftKey ? selectedIds : new Set<string>();
    const session = createWhiteboardMarqueeSession({ pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewportLeft: rect.left, viewportTop: rect.top, camera: viewport.camera, zoom: viewport.zoom, baseSelection });
    const move = (next: PointerEvent) => { if (next.pointerId !== event.pointerId) return; next.preventDefault(); next.stopPropagation(); const resolved = resolveWhiteboardMarqueeRects(session, next.clientX, next.clientY); setMarqueeRect(resolved.screen); setSelectedIds(mergeWhiteboardSelection(session.baseSelection, getWhiteboardItemsIntersectingRect(displayItems, resolved.world))); };
    const finish = (next: PointerEvent) => { if (next.pointerId !== event.pointerId) return; next.preventDefault(); next.stopPropagation(); dragCleanupRef.current?.(); dragCleanupRef.current = null; setMarqueeRect(null); };
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', finish, true); window.addEventListener('pointercancel', finish, true);
    dragCleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', finish, true); window.removeEventListener('pointercancel', finish, true); };
  }, [displayItems, selectedIds, viewport.beginPan, viewport.camera, viewport.zoom]);

  const beginDrag = useCallback((event: PointerEvent, itemId: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation(); dragCleanupRef.current?.();
    if (event.ctrlKey || event.metaKey) { event.preventDefault(); setSelectedIds((current) => { const next = new Set(current); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; }); return; }
    if (!selectedIds.has(itemId)) setSelectedIds(new Set([itemId]));
    const ids = selectedIds.has(itemId) && selectedIds.size > 1 ? [...selectedIds] : [itemId];
    const startX = event.clientX; const startY = event.clientY; const pointerId = event.pointerId; let moved = false;
    const move = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; const sx = next.clientX - startX; const sy = next.clientY - startY; if (!moved && Math.hypot(sx, sy) < WHITEBOARD_DRAG_THRESHOLD_PX) return; if (!moved) setGuides([]); moved = true; next.preventDefault(); next.stopPropagation(); setDragDelta({ dx: sx / viewport.zoom, dy: sy / viewport.zoom }); };
    const finish = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; dragCleanupRef.current?.(); dragCleanupRef.current = null; const sx = next.clientX - startX; const sy = next.clientY - startY; setDragDelta(null); if (!moved) return; next.preventDefault(); next.stopPropagation(); const dx = sx / viewport.zoom; const dy = sy / viewport.zoom;
      void onMoveItems(ids.flatMap((id) => { const item = displayById.get(id); return item ? [{ itemId: id, archiveX: item.x + dx, archiveY: item.y + dy, archiveZIndex: item.zIndex }] : []; })); };
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', finish, true); window.addEventListener('pointercancel', finish, true);
    dragCleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', finish, true); window.removeEventListener('pointercancel', finish, true); };
  }, [displayById, onMoveItems, selectedIds, viewport.zoom]);

  return <section class="think-whiteboard-archive-canvas" aria-label="归档工作台">
    <header class="think-whiteboard-archive-canvas__toolbar">
      <div class="think-whiteboard-archive-canvas__title"><strong>归档工作台</strong><span>{items.length} 张{selectedIds.size ? ` · 已选 ${selectedIds.size}` : ''}</span></div>
      <div class="think-whiteboard-archive-canvas__actions">
        <ThinkButton size="sm" variant="ghost" onClick={() => setSelectedIds(selectedIds.size === displayItems.length ? new Set() : new Set(displayItems.map((item) => item.id)))}>{selectedIds.size === displayItems.length && displayItems.length ? '取消全选' : '全选'}</ThinkButton>
        <ThinkButton size="sm" variant="ghost" disabled={arrangeTargetCount < 2} onClick={arrangeGrid}>网格整理</ThinkButton>
        <ThinkButton size="sm" variant="secondary" disabled={arrangeTargetCount < 2} onClick={arrangeSemantic}>目标 × 类型 × 时间</ThinkButton>
        <ThinkButton size="sm" variant="ghost" onClick={() => viewport.resetViewOnWorldPoint(home)}>回到中心 · 100%</ThinkButton>
        <ThinkButton size="sm" variant="ghost" disabled={!bounds} onClick={() => bounds && viewport.fitWorldBounds(bounds, home)}>适配内容</ThinkButton>
        <ThinkIconButton size="sm" label="关闭归档工作台" icon={<span aria-hidden="true">×</span>} onClick={onClose} />
      </div>
    </header>
    <div class="think-whiteboard-archive-canvas__viewport" ref={viewportRef} style={viewport.gridStyle} onWheel={viewport.handleWheel as never} onPointerDown={beginCanvasPointerDown as never} data-whiteboard-archive-zoom={viewport.zoom} data-whiteboard-grid={gridVisible ? 'on' : 'off'}>
      {displayItems.length === 0 && <div class="think-whiteboard-empty">暂无归档卡片</div>}
      {marqueeRect && <div class="think-whiteboard-selection-marquee" style={`left:${marqueeRect.left}px;top:${marqueeRect.top}px;width:${marqueeRect.width}px;height:${marqueeRect.height}px;`} aria-hidden="true" />}
      <div class="think-whiteboard-world" style={`transform:${viewport.worldTransform};`}>
        <WhiteboardSemanticLayoutOverlay guides={guides} zoom={viewport.zoom} onSelectItems={(ids) => setSelectedIds(new Set(ids))} onMoveGuide={moveGuide} />
        {displayItems.map((item, index) => {
          const archived = items[index]; const record = recordsById.get(item.recordId) ?? null; const presentation = record ? buildWhiteboardRecordPresentation(record) : null;
          const selected = selectedIds.has(item.id); const shift = selected && dragDelta ? dragDelta : null; const x = item.x + (shift?.dx ?? 0); const y = item.y + (shift?.dy ?? 0);
          return <article key={item.id} class={`think-whiteboard-archive-card think-card${selected ? ' is-selected' : ''}`} style={`left:${x}px;top:${y}px;z-index:${item.zIndex ?? 1};`} data-record-type={record?.coreBlock ?? 'missing'} data-whiteboard-archived-item-id={item.id} onPointerDown={((event: PointerEvent) => beginDrag(event, item.id)) as never}>
            <div class="think-whiteboard-card__header"><span class="think-whiteboard-card__goal">{presentation?.goalLabel || '未归属目标'}</span>{presentation?.temporalLabel && <span class="think-whiteboard-card__date">{presentation.temporalLabel}</span>}</div>
            <div class="think-whiteboard-card__title">{presentation?.primaryText ?? item.recordId}</div>
            {presentation?.detailLabels.length ? <div class="think-whiteboard-card__meta">{presentation.detailLabels.map((label) => <span key={label}>{label}</span>)}</div> : null}
            <div class="think-whiteboard-archive-card__origin">恢复位置 {Math.round(archived.x)}, {Math.round(archived.y)}</div>
            <div class="think-whiteboard-card__footer" onPointerDown={((event: Event) => event.stopPropagation()) as never}><ThinkButton size="sm" variant="secondary" disabled={restoringItemIds.has(item.id)} onClick={() => { setGuides([]); void onRestore(item.id); }}>{restoringItemIds.has(item.id) ? '恢复中…' : '恢复到原位置'}</ThinkButton></div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
