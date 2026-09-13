/** ThinkOS 白板的唯一状态/持久化 owner；只保存 canonical Record ID 与白板空间状态。 */
import { inject, singleton } from 'tsyringe';
import type { IPluginStorage } from '../services/StorageService';
import { STORAGE_TOKEN } from '../services/StorageService';
import { generateId } from '../utils/id';
import { devError, devLog, devWarn } from '../utils/devLogger';
import { WhiteboardBoardSchema, WhiteboardEdgeSchema, WhiteboardItemSchema, WhiteboardGroupSchema, WhiteboardStoreDataSchema, type WhiteboardAnnotation, type WhiteboardBoard, type WhiteboardEdge, type WhiteboardItem, type WhiteboardGroup, type WhiteboardGroupPosition, type WhiteboardPosition, type WhiteboardStoreData } from './WhiteboardSchema';
import { archiveWhiteboardItems, moveWhiteboardArchivedItems, restoreWhiteboardArchivedItem } from './WhiteboardArchiveMutations';
import { createWhiteboardAnnotation, moveWhiteboardAnnotation, removeWhiteboardAnnotation, updateWhiteboardAnnotation, type WhiteboardAnnotationKind } from './WhiteboardAnnotationMutations';
import { assertWhiteboardGroupParent, dissolveWhiteboardGroupTree, moveWhiteboardGroupTree } from './WhiteboardWorkbenchMutations';
import { moveWhiteboardNodes, translateWhiteboardNodes } from './WhiteboardSelectionMutations'; import { normalizeWhiteboardRecordReferences } from './WhiteboardRecordReferenceMutations';
export const DEFAULT_WHITEBOARD_STORE_PATH = 'Think/whiteboards.json';
export const LEGACY_ASSOCIATION_STORE_PATH = 'Think/association-spaces.json'; export const DEFAULT_WHITEBOARD_ID = 'whiteboard-default';
export const DEFAULT_WHITEBOARD_TITLE = '白板';
export interface WhiteboardRecordPlacement {
    recordId: string;
    position: WhiteboardPosition;
    groupId?: string;
}
export type WhiteboardStoreStatus =
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'ready' }
    | { state: 'error'; message: string }
    | { state: 'disposed' };
function emptyWhiteboardStoreData(): WhiteboardStoreData {
    return { version: 1, boards: {} };
}
function cloneBoard(board: WhiteboardBoard): WhiteboardBoard {
    return {
        title: board.title,
        items: board.items.map((item) => ({ ...item })),
        edges: board.edges.map((edge) => ({ ...edge })),
        ...(board.annotations ? { annotations: board.annotations.map((annotation) => ({ ...annotation })) } : {}),
        ...(board.groups ? { groups: board.groups.map((group) => ({ ...group })) } : {}),
        ...(board.archivedItems ? { archivedItems: board.archivedItems.map((item) => ({ ...item })) } : {}),
        ...(board.archivedEdges ? { archivedEdges: board.archivedEdges.map((edge) => ({ ...edge })) } : {}),
        modified: board.modified,
    };
}
function cloneStoreData(data: WhiteboardStoreData): WhiteboardStoreData {
    return {
        version: 1,
        boards: Object.fromEntries(
            Object.entries(data.boards).map(([boardId, board]) => [boardId, cloneBoard(board)])
        ),
    };
}
function corruptBackupPath(filePath: string): string {
    return filePath.endsWith('.json')
        ? `${filePath.slice(0, -'.json'.length)}.corrupt.json`
        : `${filePath}.corrupt.json`;
}

