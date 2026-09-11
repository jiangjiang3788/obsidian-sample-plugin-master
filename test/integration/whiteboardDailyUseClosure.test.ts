/**
 * @covers F152/integration
 * @covers F152/persistence
 * @covers F152/restart
 * @covers F152/regression
 */
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_STORE_PATH, WhiteboardStore } from '@core/whiteboard/public';
import type { WhiteboardStoreData } from '@core/whiteboard/public';
import type { IPluginStorage } from '@/core/services/StorageService';
import { resolveWhiteboardBatchPlacements } from '@/features/whiteboard/WhiteboardBatchPlacementModel';
import { arrangeWhiteboardNodes } from '@/features/whiteboard/WhiteboardNodeArrangeModel';
import { arrangeWhiteboardItemsBySpec } from '@/features/whiteboard/WhiteboardSemanticLayoutModel';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function persistentMemoryStorage() {
  const files = new Map<string, unknown>();
  const storage: IPluginStorage = {
    readJSON: async <T>(path: string): Promise<T | null> => files.has(path) ? clone(files.get(path)) as T : null,
    writeJSON: jest.fn(async (path, value) => { files.set(path, clone(value)); }),
    remove: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, storage };
}
function record(id: string, coreBlock: string, goalPath: string, date: string): RecordViewItem {
  return { id, coreBlock, categoryKey: coreBlock, title: id, content: id, tags: [], goalPath, date, created: Date.parse(date), modified: 0, extra: {} } as RecordViewItem;
}

