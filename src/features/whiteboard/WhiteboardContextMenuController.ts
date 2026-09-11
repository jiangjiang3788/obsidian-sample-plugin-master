import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardEdge, WhiteboardGroup, WhiteboardItem, WhiteboardStore } from '@core/whiteboard/public';
import type { WhiteboardCamera, WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { screenToWhiteboardWorld } from './WhiteboardCameraModel';
import { arrangeWhiteboardItems, type WhiteboardArrangeMode } from './WhiteboardArrangeModel';
import type { WhiteboardContextMenuState } from './WhiteboardContextMenu';
import { arrangeWhiteboardNodes, type WhiteboardNodeArrangeMode } from './WhiteboardNodeArrangeModel';
import { arrangeWhiteboardItemsBySpec, type WhiteboardSemanticLayoutGuide } from './WhiteboardSemanticLayoutModel';

interface Input {
  boardId: string; visibleItems: WhiteboardItem[]; layoutItems: WhiteboardItem[]; layoutGroups: WhiteboardGroup[]; allItems: WhiteboardItem[]; allGroups: WhiteboardGroup[]; edges: WhiteboardEdge[];
  selectedItemIds: ReadonlySet<string>; selectedGroupIds: ReadonlySet<string>; recordsById: ReadonlyMap<string, RecordViewItem>;
  storeReady: boolean; whiteboardStore: WhiteboardStore; viewportRef: { current: HTMLDivElement | null }; camera: WhiteboardCamera; zoom: number;
  selectOnly: (itemId: string) => void; selectOnlyGroup: (groupId: string) => void; createAnnotation: (kind: 'text' | 'sticky', point: WhiteboardWorldPoint) => void | Promise<unknown>;
  createWorkbenchAt: (point: WhiteboardWorldPoint) => void | Promise<unknown>; wrapSelection: (itemIds: readonly string[]) => void | Promise<unknown>; clearSelection: () => void; centerBoard: () => void;
  archiveItems?: (itemIds: readonly string[]) => void | Promise<boolean>; removeItems?: (itemIds: readonly string[]) => void | Promise<boolean>; removeItemFromWorkbench?: (itemId: string) => void | Promise<boolean>;
  onSemanticLayoutGuides?: (guides: WhiteboardSemanticLayoutGuide[]) => void; onNotice?: (message: string) => void;
}

export function useWhiteboardContextMenuController(input: Input) {
  const [state, setState] = useState<WhiteboardContextMenuState | null>(null);
  const close = useCallback(() => setState(null), []);
  useEffect(() => { if (!state) return; const closeMenu = (event: PointerEvent) => { if (!(event.target as HTMLElement | null)?.closest?.('.think-whiteboard-context-menu')) close(); }; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); }; window.addEventListener('pointerdown', closeMenu, true); window.addEventListener('keydown', escape, true); return () => { window.removeEventListener('pointerdown', closeMenu, true); window.removeEventListener('keydown', escape, true); }; }, [close, state]);
  const worldAt = useCallback((clientX: number, clientY: number) => { const rect = input.viewportRef.current?.getBoundingClientRect(); return rect ? screenToWhiteboardWorld({ clientX, clientY }, rect, input.camera, input.zoom) : null; }, [input.camera, input.viewportRef, input.zoom]);
  const handleContextMenu = useCallback((event: MouseEvent) => { const world = worldAt(event.clientX, event.clientY); if (!world) return; event.preventDefault(); event.stopPropagation();
    const element = event.target as HTMLElement | null; const itemElement = element?.closest?.('[data-whiteboard-item-id],[data-whiteboard-overview-item-id]'); const groupElement = element?.closest?.('[data-whiteboard-overview-group-id]');
    const itemId = itemElement?.getAttribute('data-whiteboard-item-id') ?? itemElement?.getAttribute('data-whiteboard-overview-item-id') ?? null; const groupId = groupElement?.getAttribute('data-whiteboard-overview-group-id') ?? null;
    if (itemId && !input.selectedItemIds.has(itemId)) input.selectOnly(itemId); else if (groupId && !input.selectedGroupIds.has(groupId)) input.selectOnlyGroup(groupId);
    setState({ clientX: event.clientX, clientY: event.clientY, worldX: world.x, worldY: world.y, itemId, groupId });
  }, [input.selectOnly, input.selectOnlyGroup, input.selectedGroupIds, input.selectedItemIds, worldAt]);
  const handleDoubleClick = useCallback((event: MouseEvent) => { const element = event.target as HTMLElement | null;
    if (element?.closest?.('[data-whiteboard-item-id],[data-whiteboard-group-id],[data-whiteboard-annotation-id],[data-whiteboard-edge-control-id],button,input,textarea')) return;
    const world = worldAt(event.clientX, event.clientY); if (!world) return; event.preventDefault(); event.stopPropagation(); void input.createAnnotation('text', world);
  }, [input.createAnnotation, worldAt]);
  const point = useCallback((): WhiteboardWorldPoint | null => state ? { x: state.worldX, y: state.worldY } : null, [state]);
  const createAnnotation = useCallback((kind: 'text' | 'sticky') => { const world = point(); if (world) void input.createAnnotation(kind, world); close(); }, [close, input.createAnnotation, point]);
  const createWorkbench = useCallback(() => { const world = point(); if (world) void input.createWorkbenchAt(world); close(); }, [close, input.createWorkbenchAt, point]);
  const centerBoard = useCallback(() => { input.centerBoard(); close(); }, [close, input.centerBoard]);
  const wrapSelection = useCallback(async () => { const ids = [...input.selectedItemIds]; close(); if (ids.length < 2 || input.selectedGroupIds.size > 0) return; const group = await input.wrapSelection(ids); if (group) input.clearSelection(); }, [close, input.clearSelection, input.selectedGroupIds.size, input.selectedItemIds, input.wrapSelection]);
  const targetItemIds = useCallback((): string[] => {
    if (state?.itemId && !input.selectedItemIds.has(state.itemId)) return [state.itemId];
    return [...input.selectedItemIds];
  }, [input.selectedItemIds, state?.itemId]);
  const archiveSelection = useCallback(async () => { const ids = targetItemIds(); close(); if (!input.archiveItems || ids.length === 0 || input.selectedGroupIds.size > 0) return; const changed = await input.archiveItems(ids); if (changed) input.clearSelection(); }, [close, input.archiveItems, input.clearSelection, input.selectedGroupIds.size, targetItemIds]);
  const removeSelection = useCallback(async () => { const ids = targetItemIds(); close(); if (!input.removeItems || ids.length === 0 || input.selectedGroupIds.size > 0) return; const changed = await input.removeItems(ids); if (changed) input.clearSelection(); }, [close, input.clearSelection, input.removeItems, input.selectedGroupIds.size, targetItemIds]);
  const removeSelectionFromWorkbench = useCallback(async () => { const ids = targetItemIds(); close(); if (!input.removeItemFromWorkbench || input.selectedGroupIds.size > 0) return; for (const id of ids) await input.removeItemFromWorkbench(id); }, [close, input.removeItemFromWorkbench, input.selectedGroupIds.size, targetItemIds]);
  const moveNodeArrangement = useCallback(async (targetItems: readonly WhiteboardItem[], targetGroups: readonly WhiteboardGroup[], mode: WhiteboardNodeArrangeMode) => {
    const result = arrangeWhiteboardNodes({ targetItems, targetGroups, allItems: input.allItems, allGroups: input.allGroups, mode }); if (result.itemMoves.length + result.groupMoves.length === 0) return;
    input.onSemanticLayoutGuides?.([]); try { await input.whiteboardStore.moveNodes(input.boardId, result.itemMoves, result.groupMoves); } catch (error) { input.onNotice?.(`整理概览节点失败：${error instanceof Error ? error.message : String(error)}`); }
  }, [input.allGroups, input.allItems, input.boardId, input.onNotice, input.onSemanticLayoutGuides, input.whiteboardStore]);
  const arrange = useCallback(async (mode: WhiteboardArrangeMode) => { if (!input.storeReady) return; close();
    if (input.selectedGroupIds.size > 0) { if (mode === 'graph') return; const selectedItems = input.layoutItems.filter((item) => input.selectedItemIds.has(item.id)); const selectedGroups = input.layoutGroups.filter((group) => input.selectedGroupIds.has(group.id)); await moveNodeArrangement(selectedItems, selectedGroups, mode); return; }
    const selected = input.visibleItems.filter((item) => input.selectedItemIds.has(item.id)); const moves = arrangeWhiteboardItems(selected, mode, input.edges); if (moves.length === 0) return; input.onSemanticLayoutGuides?.([]);
    try { await input.whiteboardStore.moveItems(input.boardId, moves); } catch (error) { input.onNotice?.(`整理节点失败：${error instanceof Error ? error.message : String(error)}`); }
  }, [close, input.boardId, input.edges, input.layoutGroups, input.layoutItems, input.onNotice, input.onSemanticLayoutGuides, input.selectedGroupIds, input.selectedItemIds, input.storeReady, input.visibleItems, input.whiteboardStore, moveNodeArrangement]);
  const arrangeCurrentLayer = useCallback(async () => { if (!input.storeReady) return; close(); await moveNodeArrangement(input.layoutItems, input.layoutGroups, 'grid'); }, [close, input.layoutGroups, input.layoutItems, input.storeReady, moveNodeArrangement]);
  const semanticArrange = useCallback(async (scope: 'selection' | 'canvas') => { if (!input.storeReady) return; const targets = scope === 'selection' ? input.visibleItems.filter((item) => input.selectedItemIds.has(item.id)) : input.layoutItems; close(); if (targets.length < 2 || (scope === 'selection' && input.selectedGroupIds.size > 0)) return;
    const result = arrangeWhiteboardItemsBySpec(targets, input.recordsById); if (result.moves.length === 0) return;
    try { await input.whiteboardStore.moveItems(input.boardId, result.moves); input.onSemanticLayoutGuides?.(result.guides); } catch (error) { input.onNotice?.(`目标 × 类型 × 时间整理失败：${error instanceof Error ? error.message : String(error)}`); }
  }, [close, input.boardId, input.layoutItems, input.onNotice, input.onSemanticLayoutGuides, input.recordsById, input.selectedGroupIds.size, input.selectedItemIds, input.storeReady, input.visibleItems, input.whiteboardStore]);
  return { state, close, handleContextMenu, handleDoubleClick, createAnnotation, createWorkbench, wrapSelection, centerBoard, arrange, arrangeCurrentLayer, semanticArrange, archiveSelection, removeSelection, removeSelectionFromWorkbench };
}
