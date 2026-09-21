/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_TITLE, getWhiteboardGroupPathIds, type WhiteboardBoard, type WhiteboardPosition,
  type WhiteboardStore, type WhiteboardStoreStatus } from '@core/whiteboard/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import { WhiteboardCard } from './WhiteboardCard';
import { WhiteboardEdgeLayer } from './WhiteboardEdgeLayer';
import { WhiteboardRecordSourcePanel } from './WhiteboardRecordSourcePanel';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';
import { getNextWhiteboardZIndex, WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { WhiteboardBoardTools } from './WhiteboardBoardTools';
import { getWhiteboardCanvasContentBounds, getWhiteboardCanvasHomePoint } from './WhiteboardContentBoundsModel';
import { useWhiteboardRecordTransferController } from './WhiteboardRecordTransferController';
import { useWhiteboardViewportController } from './WhiteboardZoomController';
import { useWhiteboardFindController } from './WhiteboardFindController';
import { isWhiteboardClientPointInsideRect, type WhiteboardClientPoint } from './WhiteboardTransferModel';
import { WhiteboardWorkbenchGroup } from './WhiteboardWorkbenchGroup';
import { useWhiteboardWorkbenchController } from './WhiteboardWorkbenchController';
import { useWhiteboardSelectionController } from './WhiteboardSelectionController';
import { useWhiteboardConnectionController } from './WhiteboardConnectionController';
import { useWhiteboardArchiveController } from './WhiteboardArchiveController';
import { WhiteboardArchiveCanvas } from './WhiteboardArchiveCanvas';
import { useWhiteboardHistoryController } from './WhiteboardHistoryController';
import { useWhiteboardNestedCanvasController } from './WhiteboardNestedCanvasController';
import { getWhiteboardItemPathLabel } from './WhiteboardNestedNavigationModel';
import { WhiteboardCanvasBreadcrumbs } from './WhiteboardCanvasBreadcrumbs';
import { WhiteboardAnnotation } from './WhiteboardAnnotation';
import { useWhiteboardAnnotationController } from './WhiteboardAnnotationController';
import { WhiteboardContextMenu } from './WhiteboardContextMenu';
import { WhiteboardSemanticOverviewLayer } from './WhiteboardSemanticOverviewLayer';
import { getWhiteboardSemanticZoomState, getWhiteboardSemanticZoomStatus, getWhiteboardSemanticZoomStyle } from './WhiteboardSemanticZoomModel';
import { useWhiteboardContextMenuController } from './WhiteboardContextMenuController';
import { WhiteboardSemanticLayoutOverlay } from './WhiteboardSemanticLayoutOverlay';
import { useWhiteboardSemanticSourceDropController } from './WhiteboardSemanticSourceDropController';
import { useWhiteboardUiPreferences } from './WhiteboardUiPreferences';
import type { WhiteboardSemanticLayoutGuide } from './WhiteboardSemanticLayoutModel';
import { buildWhiteboardSemanticPresentationModel, type WhiteboardSemanticPresentationModel } from './WhiteboardSemanticPresentationModel';
import { getWhiteboardAnnotationWorldAnchor, getWhiteboardGroupWorldAnchor, getWhiteboardItemWorldAnchor } from './WhiteboardWorldGeometryModel';
export interface WhiteboardWorkspaceProps {
  records: RecordViewItem[]; sourceRecords?: RecordViewItem[]; whiteboardStore: WhiteboardStore; boardId?: string;
  onOpenRecord?: OpenRecordHandler; onOpenRecordOrigin?: OpenRecordOriginHandler; onNotice?: (message: string) => void;
}
function elementRect(element: Element): { left: number; top: number; right: number; bottom: number } {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}
export function WhiteboardWorkspace({ records, sourceRecords = records, whiteboardStore, boardId = DEFAULT_WHITEBOARD_ID, onOpenRecord, onOpenRecordOrigin, onNotice }: WhiteboardWorkspaceProps) {
  const [board, setBoard] = useState<WhiteboardBoard | undefined>(undefined);
  const [storeStatus, setStoreStatus] = useState<WhiteboardStoreStatus>(() => whiteboardStore.getStatus());
  const [removingItemIds, setRemovingItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const [removingEdgeId, setRemovingEdgeId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ itemId: string; position: WhiteboardPosition } | null>(null);
  const [sourceDragPreview, setSourceDragPreview] = useState<{ records: RecordViewItem[]; point: WhiteboardClientPoint } | null>(null);
  const [removalDropActive, setRemovalDropActive] = useState(false);
  const [ensuringBoard, setEnsuringBoard] = useState(false);
  const uiPreferences = useWhiteboardUiPreferences();
  const { sourceCollapsed, gridVisible } = uiPreferences;
  const [semanticLayoutGuides, setSemanticLayoutGuides] = useState<WhiteboardSemanticLayoutGuide[]>([]);
  const sourceElementRef = useRef<HTMLElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const semanticPresentationRef = useRef<WhiteboardSemanticPresentationModel | null>(null);
  const viewportController = useWhiteboardViewportController(canvasViewportRef);
  const syncBoard = useCallback(() => {
    const nextStatus = whiteboardStore.getStatus();
    setStoreStatus(nextStatus);
    if (nextStatus.state !== 'ready') {
      setBoard(undefined);
      return;
    }
    try {
      setBoard(whiteboardStore.getBoard(boardId));
    } catch (error) {
      onNotice?.(`白板读取失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [boardId, onNotice, whiteboardStore]);
  useEffect(() => {
    const unsubscribe = whiteboardStore.subscribe(syncBoard);
    syncBoard();
    return unsubscribe;
  }, [syncBoard, whiteboardStore]);
  useEffect(() => {
    if (storeStatus.state !== 'ready' || board || ensuringBoard) return;
    setEnsuringBoard(true);
    void whiteboardStore.ensureBoard(boardId, DEFAULT_WHITEBOARD_TITLE)
      .catch((error) => onNotice?.(`创建白板失败：${error instanceof Error ? error.message : String(error)}`))
      .finally(() => setEnsuringBoard(false));
  }, [board, boardId, ensuringBoard, onNotice, storeStatus.state, whiteboardStore]);
  const recordsById = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]); const items = board?.items ?? [];
  const edges = board?.edges ?? []; const annotations = board?.annotations ?? [];
  const groups = board?.groups ?? [];
  const archivedItems = board?.archivedItems ?? [];
  const boardRecordIds = useMemo(() => new Set([...items, ...archivedItems].map((item) => item.recordId)), [archivedItems, items]);
  const find = useWhiteboardFindController(items, recordsById);
  const activeZIndex = useMemo(() => getNextWhiteboardZIndex(items), [items]);
  const storeReady = storeStatus.state === 'ready' && Boolean(board);
  const removeItemsByIds = useCallback(async (itemIds: readonly string[]): Promise<boolean> => {
    const ids = [...new Set(itemIds)]; if (!storeReady || removingItemIds.size > 0 || ids.length === 0) return false;
    setRemovingItemIds(new Set(ids));
    try {
      const removed = ids.length === 1 ? await whiteboardStore.removeItem(boardId, ids[0]) : await whiteboardStore.removeItems(boardId, ids);
      if (!removed) onNotice?.('白板卡片已不存在'); return removed;
    } catch (error) { onNotice?.(`移出白板失败：${error instanceof Error ? error.message : String(error)}`); return false; }
    finally { setRemovingItemIds(new Set()); }
  }, [boardId, onNotice, removingItemIds.size, storeReady, whiteboardStore]);
  const { handleSemanticItemDragPointerChange, handleSemanticItemDrop } = useWhiteboardSemanticSourceDropController({
    sourceCollapsed, sourceElementRef, onDropActiveChange: setRemovalDropActive, onDropItems: removeItemsByIds,
  });
  const history = useWhiteboardHistoryController(whiteboardStore, onNotice);
  const nested = useWhiteboardNestedCanvasController({ groups, items, annotations, rootCenter: getWhiteboardCanvasHomePoint(items, groups, annotations), resetViewOnWorldPoint: viewportController.resetViewOnWorldPoint });
  const workbench = useWhiteboardWorkbenchController({
    boardId, items, annotations, groups, activeGroupId: nested.activeGroupId, storeReady, whiteboardStore, viewportRef: canvasViewportRef,
    camera: viewportController.camera, zoom: viewportController.zoom, onNotice,
  });
  const groupTitleById = useMemo(() => new Map(groups.map((group) => [group.id, group.title])), [groups]);
  const activeFindItem = items.find((item) => item.id === find.activeItemId) ?? null;
  const activeFindGroupId = activeFindItem?.groupId ?? null;
  const findPathLabel = getWhiteboardItemPathLabel(activeFindItem, groups);
  const recordTransfer = useWhiteboardRecordTransferController({
    boardId, items, groups, boardRecordIds, storeReady, whiteboardStore, activeGroupId: nested.activeGroupId,
    viewportRef: canvasViewportRef, camera: viewportController.camera, zoom: viewportController.zoom, onNotice,
  });
  const selection = useWhiteboardSelectionController({
    boardId, items, groups, activeGroupId: nested.activeGroupId, visibleItems: workbench.visibleItems, visibleGroups: workbench.visibleGroups, storeReady, whiteboardStore, viewportRef: canvasViewportRef,
    camera: viewportController.camera, zoom: viewportController.zoom, onNotice, onSemanticMoveStart: () => setSemanticLayoutGuides([]),
    onSemanticItemDragPointerChange: handleSemanticItemDragPointerChange, onSemanticItemDrop: handleSemanticItemDrop,
    semanticPresentationRef,
  });
  const connection = useWhiteboardConnectionController({ boardId, items, storeReady, whiteboardStore, viewportRef: canvasViewportRef, camera: viewportController.camera, zoom: viewportController.zoom, onNotice });
  const annotation = useWhiteboardAnnotationController({ boardId, annotations: workbench.renderAnnotations, groups: workbench.renderGroups, activeGroupId: nested.activeGroupId, storeReady, whiteboardStore, onNotice });
  const archive = useWhiteboardArchiveController({ boardId, storeReady, whiteboardStore, onNotice });
  const selectionRenderItems = selection.applyPreview(workbench.renderItems);
  const visibleItemIds = useMemo(() => new Set(workbench.visibleItems.map((item) => item.id)), [workbench.visibleItems]);
  const renderVisibleItems = selectionRenderItems.filter((item) => visibleItemIds.has(item.id));
  const sourceDropActive = Boolean(!archive.open && !sourceCollapsed && sourceDragPreview && canvasViewportRef.current
    && isWhiteboardClientPointInsideRect(sourceDragPreview.point, elementRect(canvasViewportRef.current)));
  const sourceDropTargetGroupId = sourceDropActive && sourceDragPreview ? recordTransfer.resolveDropTargetGroupId(sourceDragPreview.point) : null; const sourceDropTargetTitle = sourceDropTargetGroupId ? groupTitleById.get(sourceDropTargetGroupId) ?? null : null;
  const currentLayoutItems = useMemo(() => items.filter((item) => (item.groupId ?? null) === nested.activeGroupId), [items, nested.activeGroupId]);
  const currentLayoutGroups = useMemo(() => groups.filter((group) => (group.parentGroupId ?? null) === nested.activeGroupId), [groups, nested.activeGroupId]);
  const semanticZoom = getWhiteboardSemanticZoomState(viewportController.zoom); const semanticStatus = getWhiteboardSemanticZoomStatus(semanticZoom, currentLayoutItems.length, currentLayoutGroups.length);
  const semanticPresentation = useMemo(() => buildWhiteboardSemanticPresentationModel({
    level: semanticZoom.level,
    zoom: semanticZoom.zoom,
    guides: semanticLayoutGuides,
    nodes: [
      ...currentLayoutGroups.map((group) => ({
        id: group.id, kind: 'group' as const, worldAnchor: getWhiteboardGroupWorldAnchor(group), label: group.title,
        emphasized: selection.selectedGroupIds.has(group.id) || activeFindGroupId === group.id || workbench.dropTargetGroupId === group.id || sourceDropTargetGroupId === group.id,
      })),
      ...currentLayoutItems.map((item) => {
        const record = recordsById.get(item.recordId) ?? null;
        return {
          id: item.id, kind: 'item' as const, worldAnchor: getWhiteboardItemWorldAnchor(item),
          label: record ? buildWhiteboardRecordPresentation(record).primaryText : '原记录不可用',
          emphasized: selection.selectedItemIds.has(item.id) || find.activeItemId === item.id || find.matchSet.has(item.id)
            || connection.preview?.sourceItemId === item.id || connection.preview?.targetItemId === item.id,
        };
      }),
      ...annotation.visibleAnnotations.map((entry) => ({
        id: entry.id, kind: 'annotation' as const, worldAnchor: getWhiteboardAnnotationWorldAnchor(entry), label: entry.text || (entry.kind === 'sticky' ? '便签' : '文字'),
      })),
    ],
  }), [
    activeFindGroupId, annotation.visibleAnnotations, connection.preview?.sourceItemId, connection.preview?.targetItemId,
    currentLayoutGroups, currentLayoutItems, find.activeItemId, find.matchSet, recordsById, selection.selectedGroupIds,
    selection.selectedItemIds, semanticLayoutGuides, semanticZoom.level, semanticZoom.zoom, sourceDropTargetGroupId, workbench.dropTargetGroupId,
  ]);
  semanticPresentationRef.current = semanticPresentation;
  const semanticPresentationItemPoints = useMemo(() => {
    if (semanticZoom.level === 'detail') return null;
    const delta = selection.semanticDragDelta;
    return new Map(currentLayoutItems.map((item) => {
      const placement = semanticPresentation.items.get(item.id);
      const point = placement?.worldPoint ?? getWhiteboardItemWorldAnchor(item);
      const coveredBySelectedGroup = Boolean(item.groupId && selection.selectedGroupIds.size > 0
        && getWhiteboardGroupPathIds(groups, item.groupId).some((id) => selection.selectedGroupIds.has(id)));
      const movesWithSelection = Boolean(delta && (selection.selectedItemIds.has(item.id) || coveredBySelectedGroup));
      return [item.id, movesWithSelection ? { x: point.x + delta!.dx, y: point.y + delta!.dy } : point] as const;
    }));
  }, [currentLayoutItems, groups, selection.selectedGroupIds, selection.selectedItemIds, selection.semanticDragDelta, semanticPresentation, semanticZoom.level]);
  const currentCanvasBounds = useMemo(() => getWhiteboardCanvasContentBounds(workbench.visibleItems, workbench.visibleGroups, annotation.visibleAnnotations), [annotation.visibleAnnotations, workbench.visibleGroups, workbench.visibleItems]);
  const currentCanvasHome = useMemo(() => getWhiteboardCanvasHomePoint(workbench.visibleItems, workbench.visibleGroups, annotation.visibleAnnotations, nested.activeCanvasCenter), [annotation.visibleAnnotations, nested.activeCanvasCenter, workbench.visibleGroups, workbench.visibleItems]);
  const activeCanvasTitle = nested.activeGroupId ? groupTitleById.get(nested.activeGroupId) ?? '当前工作台' : null;
  useEffect(() => setSemanticLayoutGuides([]), [nested.activeGroupId]);
  const centerCurrentCanvas = useCallback(() => viewportController.resetViewOnWorldPoint(currentCanvasHome), [currentCanvasHome, viewportController.resetViewOnWorldPoint]);
  const fitCurrentCanvas = useCallback(() => currentCanvasBounds ? viewportController.fitWorldBounds(currentCanvasBounds, currentCanvasHome) : viewportController.resetViewOnWorldPoint(currentCanvasHome), [currentCanvasBounds, currentCanvasHome, viewportController.fitWorldBounds, viewportController.resetViewOnWorldPoint]);
  const contextMenu = useWhiteboardContextMenuController({ boardId, visibleItems: workbench.visibleItems, layoutItems: currentLayoutItems, layoutGroups: currentLayoutGroups, allItems: items, allGroups: groups, edges,
    selectedItemIds: selection.selectedItemIds, selectedGroupIds: selection.selectedGroupIds, recordsById, storeReady, whiteboardStore, viewportRef: canvasViewportRef,
    camera: viewportController.camera, zoom: viewportController.zoom, selectOnly: selection.selectOnly, selectOnlyGroup: selection.selectOnlyGroup, createAnnotation: annotation.create, createWorkbenchAt: workbench.createGroupAt,
    wrapSelection: workbench.wrapItemsInGroup, clearSelection: selection.clear, centerBoard: centerCurrentCanvas,
    archiveItems: archive.archiveItems, removeItems: removeItemsByIds, removeItemFromWorkbench: workbench.removeItemFromGroup,
    onSemanticLayoutGuides: setSemanticLayoutGuides, onNotice });
  useEffect(() => {
    if (activeFindItem) { nested.revealItem(activeFindItem); viewportController.centerOnWorldPoint(workbench.getFindTargetPoint(activeFindItem)); }
  }, [activeFindItem, nested.revealItem, viewportController.centerOnWorldPoint, workbench.getFindTargetPoint]);
  const restoreMessage = storeStatus.state === 'error'
    ? `白板恢复失败，已阻止写入：${storeStatus.message}`
    : storeStatus.state === 'disposed'
      ? '白板服务已停止'
      : '正在恢复白板…';
  const handleMove = useCallback(async (itemId: string, position: WhiteboardPosition) => {
    setSemanticLayoutGuides([]);
    try {
      const targetGroupId = selection.isMultiDrag(itemId) ? workbench.resolveSelectionTarget(position) ?? undefined : undefined;
      const selectionMoved = await selection.moveSelected(itemId, position, targetGroupId);
      const moved = selectionMoved === null ? await workbench.moveItem(itemId, position) : selectionMoved;
      if (!moved) onNotice?.('白板卡片已不存在，位置未保存');
    } catch (error) {
      onNotice?.(`保存白板位置失败：${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }, [onNotice, selection.isMultiDrag, selection.moveSelected, workbench.moveItem, workbench.resolveSelectionTarget]);
  const handlePreviewChange = useCallback((itemId: string, position: WhiteboardPosition | null) => {
    const multi = selection.isMultiDrag(itemId); selection.previewItemDrag(itemId, position);
    setDragPreview(!multi && position ? { itemId, position } : null);
    if (multi) workbench.previewSelectionDrop(position); else workbench.previewItemDrop(itemId, position);
  }, [selection.isMultiDrag, selection.previewItemDrag, workbench.previewItemDrop, workbench.previewSelectionDrop]);
  const handleCanvasPointerDown = useCallback((event: PointerEvent) => {
    if (selection.beginMarquee(event)) return;
    if (event.pointerType !== 'mouse' || event.button === 0) selection.clear();
    viewportController.beginPan(event);
  }, [selection.beginMarquee, selection.clear, viewportController.beginPan]);
  const handleRestore = useCallback(async (itemId: string) => { const restored = await archive.restoreItem(itemId); if (!restored) return;
    archive.setOpen(false); selection.clear(); nested.revealItem(restored); viewportController.resetViewOnWorldPoint({ x: restored.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: restored.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 });
  }, [archive.restoreItem, archive.setOpen, nested.revealItem, selection.clear, viewportController.resetViewOnWorldPoint]);
  const handleBoardCardDragPointer = useCallback((_itemId: string, point: WhiteboardClientPoint | null) => {
    if (sourceCollapsed) { setRemovalDropActive(false); return; }
    const sourceElement = sourceElementRef.current;
    setRemovalDropActive(Boolean(point && sourceElement && isWhiteboardClientPointInsideRect(point, elementRect(sourceElement))));
  }, [sourceCollapsed]);
  const handleDropBoardCardToSource = useCallback(async (itemId: string, point: WhiteboardClientPoint): Promise<boolean> => {
    if (sourceCollapsed) return false;
    const sourceElement = sourceElementRef.current; const consumed = Boolean(sourceElement && isWhiteboardClientPointInsideRect(point, elementRect(sourceElement)));
    setRemovalDropActive(false); if (!consumed) return false;
    await removeItemsByIds(selection.getDragItemIds(itemId)); return true;
  }, [removeItemsByIds, selection.getDragItemIds, sourceCollapsed]);
  const handleRemoveEdge = useCallback(async (edgeId: string) => {
    if (!storeReady || removingEdgeId) return;
    setRemovingEdgeId(edgeId);
    try {
      const removed = await whiteboardStore.removeEdge(boardId, edgeId);
      if (!removed) onNotice?.('白板连线已不存在');
    } catch (error) {
      onNotice?.(`删除白板连线失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRemovingEdgeId(null);
    }
  }, [boardId, onNotice, removingEdgeId, storeReady, whiteboardStore]);
  const sourceDragLabel = sourceDragPreview ? sourceDragPreview.records.length > 1 ? `${sourceDragPreview.records.length} 条记录` : buildWhiteboardRecordPresentation(sourceDragPreview.records[0]).primaryText : ''; return (
    <div class="think-whiteboard-workspace" data-whiteboard-selection-count={selection.selectionCount} data-whiteboard-active-group-id={nested.activeGroupId ?? ''} onKeyDown={((event: KeyboardEvent) => { history.handleKeyDown(event); find.handleWorkspaceKeyDown(event); selection.handleKeyDown(event); nested.handleKeyDown(event); }) as never}>
      <div class={`think-whiteboard-body${sourceCollapsed ? ' is-source-collapsed' : ''}`}>
        <WhiteboardRecordSourcePanel
          records={sourceRecords}
          boardRecordIds={boardRecordIds}
          onAdd={recordTransfer.addRecord}
          onDropRecords={recordTransfer.dropRecords}
          onDragRecordPreview={setSourceDragPreview}
          onSourceElementChange={(element) => { sourceElementRef.current = element; }}
          addingRecordIds={recordTransfer.addingRecordIds}
          removalDropActive={removalDropActive}
        />
        <main
          class={`think-whiteboard-board${sourceDropActive ? ' is-source-drop-target' : ''}`}
          aria-label="白板"
          data-whiteboard-source-drop-active={sourceDropActive ? 'true' : 'false'}
        >
          <WhiteboardBoardTools
            sourceCollapsed={sourceCollapsed}
            onToggleSource={uiPreferences.toggleSource}
            gridVisible={gridVisible}
            onToggleGrid={uiPreferences.toggleGrid}
            find={find}
            findPathLabel={findPathLabel}
            zoom={viewportController.zoom}
            onZoomOut={viewportController.zoomOut}
            onResetZoom={viewportController.resetZoom}
            onZoomIn={viewportController.zoomIn}
            onCenterBoard={centerCurrentCanvas}
            onFitBoard={fitCurrentCanvas}
            archiveCount={archivedItems.length}
            archiveOpen={archive.open}
            onToggleArchive={() => archive.setOpen(!archive.open)}
            onCreateWorkbench={() => void workbench.createGroup()}
            selectionCount={selection.selectionCount}
            onClearSelection={selection.clear}
            canUndo={history.canUndo} canRedo={history.canRedo}
            onUndo={() => { setSemanticLayoutGuides([]); void history.undo(); }} onRedo={() => { setSemanticLayoutGuides([]); void history.redo(); }}
            activeCanvasId={nested.activeGroupId} activeCanvasTitle={activeCanvasTitle} onExitCanvas={() => { selection.clear(); nested.enterParent(); }}
            onExitToRoot={() => { selection.clear(); nested.enterRoot(); }}
          />
          <WhiteboardCanvasBreadcrumbs path={nested.path} canGoBack={nested.canGoBack} canGoForward={nested.canGoForward}
            onEnter={(groupId) => { selection.clear(); nested.enterGroup(groupId); }} onParent={() => { selection.clear(); nested.enterParent(); }}
            onBack={() => { selection.clear(); nested.goBack(); }} onForward={() => { selection.clear(); nested.goForward(); }} onFitContent={fitCurrentCanvas} />
          {archive.open && storeReady && <WhiteboardArchiveCanvas items={archivedItems} recordsById={recordsById} restoringItemIds={archive.restoringItemIds} onRestore={handleRestore} onMoveItems={archive.moveArchivedItems} onClose={() => archive.setOpen(false)} gridVisible={gridVisible} />}
          {!storeReady ? (
            <div class="think-whiteboard-empty">{restoreMessage}</div>
          ) : (
            <div
              class="think-whiteboard-canvas-viewport"
              ref={canvasViewportRef}
              style={`${viewportController.gridStyle};${getWhiteboardSemanticZoomStyle(semanticZoom)}`}
              onWheel={viewportController.handleWheel as never}
              onPointerDown={handleCanvasPointerDown as never}
              onContextMenu={contextMenu.handleContextMenu as never} onDblClick={contextMenu.handleDoubleClick as never}
              data-whiteboard-zoom={viewportController.zoom} data-whiteboard-lod={semanticZoom.level} data-whiteboard-camera-x={viewportController.camera.x}
              data-whiteboard-camera-y={viewportController.camera.y} data-whiteboard-panning={viewportController.panning ? 'true' : 'false'} data-whiteboard-grid={gridVisible ? 'on' : 'off'}
            >
              {selection.marqueeRect && <div class="think-whiteboard-selection-marquee" style={`left:${selection.marqueeRect.left}px;top:${selection.marqueeRect.top}px;width:${selection.marqueeRect.width}px;height:${selection.marqueeRect.height}px;`} aria-hidden="true" />}
              <div class="think-whiteboard-pan-hint" aria-hidden="true">拖动空白移动 · 按住控制键或⌘键拖动框选 · 按住控制键或⌘键滚轮缩放</div>
              {semanticStatus && <div class="think-whiteboard-semantic-status" aria-live="polite">{semanticStatus}</div>}
              {workbench.visibleItems.length === 0 && workbench.visibleGroups.length === 0 && annotation.visibleAnnotations.length === 0 && (
                <div class="think-whiteboard-empty think-whiteboard-empty--canvas">从左侧拖一条记录到这里，或点击“加入”。</div>
              )}
              <div
                class="think-whiteboard-canvas think-whiteboard-world"
                style={`transform:${viewportController.worldTransform};`}
              >
                <WhiteboardSemanticLayoutOverlay guides={semanticLayoutGuides} zoom={viewportController.zoom} presentation={semanticPresentation} onSelectItems={selection.selectItems} onMoveGuide={(guideId, position) => setSemanticLayoutGuides((current) => current.map((guide) => guide.id === guideId ? { ...guide, ...position } : guide))} />
                {workbench.visibleGroups.map((group) => (
                  <WhiteboardWorkbenchGroup
                    key={group.id}
                    group={group}
                    items={selectionRenderItems}
                    annotations={workbench.renderAnnotations}
                    groups={workbench.renderGroups}
                    zoom={viewportController.zoom}
                    dropTarget={workbench.dropTargetGroupId === group.id || sourceDropTargetGroupId === group.id}
                    findActive={activeFindGroupId === group.id}
                    onPreviewChange={workbench.setGroupPreview}
                    onMove={workbench.moveGroup}
                    onRename={workbench.renameGroup}
                    onToggleCollapsed={workbench.toggleGroupCollapsed}
                    onDissolve={workbench.dissolveGroup}
                    onEnter={(groupId) => { selection.clear(); nested.enterGroup(groupId); }}
                  />
                ))}
                {annotation.visibleAnnotations.map((entry) => <WhiteboardAnnotation key={entry.id} annotation={entry} zoom={viewportController.zoom} autoEdit={annotation.autoEditAnnotationId === entry.id} onAutoEditConsumed={annotation.consumeAutoEdit} onUpdate={annotation.update} onMove={annotation.move} onRemove={annotation.remove} />)}
                <WhiteboardEdgeLayer
                  boardId={boardId}
                  items={renderVisibleItems}
                  edges={edges}
                  dragPreview={selection.dragMoves.length > 0 ? null : dragPreview}
                  onRemoveEdge={handleRemoveEdge}
                  onUpdateEdgeLabel={(edgeId, label) => void whiteboardStore.updateEdgeLabel(boardId, edgeId, label).catch((error) => onNotice?.(`保存连线标注失败：${error instanceof Error ? error.message : String(error)}`))}
                  removingEdgeId={removingEdgeId}
                  connectionPreview={connection.preview}
                  presentationItemPoints={semanticPresentationItemPoints}
                />
                {semanticZoom.level === 'detail' && renderVisibleItems.map((item) => (
                  <WhiteboardCard
                    key={item.id}
                    whiteboardItem={item}
                    record={recordsById.get(item.recordId) ?? null}
                    activeZIndex={activeZIndex}
                    zoom={viewportController.zoom}
                    onOpenRecord={onOpenRecord}
                    onOpenRecordOrigin={onOpenRecordOrigin}
                    onMove={handleMove}
                    onPreviewChange={handlePreviewChange}
                    onDragPointerChange={handleBoardCardDragPointer}
                    onDropToSource={handleDropBoardCardToSource}
                    onBeginConnection={connection.beginConnection}
                    connectionActive={connection.preview?.sourceItemId === item.id}
                    connectionTarget={connection.preview?.targetItemId === item.id}
                    workbenchTitle={item.groupId ? groupTitleById.get(item.groupId) ?? null : null}
                    selected={selection.selectedItemIds.has(item.id)}
                    onToggleSelection={selection.toggleItem}
                    findState={!find.active ? 'idle' : find.activeItemId === item.id ? 'active' : find.matchSet.has(item.id) ? 'match' : 'dimmed'}
                  />
                ))}
                <WhiteboardSemanticOverviewLayer semantic={semanticZoom} presentation={semanticPresentation} items={currentLayoutItems} groups={currentLayoutGroups} annotations={annotation.visibleAnnotations} recordsById={recordsById} selectedItemIds={selection.selectedItemIds} selectedGroupIds={selection.selectedGroupIds} semanticDragDelta={selection.semanticDragDelta} activeFindItemId={find.activeItemId} findMatchSet={find.matchSet} activeFindGroupId={activeFindGroupId} dropTargetGroupId={workbench.dropTargetGroupId ?? sourceDropTargetGroupId} onNodePointerDown={selection.beginSemanticNodePointer} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} onBeginConnection={connection.beginConnection} onContextMenu={contextMenu.handleContextMenu} connectionSourceItemId={connection.preview?.sourceItemId ?? null} connectionTargetItemId={connection.preview?.targetItemId ?? null} shouldSuppressFocusClick={selection.consumeOverviewClickSuppression} onFocusItem={(item) => { selection.clear(); viewportController.resetViewOnWorldPoint({ x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 }); }} onFocusGroup={(group) => { selection.clear(); viewportController.resetViewOnWorldPoint({ x: group.x + (group.collapsed ? 180 : 360), y: group.y + 22 }); }} onFocusAnnotation={(entry) => viewportController.resetViewOnWorldPoint({ x: entry.x + 130, y: entry.y + (entry.kind === 'sticky' ? 66 : 24) })} onMoveAnnotation={annotation.move} />
              </div>
            </div>
          )}
          {sourceDropActive && <div class="think-whiteboard-board__drop-hint" aria-hidden="true">{sourceDropTargetTitle ? `松开加入工作台「${sourceDropTargetTitle}」` : `松开加入${sourceDragPreview && sourceDragPreview.records.length > 1 ? ` ${sourceDragPreview.records.length} 条记录` : '白板'}`}</div>}
          <WhiteboardContextMenu state={contextMenu.state} selectionCount={selection.selectionCount} selectedItemCount={selection.selectedItemIds.size} selectedGroupCount={selection.selectedGroupIds.size}
            currentItemCount={currentLayoutItems.length} currentGroupCount={currentLayoutGroups.length} onClose={contextMenu.close} onCreateText={() => contextMenu.createAnnotation('text')} onCreateSticky={() => contextMenu.createAnnotation('sticky')}
            onCreateWorkbench={contextMenu.createWorkbench} onCenter={contextMenu.centerBoard} onWrapSelection={contextMenu.wrapSelection} onArrange={contextMenu.arrange} onArrangeCurrentLayer={contextMenu.arrangeCurrentLayer} onSemanticArrange={contextMenu.semanticArrange}
            onArchiveSelection={contextMenu.archiveSelection} onRemoveSelection={contextMenu.removeSelection} onRemoveSelectionFromWorkbench={contextMenu.removeSelectionFromWorkbench}
            canRemoveSelectionFromWorkbench={[...selection.selectedItemIds].some((id) => Boolean(items.find((item) => item.id === id)?.groupId))} />
        </main>
      </div>
      {sourceDragPreview && (
        <div
          class="think-whiteboard-source-drag-ghost"
          style={`left:${sourceDragPreview.point.clientX + 12}px;top:${sourceDragPreview.point.clientY + 12}px;`}
          aria-hidden="true"
        >{sourceDragLabel}</div>
      )}
    </div>
  );
}
