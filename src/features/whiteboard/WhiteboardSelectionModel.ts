import type { WhiteboardGroup, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { screenToWhiteboardWorld, type WhiteboardCamera } from './WhiteboardCameraModel';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { clampWhiteboardZoom } from './WhiteboardZoomModel';
import { getWhiteboardWorkbenchFrame } from './WhiteboardWorkbenchModel';

export interface WhiteboardRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface WhiteboardMarqueeSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  viewportLeft: number;
  viewportTop: number;
  camera: WhiteboardCamera;
  zoom: number;
  baseSelection: string[];
}

export interface WhiteboardSelectionMove {
  itemId: string;
  position: WhiteboardPosition;
}

function rectFromPoints(x1: number, y1: number, x2: number, y2: number): WhiteboardRect {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function createWhiteboardMarqueeSession(input: {
  pointerId: number;
  clientX: number;
  clientY: number;
  viewportLeft: number;
  viewportTop: number;
  camera: WhiteboardCamera;
  zoom: number;
  baseSelection?: Iterable<string>;
}): WhiteboardMarqueeSession {
  return {
    pointerId: input.pointerId,
    startClientX: input.clientX,
    startClientY: input.clientY,
    viewportLeft: input.viewportLeft,
    viewportTop: input.viewportTop,
    camera: { ...input.camera },
    zoom: clampWhiteboardZoom(input.zoom),
    baseSelection: [...(input.baseSelection ?? [])],
  };
}

export function resolveWhiteboardMarqueeRects(
  session: WhiteboardMarqueeSession,
  clientX: number,
  clientY: number,
): { screen: WhiteboardRect; world: WhiteboardRect } {
  const screen = rectFromPoints(
    session.startClientX - session.viewportLeft,
    session.startClientY - session.viewportTop,
    clientX - session.viewportLeft,
    clientY - session.viewportTop,
  );
  const start = screenToWhiteboardWorld(
    { clientX: session.startClientX, clientY: session.startClientY },
    { left: session.viewportLeft, top: session.viewportTop },
    session.camera,
    session.zoom,
  );
  const end = screenToWhiteboardWorld(
    { clientX, clientY },
    { left: session.viewportLeft, top: session.viewportTop },
    session.camera,
    session.zoom,
  );
  return { screen, world: rectFromPoints(start.x, start.y, end.x, end.y) };
}

export function getWhiteboardItemsIntersectingRect(
  items: readonly WhiteboardItem[],
  rect: WhiteboardRect,
): string[] {
  return items.filter((item) => {
    const right = item.x + WHITEBOARD_CARD_WIDTH_PX;
    const bottom = item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX;
    return item.x <= rect.right && right >= rect.left && item.y <= rect.bottom && bottom >= rect.top;
  }).map((item) => item.id);
}

export function mergeWhiteboardSelection(base: Iterable<string>, hitIds: Iterable<string>): Set<string> {
  return new Set([...base, ...hitIds]);
}

export function buildWhiteboardSelectionMoves(input: {
  items: readonly WhiteboardItem[];
  selectedItemIds: ReadonlySet<string>;
  draggedItemId: string;
  draggedPosition: WhiteboardPosition;
}): WhiteboardSelectionMove[] {
  const dragged = input.items.find((item) => item.id === input.draggedItemId);
  if (!dragged || !input.selectedItemIds.has(input.draggedItemId)) return [];
  const dx = input.draggedPosition.x - dragged.x;
  const dy = input.draggedPosition.y - dragged.y;
  return input.items.filter((item) => input.selectedItemIds.has(item.id)).map((item) => ({
    itemId: item.id,
    position: item.id === input.draggedItemId
      ? { ...input.draggedPosition }
      : { x: item.x + dx, y: item.y + dy, zIndex: item.zIndex },
  }));
}

export function applyWhiteboardSelectionPreview(
  items: readonly WhiteboardItem[],
  moves: readonly WhiteboardSelectionMove[],
): WhiteboardItem[] {
  if (moves.length === 0) return items.map((item) => ({ ...item }));
  const moveById = new Map(moves.map((move) => [move.itemId, move.position]));
  return items.map((item) => {
    const position = moveById.get(item.id);
    return position ? { ...item, ...position } : { ...item };
  });
}


export function getWhiteboardGroupsIntersectingRect(
  groups: readonly WhiteboardGroup[],
  items: readonly WhiteboardItem[],
  rect: WhiteboardRect,
): string[] {
  return groups.filter((group) => {
    const frame = getWhiteboardWorkbenchFrame(group, items, groups);
    return frame.x <= rect.right && frame.right >= rect.left && frame.y <= rect.bottom && frame.bottom >= rect.top;
  }).map((group) => group.id);
}

export function getWhiteboardDirectItems(items: readonly WhiteboardItem[], containerGroupId: string | null): WhiteboardItem[] {
  return items.filter((item) => (item.groupId ?? null) === containerGroupId);
}

export function getWhiteboardDirectGroups(groups: readonly WhiteboardGroup[], containerGroupId: string | null): WhiteboardGroup[] {
  return groups.filter((group) => (group.parentGroupId ?? null) === containerGroupId);
}