describe('Whiteboard 1.3.6 Daily-use Closure', () => {
  it('完整主链：批量 neutral grid → Goal×Type×Time → 低倍率整理 → 4 层 Workbench → Archive → Restore → Undo → Restart', async () => {
    const h = persistentMemoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const records = [
      record('daily-a', 'task', '目标 A', '2026-01-04'),
      record('daily-b', 'thought', '目标 A', '2026-01-08'),
      record('daily-c', 'task', '目标 A', '2026-02-09'),
      record('daily-d', 'thought', '目标 B', '2026-03-12'),
    ];
    const recordsById = new Map(records.map((entry) => [entry.id, entry]));

    const batch = resolveWhiteboardBatchPlacements(records.map((entry) => entry.id), { x: -120_000, y: 95_000 }, 10);
    expect(new Set(batch.map((entry) => entry.position.x)).size).toBe(2);
    expect(new Set(batch.map((entry) => entry.position.y)).size).toBe(2);
    const added = await store.addRecords(DEFAULT_WHITEBOARD_ID, batch);
    expect(added).toHaveLength(4);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toBeUndefined();

    const semantic = arrangeWhiteboardItemsBySpec(store.getBoard(DEFAULT_WHITEBOARD_ID)!.items, recordsById);
    expect(semantic.guides.some((guide) => guide.kind === 'goal')).toBe(true);
    expect(semantic.guides.some((guide) => guide.kind === 'recordType')).toBe(true);
    expect(semantic.guides.some((guide) => guide.kind === 'time')).toBe(true);
    await expect(store.moveItems(DEFAULT_WHITEBOARD_ID, semantic.moves)).resolves.toBe(true);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toBeUndefined(); // Arrange != Group

    const afterSemantic = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    const lowZoomArrange = arrangeWhiteboardNodes({
      targetItems: afterSemantic.items,
      targetGroups: [],
      allItems: afterSemantic.items,
      allGroups: [],
      mode: 'align-left',
    });
    await expect(store.moveNodes(DEFAULT_WHITEBOARD_ID, lowZoomArrange.itemMoves, lowZoomArrange.groupMoves)).resolves.toBe(true);
    expect(new Set(store.getBoard(DEFAULT_WHITEBOARD_ID)!.items.map((item) => item.x)).size).toBe(1);

    const aligned = store.getBoard(DEFAULT_WHITEBOARD_ID)!.items;
    const level1 = await store.createGroupFromItems(DEFAULT_WHITEBOARD_ID, 'Closure L1', aligned.map((item) => item.id), { x: aligned[0].x - 60, y: aligned[0].y - 100 });
    const level2 = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'Closure L2', { x: aligned[0].x + 300, y: aligned[0].y + 300 }, level1.id);
    const level3 = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'Closure L3', { x: aligned[0].x + 600, y: aligned[0].y + 600 }, level2.id);
    const level4 = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'Closure L4', { x: aligned[0].x + 900, y: aligned[0].y + 900 }, level3.id);
    const target = store.getBoard(DEFAULT_WHITEBOARD_ID)!.items.find((item) => item.recordId === 'daily-a')!;
    const peer = store.getBoard(DEFAULT_WHITEBOARD_ID)!.items.find((item) => item.recordId === 'daily-b')!;
    await store.moveItem(DEFAULT_WHITEBOARD_ID, target.id, { x: target.x + 940, y: target.y + 940, zIndex: target.zIndex }, level4.id);
    const deepTarget = store.getBoard(DEFAULT_WHITEBOARD_ID)!.items.find((item) => item.id === target.id)!;
    const annotation = await store.createAnnotation(DEFAULT_WHITEBOARD_ID, 'sticky', 'Daily closure note', { x: deepTarget.x + 40, y: deepTarget.y + 260 }, level4.id);
    const edge = await store.addEdge(DEFAULT_WHITEBOARD_ID, target.id, peer.id); await store.updateEdgeLabel(DEFAULT_WHITEBOARD_ID, edge.id, 'daily closure');

    const restoreOrigin = { x: deepTarget.x, y: deepTarget.y, zIndex: deepTarget.zIndex, groupId: deepTarget.groupId };
    await store.archiveItems(DEFAULT_WHITEBOARD_ID, [target.id]);
    await store.moveArchivedItems(DEFAULT_WHITEBOARD_ID, [{ itemId: target.id, archiveX: -44_000, archiveY: 71_000, archiveZIndex: 77 }]);
    const archived = store.getBoard(DEFAULT_WHITEBOARD_ID)!.archivedItems?.find((item) => item.id === target.id)!;
    expect(archived).toMatchObject({ ...restoreOrigin, archiveX: -44_000, archiveY: 71_000, archiveZIndex: 77 });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedEdges).toEqual([expect.objectContaining({ id: edge.id, label: 'daily closure' })]);

    await expect(store.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, target.id)).resolves.toMatchObject(restoreOrigin);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([expect.objectContaining({ id: edge.id, label: 'daily closure' })]);
    await expect(store.undo()).resolves.toBe(true);
    const afterUndo = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(afterUndo.items.some((item) => item.id === target.id)).toBe(false);
    expect(afterUndo.archivedItems?.find((item) => item.id === target.id)).toMatchObject({ ...restoreOrigin, archiveX: -44_000, archiveY: 71_000, archiveZIndex: 77 });
    expect(afterUndo.groups?.find((group) => group.id === level4.id)).toMatchObject({ parentGroupId: level3.id });
    expect(afterUndo.annotations?.find((entry) => entry.id === annotation.id)).toMatchObject({ groupId: level4.id, text: 'Daily closure note' });

    store.dispose();
    const persisted = h.files.get(DEFAULT_WHITEBOARD_STORE_PATH) as WhiteboardStoreData;
    expect(persisted.boards[DEFAULT_WHITEBOARD_ID]?.archivedItems?.find((item) => item.id === target.id)).toMatchObject({ archiveX: -44_000, archiveY: 71_000, groupId: level4.id });
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize();
    const restartedBoard = restarted.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(restartedBoard.groups?.filter((group) => [level1.id, level2.id, level3.id, level4.id].includes(group.id))).toHaveLength(4);
    expect(restartedBoard.archivedItems?.find((item) => item.id === target.id)).toMatchObject({ ...restoreOrigin, archiveX: -44_000, archiveY: 71_000, archiveZIndex: 77 });
    expect(restarted.canUndo()).toBe(false); // history/UI state 不跨重启
    await restarted.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, target.id);
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items.find((item) => item.id === target.id)).toMatchObject(restoreOrigin);
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([expect.objectContaining({ id: edge.id, label: 'daily closure' })]);
  });
});
