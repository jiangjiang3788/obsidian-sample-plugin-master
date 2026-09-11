import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardGroupPosition, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { getWhiteboardGroupDepth, getWhiteboardGroupDescendantIds, getWhiteboardGroupPathIds } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX, WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import type { WhiteboardCamera, WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { clampWhiteboardZoom } from './WhiteboardZoomModel';

export const WHITEBOARD_WORKBENCH_MIN_WIDTH_PX = 720;
export const WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX = 480;
export const WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX = 44;
export const WHITEBOARD_WORKBENCH_PADDING_PX = 24;
export const WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX = 360;

export interface WhiteboardWorkbenchFrame { x: number; y: number; width: number; height: number; right: number; bottom: number; }
export interface WhiteboardWorkbenchDragSession { pointerId: number; startClientX: number; startClientY: number; origin: WhiteboardGroupPosition; zoom: number; }

function directChildGroups(groups: readonly WhiteboardGroup[], parentGroupId: string): WhiteboardGroup[] {
  return groups.filter((group) => group.parentGroupId === parentGroupId);
}

export function getWhiteboardWorkbenchFrame(
  group: WhiteboardGroup,
  items: readonly WhiteboardItem[],
  groups: readonly WhiteboardGroup[] = [],
  visited: ReadonlySet<string> = new Set(),
): WhiteboardWorkbenchFrame {
  if (group.collapsed || visited.has(group.id)) {
    return { x: group.x, y: group.y, width: WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX, height: WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX, right: group.x + WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX, bottom: group.y + WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX };
  }
  let right = group.x + WHITEBOARD_WORKBENCH_MIN_WIDTH_PX;
  let bottom = group.y + WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX;
  items.forEach((item) => {
    if (item.groupId !== group.id) return;
    right = Math.max(right, item.x + WHITEBOARD_CARD_WIDTH_PX + WHITEBOARD_WORKBENCH_PADDING_PX);
    bottom = Math.max(bottom, item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + WHITEBOARD_WORKBENCH_PADDING_PX);
  });
  const nextVisited = new Set(visited); nextVisited.add(group.id);
  directChildGroups(groups, group.id).forEach((child) => {
    const frame = getWhiteboardWorkbenchFrame(child, items, groups, nextVisited);
    right = Math.max(right, frame.right + WHITEBOARD_WORKBENCH_PADDING_PX);
    bottom = Math.max(bottom, frame.bottom + WHITEBOARD_WORKBENCH_PADDING_PX);
  });
  return { x: group.x, y: group.y, width: right - group.x, height: bottom - group.y, right, bottom };
}

function hasCollapsedAncestor(groups: readonly WhiteboardGroup[], groupId: string, containerGroupId: string | null): boolean {
  const byId = new Map(groups.map((group) => [group.id, group]));
  let current = byId.get(groupId);
  while (current && current.id !== containerGroupId) {
    if (current.collapsed) return true;
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return false;
}

export function getWhiteboardWorkbenchGroupsForContainer(groups: readonly WhiteboardGroup[], containerGroupId: string | null): WhiteboardGroup[] {
  return groups.filter((group) => {
    if (group.id === containerGroupId) return false;
    const path = getWhiteboardGroupPathIds(groups, group.id);
    if (containerGroupId ? !path.includes(containerGroupId) : false) return false;
    if (!containerGroupId && path.length === 0) return false;
    const parent = group.parentGroupId ? groups.find((candidate) => candidate.id === group.parentGroupId) : undefined;
    return !parent || parent.id === containerGroupId || !hasCollapsedAncestor(groups, parent.id, containerGroupId);
  });
}

export function getWhiteboardWorkbenchItemsForContainer<T extends { groupId?: string }>(
  items: readonly T[],
  groups: readonly WhiteboardGroup[],
  containerGroupId: string | null,
): T[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  return items.filter((item) => {
    if (!item.groupId) return containerGroupId === null;
    if (item.groupId === containerGroupId) return true;
    const path = getWhiteboardGroupPathIds(groups, item.groupId);
    if (containerGroupId ? !path.includes(containerGroupId) : false) return false;
    let current = groupById.get(item.groupId);
    while (current && current.id !== containerGroupId) {
      if (current.collapsed) return false;
      current = current.parentGroupId ? groupById.get(current.parentGroupId) : undefined;
    }
    return containerGroupId ? current?.id === containerGroupId : current === undefined;
  });
}

export function getWhiteboardWorkbenchPointHitTargetId(
  groups: readonly WhiteboardGroup[],
  items: readonly WhiteboardItem[],
  point: WhiteboardWorldPoint,
  containerGroupId: string | null = null,
  excludedGroupIds: ReadonlySet<string> = new Set(),
): string | null {
  const candidates = getWhiteboardWorkbenchGroupsForContainer(groups, containerGroupId)
    .filter((group) => !group.collapsed && !excludedGroupIds.has(group.id))
    .sort((a, b) => getWhiteboardGroupDepth(groups, b.id) - getWhiteboardGroupDepth(groups, a.id));
  return candidates.find((group) => {
    const frame = getWhiteboardWorkbenchFrame(group, items, groups);
    return point.x >= frame.x && point.x <= frame.right && point.y >= frame.y && point.y <= frame.bottom;
  })?.id ?? null;
}

export function getWhiteboardWorkbenchHitTargetId(
  groups: readonly WhiteboardGroup[],
  items: readonly WhiteboardItem[],
  position: WhiteboardPosition,
  containerGroupId: string | null = null,
  excludedGroupIds: ReadonlySet<string> = new Set(),
): string | null {
  return getWhiteboardWorkbenchPointHitTargetId(groups, items, {
    x: position.x + WHITEBOARD_CARD_WIDTH_PX / 2,
    y: position.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2,
  }, containerGroupId, excludedGroupIds);
}

export function getWhiteboardWorkbenchDropTargetId(
  groups: readonly WhiteboardGroup[],
  items: readonly WhiteboardItem[],
  position: WhiteboardPosition,
  currentGroupId: string | null = null,
  containerGroupId: string | null = null,
): string | null {
  return getWhiteboardWorkbenchHitTargetId(groups, items, position, containerGroupId) ?? currentGroupId ?? containerGroupId;
}


export function getWhiteboardWorkbenchGroupDropTargetId(
  groups: readonly WhiteboardGroup[],
  items: readonly WhiteboardItem[],
  groupId: string,
  position: WhiteboardGroupPosition,
  containerGroupId: string | null,
): string | null {
  const moving = groups.find((group) => group.id === groupId); if (!moving) return null;
  const dx = position.x - moving.x; const dy = position.y - moving.y;
  const movedGroups = translateWhiteboardWorkbenchGroups(groups, groupId, dx, dy);
  const movedItems = translateWhiteboardWorkbenchMembers(items, groupId, dx, dy, groups);
  const moved = movedGroups.find((group) => group.id === groupId)!;
  const frame = getWhiteboardWorkbenchFrame(moved, movedItems, movedGroups);
  const excluded = getWhiteboardGroupDescendantIds(groups, groupId); excluded.add(groupId);
  return getWhiteboardWorkbenchHitTargetId(movedGroups, movedItems, {
    x: frame.x + frame.width / 2 - WHITEBOARD_CARD_WIDTH_PX / 2,
    y: frame.y + frame.height / 2 - WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2,
  }, containerGroupId, excluded);
}

export function getNextWhiteboardWorkbenchTitle(groups: readonly WhiteboardGroup[]): string {
  const titles = new Set(groups.map((group) => group.title.trim())); let index = 1;
  while (titles.has(`工作台 ${index}`)) index += 1; return `工作台 ${index}`;
}

export function getWhiteboardWorkbenchCreatePosition(input: { camera: WhiteboardCamera; zoom: number; viewportWidth: number; viewportHeight: number; }): WhiteboardGroupPosition {
  const zoom = clampWhiteboardZoom(input.zoom);
  const centerX = input.camera.x + Math.max(0, input.viewportWidth) / (2 * zoom);
  const centerY = input.camera.y + Math.max(0, input.viewportHeight) / (2 * zoom);
  return { x: centerX - WHITEBOARD_WORKBENCH_MIN_WIDTH_PX / 2, y: centerY - WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX / 2 };
}

export function createWhiteboardWorkbenchDragSession(input: { group: WhiteboardGroup; pointerId: number; clientX: number; clientY: number; zoom: number; }): WhiteboardWorkbenchDragSession {
  return { pointerId: input.pointerId, startClientX: input.clientX, startClientY: input.clientY, origin: { x: input.group.x, y: input.group.y }, zoom: clampWhiteboardZoom(input.zoom) };
}

export function resolveWhiteboardWorkbenchDragPreview(session: WhiteboardWorkbenchDragSession, clientX: number, clientY: number): WhiteboardGroupPosition | null {
  const dx = clientX - session.startClientX; const dy = clientY - session.startClientY;
  if (Math.hypot(dx, dy) < WHITEBOARD_DRAG_THRESHOLD_PX) return null;
  return { x: session.origin.x + dx / session.zoom, y: session.origin.y + dy / session.zoom };
}

export function translateWhiteboardWorkbenchMembers<T extends { groupId?: string; x: number; y: number }>(items: readonly T[], groupId: string, dx: number, dy: number, groups: readonly WhiteboardGroup[] = []): T[] {
  const subtreeIds = getWhiteboardGroupDescendantIds(groups, groupId); subtreeIds.add(groupId);
  return items.map((item) => item.groupId && subtreeIds.has(item.groupId) ? { ...item, x: item.x + dx, y: item.y + dy } : { ...item });
}

export function translateWhiteboardWorkbenchGroups(groups: readonly WhiteboardGroup[], groupId: string, dx: number, dy: number): WhiteboardGroup[] {
  const subtreeIds = getWhiteboardGroupDescendantIds(groups, groupId); subtreeIds.add(groupId);
  return groups.map((group) => subtreeIds.has(group.id) ? { ...group, x: group.x + dx, y: group.y + dy } : { ...group });
}



export function getWhiteboardWorkbenchHomePoint(
  group: WhiteboardGroup,
  items: readonly WhiteboardItem[],
  groups: readonly WhiteboardGroup[] = [],
  annotations: readonly WhiteboardAnnotation[] = [],
): WhiteboardWorldPoint {
  const candidates: WhiteboardWorldPoint[] = [];
  items.forEach((item) => { if (item.groupId === group.id) candidates.push({ x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 }); });
  groups.forEach((child) => { if (child.parentGroupId === group.id) candidates.push({ x: child.x + (child.collapsed ? WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX : WHITEBOARD_WORKBENCH_MIN_WIDTH_PX) / 2, y: child.y + (child.collapsed ? WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX : WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX) / 2 }); });
  annotations.forEach((annotation) => { if (annotation.groupId === group.id) candidates.push({ x: annotation.x + 130, y: annotation.y + (annotation.kind === 'sticky' ? 66 : 24) }); });
  if (candidates.length === 0) return { x: group.x + WHITEBOARD_WORKBENCH_MIN_WIDTH_PX / 2, y: group.y + WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX / 2 };
  const xs = candidates.map((point) => point.x).sort((a, b) => a - b); const ys = candidates.map((point) => point.y).sort((a, b) => a - b);
  const middle = Math.floor(candidates.length / 2);
  const medianX = candidates.length % 2 ? xs[middle] : (xs[middle - 1] + xs[middle]) / 2;
  const medianY = candidates.length % 2 ? ys[middle] : (ys[middle - 1] + ys[middle]) / 2;
  return candidates.reduce((best, point) => (point.x - medianX) ** 2 + (point.y - medianY) ** 2 < (best.x - medianX) ** 2 + (best.y - medianY) ** 2 ? point : best);
}

export function getWhiteboardWorkbenchCenter(group: WhiteboardGroup, items: readonly WhiteboardItem[], groups: readonly WhiteboardGroup[] = []): WhiteboardWorldPoint {
  const frame = getWhiteboardWorkbenchFrame(group, items, groups);
  return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
}
