import type { WhiteboardBoard, WhiteboardGroupPosition, WhiteboardPosition } from './WhiteboardSchema';
import { getWhiteboardGroupPathIds } from './WhiteboardGroupTree';
import { moveWhiteboardGroupTree } from './WhiteboardWorkbenchMutations';

function hasSelectedAncestor(groups: WhiteboardBoard['groups'], groupId: string, selected: ReadonlySet<string>): boolean {
    return getWhiteboardGroupPathIds(groups ?? [], groupId).some((id) => id !== groupId && selected.has(id));
}

function rootSelectedGroupIds(groups: NonNullable<WhiteboardBoard['groups']>, groupIds: ReadonlySet<string>): string[] {
    const existing = new Set(groups.map((group) => group.id));
    const selected = new Set([...groupIds].filter((id) => existing.has(id)));
    return [...selected].filter((id) => !hasSelectedAncestor(groups, id, selected));
}

export function translateWhiteboardNodes(
    board: WhiteboardBoard,
    itemIds: ReadonlySet<string>,
    groupIds: ReadonlySet<string>,
    dx: number,
    dy: number,
): boolean {
    if ((!Number.isFinite(dx) || !Number.isFinite(dy)) || (dx === 0 && dy === 0)) return false;
    const groups = board.groups ?? [];
    const rootGroups = rootSelectedGroupIds(groups, groupIds);
    let changed = false;
    rootGroups.forEach((groupId) => {
        const group = groups.find((candidate) => candidate.id === groupId);
        if (!group) return;
        moveWhiteboardGroupTree(board, groupId, { x: group.x + dx, y: group.y + dy }, undefined);
        changed = true;
    });
    board.items.forEach((item) => {
        if (!itemIds.has(item.id)) return;
        if (item.groupId && rootGroups.some((groupId) => getWhiteboardGroupPathIds(groups, item.groupId!).includes(groupId))) return;
        item.x += dx; item.y += dy; changed = true;
    });
    return changed;
}

export function moveWhiteboardNodes(
    board: WhiteboardBoard,
    itemMoves: readonly { itemId: string; position: WhiteboardPosition }[],
    groupMoves: readonly { groupId: string; position: WhiteboardGroupPosition }[],
): boolean {
    if (itemMoves.length === 0 && groupMoves.length === 0) return false;
    const groups = board.groups ?? []; const requestedGroupIds = new Set(groupMoves.map((move) => move.groupId)); const roots = new Set(rootSelectedGroupIds(groups, requestedGroupIds));
    const groupMoveById = new Map(groupMoves.map((move) => [move.groupId, move.position])); let changed = false;
    roots.forEach((groupId) => { const group = groups.find((candidate) => candidate.id === groupId); const position = groupMoveById.get(groupId); if (!group || !position) return;
        if (group.x === position.x && group.y === position.y) return; moveWhiteboardGroupTree(board, groupId, position, undefined); changed = true;
    });
    const itemById = new Map(board.items.map((item) => [item.id, item]));
    itemMoves.forEach(({ itemId, position }) => { const item = itemById.get(itemId); if (!item) return;
        if (item.groupId && [...roots].some((groupId) => getWhiteboardGroupPathIds(groups, item.groupId!).includes(groupId))) return;
        if (item.x === position.x && item.y === position.y && (position.zIndex === undefined || item.zIndex === position.zIndex)) return;
        item.x = position.x; item.y = position.y; if (position.zIndex !== undefined) item.zIndex = position.zIndex; changed = true;
    });
    return changed;
}
