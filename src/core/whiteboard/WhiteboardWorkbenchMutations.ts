import type { WhiteboardBoard, WhiteboardGroupPosition } from './WhiteboardSchema';
import { canNestWhiteboardGroup, getWhiteboardGroupDescendantIds, getWhiteboardGroupDepth, WHITEBOARD_WORKBENCH_MAX_DEPTH } from './WhiteboardGroupTree';

export function assertWhiteboardGroupParent(board: WhiteboardBoard, parentGroupId: string | null): void {
    if (!parentGroupId) return;
    const groups = board.groups ?? [];
    if (!groups.some((group) => group.id === parentGroupId)) throw new Error('目标父工作台不存在');
    if (getWhiteboardGroupDepth(groups, parentGroupId) >= WHITEBOARD_WORKBENCH_MAX_DEPTH) {
        throw new Error(`工作台最多嵌套 ${WHITEBOARD_WORKBENCH_MAX_DEPTH} 层`);
    }
}

export function moveWhiteboardGroupTree(
    board: WhiteboardBoard,
    groupId: string,
    position: WhiteboardGroupPosition,
    parentGroupId: string | null | undefined,
): boolean {
    const groups = board.groups ?? [];
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return false;
    const nextParentId = parentGroupId === undefined ? (group.parentGroupId ?? null) : parentGroupId;
    if (nextParentId && !groups.some((candidate) => candidate.id === nextParentId)) throw new Error('目标父工作台不存在');
    if (!canNestWhiteboardGroup(groups, groupId, nextParentId)) throw new Error(`工作台最多嵌套 ${WHITEBOARD_WORKBENCH_MAX_DEPTH} 层，且不能循环嵌套`);
    const dx = position.x - group.x;
    const dy = position.y - group.y;
    const parentChanged = nextParentId !== (group.parentGroupId ?? null);
    if (dx === 0 && dy === 0 && !parentChanged) return true;
    const subtreeIds = getWhiteboardGroupDescendantIds(groups, groupId); subtreeIds.add(groupId);
    group.x = position.x; group.y = position.y;
    if (nextParentId) group.parentGroupId = nextParentId; else delete group.parentGroupId;
    groups.forEach((candidate) => {
        if (candidate.id !== groupId && subtreeIds.has(candidate.id)) { candidate.x += dx; candidate.y += dy; }
    });
    board.items.forEach((item) => { if (item.groupId && subtreeIds.has(item.groupId)) { item.x += dx; item.y += dy; } });
    board.archivedItems?.forEach((item) => { if (item.groupId && subtreeIds.has(item.groupId)) { item.x += dx; item.y += dy; } });
    board.annotations?.forEach((annotation) => { if (annotation.groupId && subtreeIds.has(annotation.groupId)) { annotation.x += dx; annotation.y += dy; } });
    return true;
}

export function dissolveWhiteboardGroupTree(board: WhiteboardBoard, groupId: string): boolean {
    const groups = board.groups;
    if (!groups) return false;
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return false;
    const parentGroupId = group.parentGroupId;
    board.groups = groups.filter((candidate) => candidate.id !== groupId);
    board.groups.forEach((candidate) => {
        if (candidate.parentGroupId !== groupId) return;
        if (parentGroupId) candidate.parentGroupId = parentGroupId; else delete candidate.parentGroupId;
    });
    board.items.forEach((item) => {
        if (item.groupId !== groupId) return;
        if (parentGroupId) item.groupId = parentGroupId; else delete item.groupId;
    });
    board.archivedItems?.forEach((item) => {
        if (item.groupId !== groupId) return;
        if (parentGroupId) item.groupId = parentGroupId; else delete item.groupId;
    });
    board.annotations?.forEach((annotation) => {
        if (annotation.groupId !== groupId) return;
        if (parentGroupId) annotation.groupId = parentGroupId; else delete annotation.groupId;
    });
    return true;
}
