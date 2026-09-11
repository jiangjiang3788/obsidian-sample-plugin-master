import {
    WhiteboardArchivedItemSchema,
    WhiteboardItemSchema,
    type WhiteboardBoard,
    type WhiteboardEdge,
    type WhiteboardItem,
} from './WhiteboardSchema';

const ARCHIVE_COLUMNS = 4;
const ARCHIVE_GAP_X = 56;
const ARCHIVE_GAP_Y = 48;
const ARCHIVE_CARD_WIDTH = 248;
const ARCHIVE_CARD_HEIGHT = 260;

function getDefaultArchivePosition(index: number): { archiveX: number; archiveY: number; archiveZIndex: number } {
    const safeIndex = Math.max(0, Math.floor(index));
    return {
        archiveX: 48 + (safeIndex % ARCHIVE_COLUMNS) * (ARCHIVE_CARD_WIDTH + ARCHIVE_GAP_X),
        archiveY: 72 + Math.floor(safeIndex / ARCHIVE_COLUMNS) * (ARCHIVE_CARD_HEIGHT + ARCHIVE_GAP_Y),
        archiveZIndex: safeIndex + 1,
    };
}

export function archiveWhiteboardItems(
    board: WhiteboardBoard,
    itemIds: ReadonlySet<string>,
    archivedAt: number,
): boolean {
    const targets = board.items.filter((item) => itemIds.has(item.id));
    if (targets.length === 0) return false;

    const archivedItems = board.archivedItems ?? (board.archivedItems = []);
    const archiveStartIndex = archivedItems.length;
    targets.forEach((item, offset) => archivedItems.push(WhiteboardArchivedItemSchema.parse({
        ...item,
        archivedAt,
        ...getDefaultArchivePosition(archiveStartIndex + offset),
    })));
    board.items = board.items.filter((item) => !itemIds.has(item.id));

    const movedEdges = board.edges.filter((edge) => itemIds.has(edge.fromItemId) || itemIds.has(edge.toItemId));
    board.edges = board.edges.filter((edge) => !itemIds.has(edge.fromItemId) && !itemIds.has(edge.toItemId));
    if (movedEdges.length > 0) {
        const archivedEdges = board.archivedEdges ?? (board.archivedEdges = []);
        const archivedEdgeIds = new Set(archivedEdges.map((edge) => edge.id));
        movedEdges.forEach((edge) => {
            if (archivedEdgeIds.has(edge.id)) return;
            archivedEdges.push({ ...edge });
            archivedEdgeIds.add(edge.id);
        });
    }
    return true;
}

export function restoreWhiteboardArchivedItem(board: WhiteboardBoard, itemId: string): WhiteboardItem | null {
    if (!board.archivedItems) return null;
    const index = board.archivedItems.findIndex((item) => item.id === itemId);
    if (index < 0) return null;

    const archived = board.archivedItems[index];
    if (board.items.some((item) => item.recordId === archived.recordId || item.id === archived.id)) {
        throw new Error('归档记录与当前白板 Projection 冲突，已阻止恢复');
    }
    const { archivedAt: _archivedAt, archiveX: _archiveX, archiveY: _archiveY, archiveZIndex: _archiveZIndex, ...projection } = archived;
    const item = WhiteboardItemSchema.parse(projection);
    board.items.push({ ...item });
    board.archivedItems.splice(index, 1);
    if (board.archivedItems.length === 0) delete board.archivedItems;

    const activeIds = new Set(board.items.map((candidate) => candidate.id));
    const restoreEdges: WhiteboardEdge[] = [];
    board.archivedEdges = (board.archivedEdges ?? []).filter((edge) => {
        if (!activeIds.has(edge.fromItemId) || !activeIds.has(edge.toItemId)) return true;
        restoreEdges.push(edge);
        return false;
    });
    if (board.archivedEdges.length === 0) delete board.archivedEdges;
    const edgeIds = new Set(board.edges.map((edge) => edge.id));
    restoreEdges.forEach((edge) => {
        if (!edgeIds.has(edge.id)) board.edges.push({ ...edge });
    });
    return item;
}

export function moveWhiteboardArchivedItems(
    board: WhiteboardBoard,
    moves: readonly { itemId: string; archiveX: number; archiveY: number; archiveZIndex?: number }[],
): boolean {
    if (!board.archivedItems || moves.length === 0) return false;
    const byId = new Map(board.archivedItems.map((item) => [item.id, item]));
    if (moves.some((move) => !byId.has(move.itemId))) return false;
    let changed = false;
    moves.forEach((move) => {
        const item = byId.get(move.itemId)!;
        if (item.archiveX === move.archiveX && item.archiveY === move.archiveY && (move.archiveZIndex === undefined || item.archiveZIndex === move.archiveZIndex)) return;
        item.archiveX = move.archiveX; item.archiveY = move.archiveY;
        if (move.archiveZIndex !== undefined) item.archiveZIndex = move.archiveZIndex;
        changed = true;
    });
    return changed;
}