type MutationDecision<T> = { changed: boolean; value: T };
const changed = <T,>(value: T): MutationDecision<T> => ({ changed: true, value });
const unchanged = <T,>(value: T): MutationDecision<T> => ({ changed: false, value });
@singleton()
export class WhiteboardStore {
    private data: WhiteboardStoreData = emptyWhiteboardStoreData();
    private listeners = new Set<() => void>();
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private disposed = false;
    private status: WhiteboardStoreStatus = { state: 'idle' };
    private mutationQueue: Promise<void> = Promise.resolve();
    private historyPast: WhiteboardStoreData[] = []; private historyFuture: WhiteboardStoreData[] = []; private readonly historyLimit = 100;
    private readonly filePath = DEFAULT_WHITEBOARD_STORE_PATH;
    constructor(@inject(STORAGE_TOKEN) private storage: IPluginStorage) {}
    getStatus(): WhiteboardStoreStatus {
        return { ...this.status };
    }
    async initialize(): Promise<void> {
        if (this.disposed) throw new Error('WhiteboardStore 已 dispose');
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;
        this.setStatus({ state: 'loading' });
        const operation = this.doInitialize()
            .then(async () => {
                if (this.disposed) return;
                this.initialized = true;
                this.setStatus({ state: 'ready' });
                await this.cleanupLegacyAssociationData();
            })
            .catch((error) => {
                if (!this.disposed) {
                    this.initialized = false;
                    const message = error instanceof Error ? error.message : String(error);
                    this.setStatus({ state: 'error', message });
                }
                throw error;
            })
            .finally(() => { this.initPromise = null; });
        this.initPromise = operation;
        return operation;
    }
    private async doInitialize(): Promise<void> {
        let raw: unknown;
        try {
            raw = await this.storage.readJSON<unknown>(this.filePath);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new Error(`白板数据恢复失败（${this.filePath}）：${detail}`);
        }
        if (this.disposed) return;
        if (raw == null) {
            this.data = emptyWhiteboardStoreData();
            return;
        }
        const parsed = WhiteboardStoreDataSchema.safeParse(raw);
        if (parsed.success) {
            this.data = cloneStoreData(parsed.data);
            devLog(`WhiteboardStore: 从文件加载 ${Object.keys(this.data.boards).length} 个白板`);
            return;
        }
        devWarn('WhiteboardStore: 文件数据校验失败，备份损坏文件并阻止写入', parsed.error);
        await this.backupCorruptData(raw);
        throw new Error(`白板数据格式无效（${this.filePath}），已阻止写入以保护原文件`);
    }
    private async cleanupLegacyAssociationData(): Promise<void> {
        try {
            await this.storage.remove(LEGACY_ASSOCIATION_STORE_PATH);
        } catch (error) {
            devWarn(`WhiteboardStore: 清理旧测试数据失败（${LEGACY_ASSOCIATION_STORE_PATH}），可忽略`, error);
        }
    }
    private async backupCorruptData(data: unknown): Promise<void> {
        if (this.disposed) return;
        try {
            await this.storage.writeJSON(corruptBackupPath(this.filePath), data);
        } catch (error) {
            devError('WhiteboardStore: 备份损坏数据失败', error);
        }
    }
    private setStatus(status: WhiteboardStoreStatus): void {
        this.status = status;
        this.notify();
    }
    private assertReady(): void {
        if (this.disposed) throw new Error('WhiteboardStore 已 dispose');
        if (this.status.state === 'error') throw new Error(`WhiteboardStore 初始化失败：${this.status.message}`);
        if (!this.initialized || this.status.state !== 'ready') throw new Error('WhiteboardStore 尚未完成启动恢复，当前禁止读取或写入');
    }
    private assertBoardId(boardId: string): void {
        if (!boardId.trim()) throw new Error('whiteboardId 必须非空');
    }
    private getMutableBoard(data: WhiteboardStoreData, boardId: string): WhiteboardBoard | undefined {
        return data.boards[boardId];
    }
    private ensureMutableBoard(data: WhiteboardStoreData, boardId: string, title = DEFAULT_WHITEBOARD_TITLE): WhiteboardBoard {
        const existing = this.getMutableBoard(data, boardId);
        if (existing) return existing;
        const board = WhiteboardBoardSchema.parse({ title, items: [], edges: [], modified: Date.now() });
        data.boards[boardId] = board;
        return board;
    }
    private touch(board: WhiteboardBoard): void {
        board.modified = Date.now();
    }
    private groups(board: WhiteboardBoard): WhiteboardGroup[] { return board.groups ?? (board.groups = []); }
    private findGroup(board: WhiteboardBoard, groupId: string): WhiteboardGroup | undefined { return board.groups?.find((group) => group.id === groupId); }
    private async persistSnapshot(snapshot: WhiteboardStoreData): Promise<void> {
        try { await this.storage.writeJSON(this.filePath, snapshot); }
        catch (error) { throw new Error(`白板数据写入失败（${this.filePath}）：${error instanceof Error ? error.message : String(error)}`); }
    }
    private enqueueMutation<T>(mutate: (draft: WhiteboardStoreData) => MutationDecision<T>, recordHistory = true): Promise<T> {
        const operation = this.mutationQueue.then(async () => {
            this.assertReady();
            const draft = cloneStoreData(this.data);
            const decision = mutate(draft);
            if (!decision.changed) return decision.value;
            const parsed = WhiteboardStoreDataSchema.safeParse(draft);
            if (!parsed.success) throw new Error(`WhiteboardStore mutation 产生无效数据: ${parsed.error.message}`);
            const snapshot = cloneStoreData(parsed.data);
            const previous = cloneStoreData(this.data);
            await this.persistSnapshot(snapshot);
            if (!this.disposed) {
                if (recordHistory) {
                    this.historyPast.push(previous);
                    if (this.historyPast.length > this.historyLimit) this.historyPast.shift();
                    this.historyFuture = [];
                }
                this.data = snapshot;
                this.notify();
            }
            return decision.value;
        });
        this.mutationQueue = operation.then(() => undefined, () => undefined);
        return operation;
    }
    private notify(): void {
        if (this.disposed) return;
        this.listeners.forEach((listener) => { try { listener(); } catch (error) { devError('WhiteboardStore: 通知失败', error); } });
    }
    subscribe(listener: () => void): () => void {
        if (this.disposed) return () => undefined; this.listeners.add(listener); return () => this.listeners.delete(listener);
    }
    dispose(): void {
        this.disposed = true; this.initialized = false; this.status = { state: 'disposed' }; this.listeners.clear(); this.initPromise = null;
        this.historyPast = []; this.historyFuture = [];
    }
    canUndo(): boolean { return this.initialized && this.status.state === 'ready' && this.historyPast.length > 0; }
    canRedo(): boolean { return this.initialized && this.status.state === 'ready' && this.historyFuture.length > 0; }
    private enqueueHistoryTravel(direction: 'undo' | 'redo'): Promise<boolean> {
        const operation = this.mutationQueue.then(async () => { this.assertReady();
            const source = direction === 'undo' ? this.historyPast : this.historyFuture; const target = direction === 'undo' ? this.historyFuture : this.historyPast;
            const candidate = source[source.length - 1]; if (!candidate) return false;
            const snapshot = cloneStoreData(candidate); const current = cloneStoreData(this.data); await this.persistSnapshot(snapshot);
            source.pop(); target.push(current); if (target.length > this.historyLimit) target.shift();
            if (!this.disposed) { this.data = snapshot; this.notify(); } return true; });
        this.mutationQueue = operation.then(() => undefined, () => undefined); return operation;
    }
    undo(): Promise<boolean> { return this.enqueueHistoryTravel('undo'); }
    redo(): Promise<boolean> { return this.enqueueHistoryTravel('redo'); }
    getBoard(boardId: string): WhiteboardBoard | undefined {
        this.assertReady();
        this.assertBoardId(boardId);
        const board = this.getMutableBoard(this.data, boardId);
        return board ? cloneBoard(board) : undefined;
    }
    async ensureBoard(boardId: string, title = DEFAULT_WHITEBOARD_TITLE): Promise<WhiteboardBoard> {
        this.assertReady();
        this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => {
            const existing = this.getMutableBoard(draft, boardId);
            if (existing) return unchanged(cloneBoard(existing));
            return changed(cloneBoard(this.ensureMutableBoard(draft, boardId, title)));
        }, false);
    }
    async normalizeRecordReferences(replacements: Readonly<Record<string, string>>): Promise<number> { this.assertReady(); if (Object.keys(replacements).length === 0) return 0; return this.enqueueMutation((draft) => { let total = 0; Object.values(draft.boards).forEach((board) => { const count = normalizeWhiteboardRecordReferences(board, replacements); if (count > 0) { this.touch(board); total += count; } }); return total > 0 ? changed(total) : unchanged(0); }, false); }
    async addRecord(boardId: string, recordId: string, position: WhiteboardPosition, groupId?: string | null): Promise<WhiteboardItem> {
        this.assertReady();
        this.assertBoardId(boardId);
        if (!recordId.trim()) throw new Error('recordId 必须非空');
        return this.enqueueMutation((draft) => {
            const board = this.ensureMutableBoard(draft, boardId);
            const existing = board.items.find((item) => item.recordId === recordId);
            if (existing) return unchanged({ ...existing });
            if (board.archivedItems?.some((item) => item.recordId === recordId)) throw new Error('该记录已归档，请从归档箱恢复');
            if (groupId && !this.findGroup(board, groupId)) throw new Error('目标工作台不存在');
            const item = WhiteboardItemSchema.parse({
                id: generateId('whiteboard-item'),
                recordId,
                x: position.x,
                y: position.y,
                ...(position.zIndex === undefined ? {} : { zIndex: position.zIndex }),
                ...(groupId ? { groupId } : {}),
            });
            board.items.push({ ...item });
            this.touch(board);
            return changed({ ...item });
        });
    }
    async addRecords(boardId: string, placements: readonly WhiteboardRecordPlacement[]): Promise<WhiteboardItem[]> {
        this.assertReady();
        this.assertBoardId(boardId);
        const seenRecordIds = new Set<string>();
        const uniquePlacements = placements.filter((entry) => {
            if (!entry.recordId.trim()) throw new Error('recordId 必须非空');
            if (seenRecordIds.has(entry.recordId)) return false;
            seenRecordIds.add(entry.recordId);
            return true;
        });
        if (uniquePlacements.length === 0) return [];
        return this.enqueueMutation((draft) => {
            const board = this.ensureMutableBoard(draft, boardId);
            const results: WhiteboardItem[] = [];
            const archivedRecordIds = new Set((board.archivedItems ?? []).map((item) => item.recordId));
            const existingByRecordId = new Map(board.items.map((item) => [item.recordId, item]));
            let didChange = false;
            uniquePlacements.forEach(({ recordId, position, groupId }) => {
                if (archivedRecordIds.has(recordId)) throw new Error('批量加入包含已归档记录，请先从归档箱恢复');
                const existing = existingByRecordId.get(recordId);
                if (existing) {
                    results.push({ ...existing });
                    return;
                }
                if (groupId && !this.findGroup(board, groupId)) throw new Error('目标工作台不存在');
                const item = WhiteboardItemSchema.parse({
                    id: generateId('whiteboard-item'), recordId, x: position.x, y: position.y,
                    ...(position.zIndex === undefined ? {} : { zIndex: position.zIndex }),
                    ...(groupId ? { groupId } : {}),
                });
                board.items.push({ ...item });
                existingByRecordId.set(recordId, item);
                results.push({ ...item });
                didChange = true;
            });
            if (!didChange) return unchanged(results);
            this.touch(board);
            return changed(results);
        });
    }
    async moveItem(boardId: string, itemId: string, position: WhiteboardPosition, groupId?: string | null): Promise<boolean> {
        this.assertReady();
        this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => {
            const board = this.getMutableBoard(draft, boardId);
            if (!board) return unchanged(false);
            const item = board.items.find((candidate) => candidate.id === itemId);
            if (!item) return unchanged(false);
            if (groupId && !this.findGroup(board, groupId)) throw new Error('目标工作台不存在');
            const { groupId: currentGroupId, ...withoutGroup } = item;
            const base = groupId === null ? withoutGroup : item;
            const next = WhiteboardItemSchema.parse({ ...base, x: position.x, y: position.y,
                ...(position.zIndex === undefined ? {} : { zIndex: position.zIndex }),
                ...(groupId ? { groupId } : groupId === undefined && currentGroupId ? { groupId: currentGroupId } : {}),
            });
            if (groupId === null) delete item.groupId;
            Object.assign(item, next);
            this.touch(board);
            return changed(true);
        });
    }
    async moveItems(boardId: string, moves: readonly { itemId: string; position: WhiteboardPosition }[], groupId?: string): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || moves.length === 0) return unchanged(false);
            if (groupId && !this.findGroup(board, groupId)) throw new Error('目标工作台不存在');
            const itemById = new Map(board.items.map((item) => [item.id, item])); if (moves.some((move) => !itemById.has(move.itemId))) return unchanged(false);
            moves.forEach(({ itemId, position }) => { const item = itemById.get(itemId)!; Object.assign(item, WhiteboardItemSchema.parse({ ...item, x: position.x, y: position.y, ...(position.zIndex === undefined ? {} : { zIndex: position.zIndex }), ...(groupId ? { groupId } : {}) })); });
            this.touch(board); return changed(true); }); }
    async moveArchivedItems(boardId: string, moves: readonly { itemId: string; archiveX: number; archiveY: number; archiveZIndex?: number }[]): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId); return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !moveWhiteboardArchivedItems(board, moves)) return unchanged(false); this.touch(board); return changed(true); }); }
    async translateNodes(boardId: string, itemIds: readonly string[], groupIds: readonly string[], dx: number, dy: number): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId); const items = new Set(itemIds.filter((id) => id.trim())); const groups = new Set(groupIds.filter((id) => id.trim())); return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !translateWhiteboardNodes(board, items, groups, dx, dy)) return unchanged(false); this.touch(board); return changed(true); }); }
    async moveNodes(boardId: string, itemMoves: readonly { itemId: string; position: WhiteboardPosition }[], groupMoves: readonly { groupId: string; position: WhiteboardGroupPosition }[]): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId); return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !moveWhiteboardNodes(board, itemMoves, groupMoves)) return unchanged(false); this.touch(board); return changed(true); }); }
    async archiveItems(boardId: string, itemIds: readonly string[]): Promise<boolean> {
        this.assertReady(); this.assertBoardId(boardId); const ids = new Set(itemIds.filter((id) => id.trim()));
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || ids.size === 0) return unchanged(false);
            if (!archiveWhiteboardItems(board, ids, Date.now())) return unchanged(false); this.touch(board); return changed(true); });
    }
    async restoreArchivedItem(boardId: string, itemId: string): Promise<WhiteboardItem | null> {
        this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board) return unchanged(null);
            const item = restoreWhiteboardArchivedItem(board, itemId); if (!item) return unchanged(null); this.touch(board); return changed({ ...item }); });
    }
    async removeItems(boardId: string, itemIds: readonly string[]): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId); const ids = new Set(itemIds.filter((id) => id.trim()));
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || ids.size === 0) return unchanged(false);
            const before = board.items.length; board.items = board.items.filter((item) => !ids.has(item.id)); if (board.items.length === before) return unchanged(false);
            board.edges = board.edges.filter((edge) => !ids.has(edge.fromItemId) && !ids.has(edge.toItemId)); if (board.archivedEdges) board.archivedEdges = board.archivedEdges.filter((edge) => !ids.has(edge.fromItemId) && !ids.has(edge.toItemId)); this.touch(board); return changed(true); }); }
    async removeItem(boardId: string, itemId: string): Promise<boolean> {
        this.assertReady();
        this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => {
            const board = this.getMutableBoard(draft, boardId);
            if (!board) return unchanged(false);
            const originalLength = board.items.length;
            board.items = board.items.filter((item) => item.id !== itemId);
            if (board.items.length === originalLength) return unchanged(false);
            board.edges = board.edges.filter((edge) => edge.fromItemId !== itemId && edge.toItemId !== itemId);
            if (board.archivedEdges) board.archivedEdges = board.archivedEdges.filter((edge) => edge.fromItemId !== itemId && edge.toItemId !== itemId);
            this.touch(board);
            return changed(true);
        });
    }
    async createGroup(boardId: string, title: string, position: WhiteboardGroupPosition, parentGroupId?: string | null): Promise<WhiteboardGroup> {
        this.assertReady(); this.assertBoardId(boardId); const cleanTitle = title.trim();
        if (!cleanTitle) throw new Error('工作台名称必须非空');
        return this.enqueueMutation((draft) => { const board = this.ensureMutableBoard(draft, boardId);
            const parentId = parentGroupId ?? null; assertWhiteboardGroupParent(board, parentId);
            const group = WhiteboardGroupSchema.parse({ id: generateId('whiteboard-group'), title: cleanTitle, x: position.x, y: position.y, collapsed: false, ...(parentId ? { parentGroupId: parentId } : {}) });
            this.groups(board).push({ ...group }); this.touch(board); return changed({ ...group }); });
    }
    async createGroupFromItems(boardId: string, title: string, itemIds: readonly string[], position: WhiteboardGroupPosition, parentGroupId?: string | null): Promise<WhiteboardGroup> { this.assertReady(); this.assertBoardId(boardId); const cleanTitle = title.trim(); if (!cleanTitle) throw new Error('工作台名称必须非空');
        return this.enqueueMutation((draft) => { const board = this.ensureMutableBoard(draft, boardId); const ids = new Set(itemIds); const members = board.items.filter((item) => ids.has(item.id)); if (members.length === 0) throw new Error('没有可加入工作台的所选卡片'); const parentId = parentGroupId ?? null; assertWhiteboardGroupParent(board, parentId);
            const group = WhiteboardGroupSchema.parse({ id: generateId('whiteboard-group'), title: cleanTitle, x: position.x, y: position.y, collapsed: false, ...(parentId ? { parentGroupId: parentId } : {}) }); this.groups(board).push({ ...group }); members.forEach((item) => { item.groupId = group.id; }); this.touch(board); return changed({ ...group }); }); }
    async renameGroup(boardId: string, groupId: string, title: string): Promise<boolean> {
        this.assertReady(); this.assertBoardId(boardId); const cleanTitle = title.trim(); if (!cleanTitle) throw new Error('工作台名称必须非空');
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); const group = board && this.findGroup(board, groupId);
            if (!board || !group) return unchanged(false); if (group.title === cleanTitle) return unchanged(true);
            group.title = cleanTitle; this.touch(board); return changed(true); });
    }
    async setGroupCollapsed(boardId: string, groupId: string, collapsed: boolean): Promise<boolean> {
        this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); const group = board && this.findGroup(board, groupId);
            if (!board || !group) return unchanged(false); if (group.collapsed === collapsed) return unchanged(true);
            group.collapsed = collapsed; this.touch(board); return changed(true); });
    }
    async moveGroup(boardId: string, groupId: string, position: WhiteboardGroupPosition, parentGroupId?: string | null): Promise<boolean> {
        this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board) return unchanged(false);
            const group = this.findGroup(board, groupId); if (!group) return unchanged(false);
            const nextParentId = parentGroupId === undefined ? (group.parentGroupId ?? null) : parentGroupId;
            if (group.x === position.x && group.y === position.y && nextParentId === (group.parentGroupId ?? null)) return unchanged(true);
            moveWhiteboardGroupTree(board, groupId, position, parentGroupId); this.touch(board); return changed(true); });
    }
    async removeGroup(boardId: string, groupId: string): Promise<boolean> {
        this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !dissolveWhiteboardGroupTree(board, groupId)) return unchanged(false);
            this.touch(board); return changed(true); });
    }
    async bringItemToFront(boardId: string, itemId: string): Promise<boolean> {
        this.assertReady();
        this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => {
            const board = this.getMutableBoard(draft, boardId);
            if (!board) return unchanged(false);
            const item = board.items.find((candidate) => candidate.id === itemId);
            if (!item) return unchanged(false);
            const maxZ = board.items.reduce((max, candidate) => Math.max(max, candidate.zIndex ?? 0), 0);
            item.zIndex = maxZ + 1;
            this.touch(board);
            return changed(true);
        });
    }

    async createAnnotation(boardId: string, kind: WhiteboardAnnotationKind, text: string, position: WhiteboardPosition, groupId?: string | null): Promise<WhiteboardAnnotation> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.ensureMutableBoard(draft, boardId); const annotation = createWhiteboardAnnotation(board, kind, text, position, groupId); this.touch(board); return changed({ ...annotation }); }); }
    async updateAnnotation(boardId: string, annotationId: string, text: string): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !updateWhiteboardAnnotation(board, annotationId, text)) return unchanged(false); this.touch(board); return changed(true); }); }
    async moveAnnotation(boardId: string, annotationId: string, position: WhiteboardPosition): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !moveWhiteboardAnnotation(board, annotationId, position)) return unchanged(false); this.touch(board); return changed(true); }); }
    async removeAnnotation(boardId: string, annotationId: string): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); if (!board || !removeWhiteboardAnnotation(board, annotationId)) return unchanged(false); this.touch(board); return changed(true); }); }
    async addEdge(boardId: string, fromItemId: string, toItemId: string): Promise<WhiteboardEdge> {
        this.assertReady();
        this.assertBoardId(boardId);
        if (!fromItemId.trim() || !toItemId.trim()) throw new Error('白板连线必须引用非空 item ID');
        if (fromItemId === toItemId) throw new Error('白板连线不能连接同一个 item');
        return this.enqueueMutation((draft) => {
            const board = this.getMutableBoard(draft, boardId);
            if (!board) throw new Error('白板不存在，无法创建连线');
            if (!board.items.some((item) => item.id === fromItemId) || !board.items.some((item) => item.id === toItemId)) {
                throw new Error('白板连线的起点或终点 item 不存在');
            }
            const duplicate = board.edges.find((edge) => edge.fromItemId === fromItemId && edge.toItemId === toItemId);
            if (duplicate) return unchanged({ ...duplicate });
            const edge = WhiteboardEdgeSchema.parse({ id: generateId('whiteboard-edge'), fromItemId, toItemId });
            board.edges.push({ ...edge });
            this.touch(board);
            return changed({ ...edge });
        });
    }

    async updateEdgeLabel(boardId: string, edgeId: string, label: string): Promise<boolean> { this.assertReady(); this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => { const board = this.getMutableBoard(draft, boardId); const edge = board?.edges.find((candidate) => candidate.id === edgeId); if (!board || !edge) return unchanged(false);
            const cleanLabel = label.trim().slice(0, 200); if ((edge.label ?? '') === cleanLabel) return unchanged(true); if (cleanLabel) edge.label = cleanLabel; else delete edge.label; this.touch(board); return changed(true); }); }
    async removeEdge(boardId: string, edgeId: string): Promise<boolean> {
        this.assertReady();
        this.assertBoardId(boardId);
        return this.enqueueMutation((draft) => {
            const board = this.getMutableBoard(draft, boardId);
            if (!board) return unchanged(false);
            const originalLength = board.edges.length;
            board.edges = board.edges.filter((edge) => edge.id !== edgeId);
            if (board.edges.length === originalLength) return unchanged(false);
            this.touch(board);
            return changed(true);
        });
    }
}
