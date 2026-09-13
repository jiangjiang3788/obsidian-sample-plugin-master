import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { WhiteboardGroup, WhiteboardItem, WhiteboardPosition, WhiteboardStore } from '@core/whiteboard/public';
import type { WhiteboardCamera } from './WhiteboardCameraModel';
import { WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import { WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM } from './WhiteboardSemanticZoomModel';
import type { WhiteboardClientPoint } from './WhiteboardTransferModel';
import type { WhiteboardSemanticPresentationModel, WhiteboardSemanticPresentationPlacement } from './WhiteboardSemanticPresentationModel';
import {
  applyWhiteboardSelectionPreview,
  buildWhiteboardSelectionMoves,
  createWhiteboardMarqueeSession,
  getWhiteboardDirectGroups,
  getWhiteboardDirectItems,
  getWhiteboardGroupsIntersectingRect,
  getWhiteboardItemsIntersectingRect,
  mergeWhiteboardSelection,
  resolveWhiteboardMarqueeRects,
  type WhiteboardMarqueeSession,
  type WhiteboardRect,
  type WhiteboardSelectionMove,
} from './WhiteboardSelectionModel';

interface WhiteboardSelectionControllerInput {
  boardId: string;
  items: WhiteboardItem[];
  groups: WhiteboardGroup[];
  activeGroupId: string | null;
  visibleItems: WhiteboardItem[];
  visibleGroups: WhiteboardGroup[];
  storeReady: boolean;
  whiteboardStore: WhiteboardStore;
  viewportRef: { current: HTMLDivElement | null };
  camera: WhiteboardCamera;
  zoom: number;
  onNotice?: (message: string) => void;
  onSemanticMoveStart?: () => void;
  onSemanticItemDragPointerChange?: (itemIds: readonly string[], point: WhiteboardClientPoint | null) => void;
  onSemanticItemDrop?: (itemIds: readonly string[], point: WhiteboardClientPoint) => boolean | Promise<boolean>;
  semanticPresentationRef?: { current: WhiteboardSemanticPresentationModel | null };
}


function presentationIntersectsScreenRect(
  placement: WhiteboardSemanticPresentationPlacement,
  session: WhiteboardMarqueeSession,
  rect: WhiteboardRect,
): boolean {
  const centerX = (placement.worldPoint.x - session.camera.x) * session.zoom;
  const centerY = (placement.worldPoint.y - session.camera.y) * session.zoom;
  const left = centerX - placement.widthPx / 2;
  const right = centerX + placement.widthPx / 2;
  const top = centerY - placement.heightPx / 2;
  const bottom = centerY + placement.heightPx / 2;
  return left <= rect.right && right >= rect.left && top <= rect.bottom && bottom >= rect.top;
}

export function useWhiteboardSelectionController({
  boardId, items, groups, activeGroupId, visibleItems, visibleGroups, storeReady, whiteboardStore, viewportRef, camera, zoom, onNotice, onSemanticMoveStart,
  onSemanticItemDragPointerChange, onSemanticItemDrop, semanticPresentationRef,
}: WhiteboardSelectionControllerInput) {
  const [selectedItemIds, setSelectedItemIdsState] = useState<Set<string>>(() => new Set());
  const [selectedGroupIds, setSelectedGroupIdsState] = useState<Set<string>>(() => new Set());
  const [marqueeRect, setMarqueeRect] = useState<WhiteboardRect | null>(null);
  const [dragMoves, setDragMoves] = useState<WhiteboardSelectionMove[]>([]);
  const [semanticDragDelta, setSemanticDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const selectedRef = useRef(selectedItemIds);
  const selectedGroupsRef = useRef(selectedGroupIds);
  const marqueeRef = useRef<WhiteboardMarqueeSession | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const semanticCleanupRef = useRef<(() => void) | null>(null);
  const suppressOverviewClickUntilRef = useRef(0);

  const setSelectedItemIds = useCallback((next: Set<string>) => { selectedRef.current = next; setSelectedItemIdsState(next); }, []);
  const setSelectedGroupIds = useCallback((next: Set<string>) => { selectedGroupsRef.current = next; setSelectedGroupIdsState(next); }, []);
  const clear = useCallback(() => { setSelectedItemIds(new Set()); setSelectedGroupIds(new Set()); }, [setSelectedGroupIds, setSelectedItemIds]);
  const selectableItems = useMemo(() => getWhiteboardDirectItems(items, activeGroupId), [activeGroupId, items]);
  const selectableGroups = useMemo(() => getWhiteboardDirectGroups(groups, activeGroupId), [activeGroupId, groups]);

  useEffect(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    const next = new Set([...selectedRef.current].filter((id) => visibleIds.has(id)));
    if (next.size !== selectedRef.current.size) setSelectedItemIds(next);
  }, [setSelectedItemIds, visibleItems]);
  useEffect(() => {
    const visibleIds = new Set(visibleGroups.map((group) => group.id));
    const next = new Set([...selectedGroupsRef.current].filter((id) => visibleIds.has(id)));
    if (next.size !== selectedGroupsRef.current.size) setSelectedGroupIds(next);
  }, [setSelectedGroupIds, visibleGroups]);
  useEffect(() => () => { cleanupRef.current?.(); semanticCleanupRef.current?.(); onSemanticItemDragPointerChange?.([], null); }, [onSemanticItemDragPointerChange]);
  useEffect(() => { if (zoom >= WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM && selectedGroupsRef.current.size > 0) setSelectedGroupIds(new Set()); }, [setSelectedGroupIds, zoom]);

  const selectOnly = useCallback((itemId: string) => { setSelectedGroupIds(new Set()); setSelectedItemIds(new Set([itemId])); }, [setSelectedGroupIds, setSelectedItemIds]);
  const selectOnlyGroup = useCallback((groupId: string) => { setSelectedItemIds(new Set()); setSelectedGroupIds(new Set([groupId])); }, [setSelectedGroupIds, setSelectedItemIds]);
  const selectItems = useCallback((itemIds: readonly string[]) => { setSelectedGroupIds(new Set()); setSelectedItemIds(new Set(itemIds)); }, [setSelectedGroupIds, setSelectedItemIds]);
  const toggleItem = useCallback((itemId: string) => { const next = new Set(selectedRef.current); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); setSelectedItemIds(next); }, [setSelectedItemIds]);
  const toggleGroup = useCallback((groupId: string) => { const next = new Set(selectedGroupsRef.current); if (next.has(groupId)) next.delete(groupId); else next.add(groupId); setSelectedGroupIds(next); }, [setSelectedGroupIds]);

  const finishMarquee = useCallback((event: PointerEvent) => {
    const session = marqueeRef.current; if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); marqueeRef.current = null; cleanupRef.current?.(); cleanupRef.current = null; setMarqueeRect(null);
  }, []);
  const beginMarquee = useCallback((event: PointerEvent): boolean => {
    if (!(event.ctrlKey || event.metaKey) || (event.pointerType === 'mouse' && event.button !== 0)) return false;
    const viewport = viewportRef.current; if (!viewport) return false;
    event.preventDefault(); event.stopPropagation(); cleanupRef.current?.();
    const rect = viewport.getBoundingClientRect(); const baseItems = event.shiftKey ? selectedRef.current : []; const baseGroups = event.shiftKey ? selectedGroupsRef.current : [];
    const session = createWhiteboardMarqueeSession({ pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewportLeft: rect.left, viewportTop: rect.top, camera, zoom, baseSelection: baseItems });
    marqueeRef.current = session;
    const move = (next: PointerEvent) => {
      if (marqueeRef.current?.pointerId !== next.pointerId) return;
      next.preventDefault(); next.stopPropagation(); const resolved = resolveWhiteboardMarqueeRects(session, next.clientX, next.clientY); setMarqueeRect(resolved.screen);
      const presentation = zoom < WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM ? semanticPresentationRef?.current ?? null : null;
      const itemHits = presentation
        ? selectableItems.filter((item) => {
          const placement = presentation.items.get(item.id);
          return placement ? presentationIntersectsScreenRect(placement, session, resolved.screen) : getWhiteboardItemsIntersectingRect([item], resolved.world).length > 0;
        }).map((item) => item.id)
        : getWhiteboardItemsIntersectingRect(selectableItems, resolved.world);
      setSelectedItemIds(mergeWhiteboardSelection(session.baseSelection, itemHits));
      const groupHits = zoom < WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM
        ? presentation
          ? selectableGroups.filter((group) => {
            const placement = presentation.groups.get(group.id);
            return placement ? presentationIntersectsScreenRect(placement, session, resolved.screen) : getWhiteboardGroupsIntersectingRect([group], items, resolved.world).length > 0;
          }).map((group) => group.id)
          : getWhiteboardGroupsIntersectingRect(selectableGroups, items, resolved.world)
        : [];
      setSelectedGroupIds(mergeWhiteboardSelection(baseGroups, groupHits));
    };
    const up = (next: PointerEvent) => finishMarquee(next); const cancel = (next: PointerEvent) => finishMarquee(next);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    cleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
    return true;
  }, [camera, finishMarquee, items, selectableGroups, selectableItems, semanticPresentationRef, setSelectedGroupIds, setSelectedItemIds, viewportRef, zoom]);

  const isMultiDrag = useCallback((itemId: string) => selectedRef.current.has(itemId) && selectedRef.current.size > 1 && selectedGroupsRef.current.size === 0, []);
  const previewItemDrag = useCallback((itemId: string, position: WhiteboardPosition | null) => { if (!position || !isMultiDrag(itemId)) { setDragMoves([]); return; } setDragMoves(buildWhiteboardSelectionMoves({ items, selectedItemIds: selectedRef.current, draggedItemId: itemId, draggedPosition: position })); }, [isMultiDrag, items]);
  const applyPreview = useCallback((renderItems: readonly WhiteboardItem[]) => applyWhiteboardSelectionPreview(renderItems, dragMoves), [dragMoves]);
  const moveSelected = useCallback(async (itemId: string, position: WhiteboardPosition, targetGroupId?: string): Promise<boolean | null> => {
    if (!isMultiDrag(itemId)) return null; if (!storeReady) throw new Error('WhiteboardStore 尚未完成启动恢复');
    const moves = buildWhiteboardSelectionMoves({ items, selectedItemIds: selectedRef.current, draggedItemId: itemId, draggedPosition: position }); setDragMoves([]);
    try { return await whiteboardStore.moveItems(boardId, moves, targetGroupId); } catch (error) { onNotice?.(`移动所选卡片失败：${error instanceof Error ? error.message : String(error)}`); throw error; }
  }, [boardId, isMultiDrag, items, onNotice, storeReady, whiteboardStore]);
  const getDragItemIds = useCallback((itemId: string): string[] => isMultiDrag(itemId) ? [...selectedRef.current] : [itemId], [isMultiDrag]);

  const beginSemanticNodePointer = useCallback((event: PointerEvent, kind: 'item' | 'group', id: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation(); semanticCleanupRef.current?.(); onSemanticItemDragPointerChange?.([], null);
    if (event.ctrlKey || event.metaKey) { event.preventDefault(); kind === 'item' ? toggleItem(id) : toggleGroup(id); suppressOverviewClickUntilRef.current = Date.now() + 350; return; }
    const selected = kind === 'item' ? selectedRef.current.has(id) : selectedGroupsRef.current.has(id);
    if (!selected) kind === 'item' ? selectOnly(id) : selectOnlyGroup(id);
    const startX = event.clientX; const startY = event.clientY; const pointerId = event.pointerId; let moved = false;
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return; const dxScreen = next.clientX - startX; const dyScreen = next.clientY - startY;
      if (!moved && Math.hypot(dxScreen, dyScreen) < WHITEBOARD_DRAG_THRESHOLD_PX) return;
      if (!moved) onSemanticMoveStart?.(); moved = true; next.preventDefault(); next.stopPropagation(); setSemanticDragDelta({ dx: dxScreen / zoom, dy: dyScreen / zoom });
      if (kind === 'item' && selectedGroupsRef.current.size === 0) onSemanticItemDragPointerChange?.([...selectedRef.current], { clientX: next.clientX, clientY: next.clientY });
    };
    const finish = (next: PointerEvent, cancelled: boolean) => {
      if (next.pointerId !== pointerId) return; semanticCleanupRef.current?.(); semanticCleanupRef.current = null;
      const dxScreen = next.clientX - startX; const dyScreen = next.clientY - startY; const itemIds = [...selectedRef.current]; const groupIds = [...selectedGroupsRef.current];
      setSemanticDragDelta(null); onSemanticItemDragPointerChange?.([], null); if (!moved || cancelled) return;
      next.preventDefault(); next.stopPropagation(); suppressOverviewClickUntilRef.current = Date.now() + 350; if (!storeReady) return;
      const translate = () => whiteboardStore.translateNodes(boardId, itemIds, groupIds, dxScreen / zoom, dyScreen / zoom)
        .catch((error) => onNotice?.(`移动概览选择失败：${error instanceof Error ? error.message : String(error)}`));
      if (kind !== 'item' || groupIds.length > 0 || itemIds.length === 0 || !onSemanticItemDrop) { void translate(); return; }
      void Promise.resolve(onSemanticItemDrop(itemIds, { clientX: next.clientX, clientY: next.clientY }))
        .then((consumed) => consumed ? undefined : translate())
        .catch((error) => onNotice?.(`低倍率拖回左侧失败：${error instanceof Error ? error.message : String(error)}`));
    };
    const up = (next: PointerEvent) => finish(next, false); const cancel = (next: PointerEvent) => finish(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    semanticCleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  }, [boardId, onNotice, onSemanticItemDragPointerChange, onSemanticItemDrop, onSemanticMoveStart, selectOnly, selectOnlyGroup, storeReady, toggleGroup, toggleItem, whiteboardStore, zoom]);
  const consumeOverviewClickSuppression = useCallback(() => Date.now() < suppressOverviewClickUntilRef.current, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => { if (event.key !== 'Escape' || (selectedRef.current.size === 0 && selectedGroupsRef.current.size === 0)) return; event.preventDefault(); clear(); }, [clear]);
  const selectedIds = useMemo(() => selectedItemIds, [selectedItemIds]); const selectedGroups = useMemo(() => selectedGroupIds, [selectedGroupIds]);
  return { selectedItemIds: selectedIds, selectedGroupIds: selectedGroups, selectionCount: selectedIds.size + selectedGroups.size, marqueeRect, dragMoves, semanticDragDelta,
    clear, selectOnly, selectOnlyGroup, selectItems, toggleItem, toggleGroup, beginMarquee, isMultiDrag, getDragItemIds, previewItemDrag, applyPreview, moveSelected,
    beginSemanticNodePointer, consumeOverviewClickSuppression, handleKeyDown };
}
