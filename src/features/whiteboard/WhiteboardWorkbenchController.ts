import { useCallback, useMemo, useState } from 'preact/hooks';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardGroupPosition, WhiteboardItem, WhiteboardPosition, WhiteboardStore } from '@core/whiteboard/public';
import { canNestWhiteboardGroup } from '@core/whiteboard/public';
import type { WhiteboardCamera, WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import {
  WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX, WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX, WHITEBOARD_WORKBENCH_MIN_WIDTH_PX, WHITEBOARD_WORKBENCH_PADDING_PX,
  getNextWhiteboardWorkbenchTitle,
  getWhiteboardWorkbenchCenter,
  getWhiteboardWorkbenchCreatePosition,
  getWhiteboardWorkbenchDropTargetId,
  getWhiteboardWorkbenchGroupsForContainer,
  getWhiteboardWorkbenchGroupDropTargetId,
  getWhiteboardWorkbenchHitTargetId,
  getWhiteboardWorkbenchItemsForContainer,
  translateWhiteboardWorkbenchGroups,
  translateWhiteboardWorkbenchMembers,
} from './WhiteboardWorkbenchModel';

interface WhiteboardWorkbenchControllerInput {
  boardId: string; items: WhiteboardItem[]; annotations: WhiteboardAnnotation[]; groups: WhiteboardGroup[]; activeGroupId: string | null;
  storeReady: boolean; whiteboardStore: WhiteboardStore; viewportRef: { current: HTMLDivElement | null };
  camera: WhiteboardCamera; zoom: number; onNotice?: (message: string) => void;
}

export function useWhiteboardWorkbenchController({
  boardId, items, annotations, groups, activeGroupId, storeReady, whiteboardStore, viewportRef, camera, zoom, onNotice,
}: WhiteboardWorkbenchControllerInput) {
  const [groupPreview, setGroupPreviewState] = useState<{ groupId: string; position: WhiteboardGroupPosition } | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const previewGroup = groupPreview ? groups.find((group) => group.id === groupPreview.groupId) : undefined;
  const previewDelta = previewGroup && groupPreview ? { dx: groupPreview.position.x - previewGroup.x, dy: groupPreview.position.y - previewGroup.y } : null;
  const renderGroups = useMemo(() => previewGroup && previewDelta
    ? translateWhiteboardWorkbenchGroups(groups, previewGroup.id, previewDelta.dx, previewDelta.dy)
    : groups.map((group) => ({ ...group })), [groups, previewDelta?.dx, previewDelta?.dy, previewGroup?.id]);
  const renderItems = useMemo(() => previewGroup && previewDelta
    ? translateWhiteboardWorkbenchMembers(items, previewGroup.id, previewDelta.dx, previewDelta.dy, groups)
    : items.map((item) => ({ ...item })), [groups, items, previewDelta?.dx, previewDelta?.dy, previewGroup?.id]);
  const renderAnnotations = useMemo(() => previewGroup && previewDelta
    ? translateWhiteboardWorkbenchMembers(annotations, previewGroup.id, previewDelta.dx, previewDelta.dy, groups)
    : annotations.map((entry) => ({ ...entry })), [annotations, groups, previewDelta?.dx, previewDelta?.dy, previewGroup?.id]);
  const visibleGroups = useMemo(() => getWhiteboardWorkbenchGroupsForContainer(renderGroups, activeGroupId), [activeGroupId, renderGroups]);
  const visibleItems = useMemo(() => getWhiteboardWorkbenchItemsForContainer(renderItems, renderGroups, activeGroupId), [activeGroupId, renderGroups, renderItems]);

  const resolveItemTarget = useCallback((itemId: string, position: WhiteboardPosition): string | null => {
    const item = items.find((candidate) => candidate.id === itemId);
    return getWhiteboardWorkbenchDropTargetId(groups, items, position, item?.groupId ?? activeGroupId, activeGroupId);
  }, [activeGroupId, groups, items]);
  const resolveSelectionTarget = useCallback((position: WhiteboardPosition): string | null => getWhiteboardWorkbenchHitTargetId(groups, items, position, activeGroupId) ?? activeGroupId, [activeGroupId, groups, items]);
  const previewItemDrop = useCallback((itemId: string, position: WhiteboardPosition | null) => setDropTargetGroupId(position ? resolveItemTarget(itemId, position) : null), [resolveItemTarget]);
  const previewSelectionDrop = useCallback((position: WhiteboardPosition | null) => setDropTargetGroupId(position ? resolveSelectionTarget(position) : null), [resolveSelectionTarget]);

  const moveItem = useCallback(async (itemId: string, position: WhiteboardPosition): Promise<boolean> => {
    if (!storeReady) throw new Error('白板数据尚未完成启动恢复');
    const item = items.find((candidate) => candidate.id === itemId); if (!item) return false;
    const targetGroupId = resolveItemTarget(itemId, position); setDropTargetGroupId(null);
    return targetGroupId === (item.groupId ?? null) ? whiteboardStore.moveItem(boardId, itemId, position) : whiteboardStore.moveItem(boardId, itemId, position, targetGroupId);
  }, [boardId, items, resolveItemTarget, storeReady, whiteboardStore]);
  const removeItemFromGroup = useCallback(async (itemId: string): Promise<boolean> => {
    const item = items.find((candidate) => candidate.id === itemId); if (!storeReady || !item?.groupId) return false;
    const parent = groups.find((group) => group.id === item.groupId)?.parentGroupId ?? null;
    return whiteboardStore.moveItem(boardId, itemId, { x: item.x, y: item.y, zIndex: item.zIndex }, parent);
  }, [boardId, groups, items, storeReady, whiteboardStore]);

  const wrapItemsInGroup = useCallback(async (itemIds: readonly string[]) => { if (!storeReady) return null; const ids = new Set(itemIds); const members = items.filter((item) => ids.has(item.id)); if (members.length === 0) return null;
    const position = { x: Math.min(...members.map((item) => item.x)) - WHITEBOARD_WORKBENCH_PADDING_PX, y: Math.min(...members.map((item) => item.y)) - WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX - WHITEBOARD_WORKBENCH_PADDING_PX };
    try { return await whiteboardStore.createGroupFromItems(boardId, getNextWhiteboardWorkbenchTitle(groups), members.map((item) => item.id), position, activeGroupId); }
    catch (error) { onNotice?.(`从所选卡片创建工作台失败：${error instanceof Error ? error.message : String(error)}`); return null; }
  }, [activeGroupId, boardId, groups, items, onNotice, storeReady, whiteboardStore]);
  const createGroupAt = useCallback(async (point: WhiteboardWorldPoint) => { if (!storeReady) return;
    try { await whiteboardStore.createGroup(boardId, getNextWhiteboardWorkbenchTitle(groups), { x: point.x - WHITEBOARD_WORKBENCH_MIN_WIDTH_PX / 2, y: point.y - WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX / 2 }, activeGroupId); }
    catch (error) { onNotice?.(`创建工作台失败：${error instanceof Error ? error.message : String(error)}`); }
  }, [activeGroupId, boardId, groups, onNotice, storeReady, whiteboardStore]);
  const createGroup = useCallback(async () => {
    const viewport = viewportRef.current; if (!storeReady || !viewport) return;
    const position = getWhiteboardWorkbenchCreatePosition({ camera, zoom, viewportWidth: viewport.clientWidth, viewportHeight: viewport.clientHeight });
    try { await whiteboardStore.createGroup(boardId, getNextWhiteboardWorkbenchTitle(groups), position, activeGroupId); }
    catch (error) { onNotice?.(`创建工作台失败：${error instanceof Error ? error.message : String(error)}`); }
  }, [activeGroupId, boardId, camera, groups, onNotice, storeReady, viewportRef, whiteboardStore, zoom]);

  const setGroupPreview = useCallback((groupId: string, position: WhiteboardGroupPosition | null) => {
    setGroupPreviewState(position ? { groupId, position } : null);
    if (!position) { setDropTargetGroupId(null); return; }
    const target = getWhiteboardWorkbenchGroupDropTargetId(groups, items, groupId, position, activeGroupId);
    setDropTargetGroupId(target && canNestWhiteboardGroup(groups, groupId, target) ? target : null);
  }, [activeGroupId, groups, items]);

  const moveGroup = useCallback(async (groupId: string, position: WhiteboardGroupPosition) => {
    if (!storeReady) return;
    const hit = getWhiteboardWorkbenchGroupDropTargetId(groups, items, groupId, position, activeGroupId);
    const targetParentId = hit && canNestWhiteboardGroup(groups, groupId, hit) ? hit : activeGroupId;
    setDropTargetGroupId(null);
    try { await whiteboardStore.moveGroup(boardId, groupId, position, targetParentId); }
    catch (error) { onNotice?.(`移动工作台失败：${error instanceof Error ? error.message : String(error)}`); throw error; }
  }, [activeGroupId, boardId, groups, items, onNotice, storeReady, whiteboardStore]);
  const renameGroup = useCallback(async (groupId: string, title: string) => { if (storeReady) try { await whiteboardStore.renameGroup(boardId, groupId, title); } catch (error) { onNotice?.(`重命名工作台失败：${error instanceof Error ? error.message : String(error)}`); } }, [boardId, onNotice, storeReady, whiteboardStore]);
  const toggleGroupCollapsed = useCallback(async (groupId: string, collapsed: boolean) => { if (storeReady) try { await whiteboardStore.setGroupCollapsed(boardId, groupId, collapsed); } catch (error) { onNotice?.(`保存工作台折叠状态失败：${error instanceof Error ? error.message : String(error)}`); } }, [boardId, onNotice, storeReady, whiteboardStore]);
  const dissolveGroup = useCallback(async (groupId: string) => { if (storeReady) try { await whiteboardStore.removeGroup(boardId, groupId); } catch (error) { onNotice?.(`解散工作台失败：${error instanceof Error ? error.message : String(error)}`); } }, [boardId, onNotice, storeReady, whiteboardStore]);
  const getFindTargetPoint = useCallback((item: WhiteboardItem): WhiteboardWorldPoint => {
    const group = item.groupId ? groups.find((candidate) => candidate.id === item.groupId) : undefined;
    if (group?.collapsed) return getWhiteboardWorkbenchCenter(group, items, groups);
    return { x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 };
  }, [groups, items]);

  return { renderGroups, renderItems, renderAnnotations, visibleGroups, visibleItems, groupPreview, dropTargetGroupId, createGroup, createGroupAt, wrapItemsInGroup, setGroupPreview,
    previewItemDrop, previewSelectionDrop, resolveSelectionTarget, moveItem, removeItemFromGroup, moveGroup, renameGroup,
    toggleGroupCollapsed, dissolveGroup, getFindTargetPoint };
}
