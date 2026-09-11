/**
 * @covers F094/unit
 * @covers F094/persistence
 * @covers F094/regression
 * @covers F095/unit
 * @covers F095/persistence
 * @covers F095/regression
 * @covers F099/unit
 * @covers F099/persistence
 * @covers F099/regression
 * @covers F134/unit
 * @covers F134/persistence
 * @covers F134/regression
 * @covers F135/unit
 * @covers F135/persistence
 * @covers F135/regression
 * @covers F136/unit
 * @covers F136/persistence
 * @covers F136/regression
 * @covers F137/unit
 * @covers F137/persistence
 * @covers F137/regression
 * @covers F138/unit
 * @covers F138/persistence
 * @covers F138/regression
 * @covers F139/unit
 * @covers F139/persistence
 * @covers F139/regression
 * @covers F140/unit
 * @covers F140/persistence
 * @covers F140/regression
 * @covers F141/persistence
 * @covers F141/regression
 * @covers F147/unit
 * @covers F147/persistence
 * @covers F147/regression
 * @covers F148/unit
 * @covers F148/persistence
 * @covers F148/regression
 * @covers F151/unit
 * @covers F151/persistence
 * @covers F151/regression
 * @covers F152/unit
 * @covers F152/persistence
 * @covers F152/regression
 */
import {
  DEFAULT_WHITEBOARD_ID,
  DEFAULT_WHITEBOARD_STORE_PATH,
  LEGACY_ASSOCIATION_STORE_PATH,
  WhiteboardItemSchema,
  WhiteboardStore,
  WhiteboardStoreDataSchema,
} from '@core/whiteboard/public';
import type { IPluginStorage } from '@/core/services/StorageService';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function memoryStorage(initial: Record<string, unknown> = {}) {
  const files = new Map<string, unknown>(Object.entries(initial).map(([path, value]) => [path, clone(value)]));
  const storage: IPluginStorage = {
    readJSON: async <T>(path: string): Promise<T | null> => files.has(path) ? clone(files.get(path)) as T : null,
    writeJSON: jest.fn(async (path, value) => { files.set(path, clone(value)); }),
    remove: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, storage };
}

describe('WhiteboardStore 1.1.0', () => {
  it('启动恢复完成前禁止读写；空数据 initialize 不写 whiteboards.json', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    expect(() => store.getBoard(DEFAULT_WHITEBOARD_ID)).toThrow('尚未完成启动恢复');
    await expect(store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-1', { x: 1, y: 2 })).rejects.toThrow('尚未完成启动恢复');
    await store.initialize();
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)).toBeUndefined();
    expect(h.storage.writeJSON).not.toHaveBeenCalled();
  });

  it('schema 只允许 Projection 字段，不接受 Record 内容副本', () => {
    expect(WhiteboardItemSchema.safeParse({ id: 'item-1', recordId: 'rec-1', x: 0, y: 0, title: '禁止复制标题' }).success).toBe(false);
  });

  it('同一 Record 在同一白板默认只产生一个 Projection', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    const first = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-1', { x: 10, y: 20 });
    const writesAfterFirst = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    const second = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-1', { x: 300, y: 400 });
    expect(second.id).toBe(first.id);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toHaveLength(1);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toMatchObject({ x: 10, y: 20 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesAfterFirst);
  });

  it('1.1.6 批量加入在一个 Store mutation 内写盘，并去重同一 Record', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    const added = await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'batch-a', position: { x: -40, y: 20, zIndex: 1 } },
      { recordId: 'batch-b', position: { x: 240, y: 20, zIndex: 2 } },
      { recordId: 'batch-a', position: { x: 999, y: 999, zIndex: 3 } },
    ]);
    expect(added.map((item) => item.recordId)).toEqual(['batch-a', 'batch-b']);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toHaveLength(2);
    expect(h.storage.writeJSON).toHaveBeenCalledTimes(1);
    await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'batch-a', position: { x: 500, y: 500 } },
      { recordId: 'batch-b', position: { x: 600, y: 600 } },
    ]);
    expect(h.storage.writeJSON).toHaveBeenCalledTimes(1);
  });

  it('add/move/edge/remove 全部通过唯一 Store owner 写入 Think/whiteboards.json', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    await store.ensureBoard(DEFAULT_WHITEBOARD_ID, '身体 / 吃东西 / 压力');
    const first = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec.task.1', { x: 10, y: 20 });
    const second = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec.thought.2', { x: 300, y: 40, zIndex: 2 });
    await store.moveItem(DEFAULT_WHITEBOARD_ID, first.id, { x: 100, y: 200, zIndex: 3 });
    const edge = await store.addEdge(DEFAULT_WHITEBOARD_ID, first.id, second.id);
    await store.removeEdge(DEFAULT_WHITEBOARD_ID, edge.id);
    await store.removeItem(DEFAULT_WHITEBOARD_ID, second.id);

    const board = store.getBoard(DEFAULT_WHITEBOARD_ID);
    expect(board?.title).toBe('身体 / 吃东西 / 压力');
    expect(board?.items).toEqual([expect.objectContaining({ recordId: 'rec.task.1', x: 100, y: 200 })]);
    expect(board?.edges).toEqual([]);
    const persisted = h.files.get(DEFAULT_WHITEBOARD_STORE_PATH);
    expect(WhiteboardStoreDataSchema.safeParse(persisted).success).toBe(true);
  });

  it('移出卡片会同步移除 incident edges，但不触碰 canonical Record', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    const a = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-a', { x: 0, y: 0 });
    const b = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-b', { x: 300, y: 0 });
    await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, b.id);
    await store.removeItem(DEFAULT_WHITEBOARD_ID, b.id);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([]);
  });

  it('1.1.7 工作台命名/折叠/整组移动都由 Store 原子持久化，解散只去掉分组关系不删卡片', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '研究台', { x: -500, y: -200 });
    const [member] = await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'grouped-rec', position: { x: -420, y: -120, zIndex: 2 }, groupId: group.id },
    ]);
    await store.renameGroup(DEFAULT_WHITEBOARD_ID, group.id, '研究 / 睡眠');
    await store.setGroupCollapsed(DEFAULT_WHITEBOARD_ID, group.id, true);
    const writesBeforeMove = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await store.moveGroup(DEFAULT_WHITEBOARD_ID, group.id, { x: -300, y: 100 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBeforeMove + 1);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.groups?.[0]).toMatchObject({ id: group.id, title: '研究 / 睡眠', x: -300, y: 100, collapsed: true });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items.find((item) => item.id === member.id)).toMatchObject({ x: -220, y: 180, groupId: group.id });
    await store.removeGroup(DEFAULT_WHITEBOARD_ID, group.id);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toEqual([]);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toMatchObject({ recordId: 'grouped-rec', x: -220, y: 180 });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0].groupId).toBeUndefined();
    expect(WhiteboardStoreDataSchema.safeParse(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).success).toBe(true);
  });

  it('1.1.8 多卡整组移动可保留 membership，也可一次拖入同一 Workbench', async () => {
    const h = memoryStorage();
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '选择测试', { x: -500, y: -300 });
    const [a, b] = await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'select-a', position: { x: -420, y: -220, zIndex: 1 }, groupId: group.id },
      { recordId: 'select-b', position: { x: 100, y: 80, zIndex: 2 } },
    ]);
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.moveItems(DEFAULT_WHITEBOARD_ID, [
      { itemId: a.id, position: { x: -220, y: -120, zIndex: 7 } },
      { itemId: b.id, position: { x: 300, y: 180, zIndex: 2 } },
    ])).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([
      expect.objectContaining({ id: a.id, x: -220, y: -120, zIndex: 7, groupId: group.id }),
      expect.objectContaining({ id: b.id, x: 300, y: 180, zIndex: 2 }),
    ]);
    await expect(store.moveItems(DEFAULT_WHITEBOARD_ID, [
      { itemId: a.id, position: { x: -120, y: -20 } }, { itemId: b.id, position: { x: 400, y: 280 } },
    ], group.id)).resolves.toBe(true);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: a.id, groupId: group.id }), expect.objectContaining({ id: b.id, groupId: group.id }),
    ]));
    await expect(store.moveItems(DEFAULT_WHITEBOARD_ID, [
      { itemId: a.id, position: { x: 0, y: 0 } }, { itemId: 'missing-item', position: { x: 1, y: 1 } },
    ])).resolves.toBe(false);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items.find((item) => item.id === a.id)).toMatchObject({ x: -120, y: -20 });
  });

  it('1.1.8 多选批量移出白板一次写盘，并同步清理所有 incident edges', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const [a, b, c] = await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'remove-a', position: { x: 0, y: 0 } }, { recordId: 'remove-b', position: { x: 300, y: 0 } }, { recordId: 'keep-c', position: { x: 600, y: 0 } },
    ]);
    await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, c.id); await store.addEdge(DEFAULT_WHITEBOARD_ID, c.id, b.id);
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.removeItems(DEFAULT_WHITEBOARD_ID, [a.id, b.id, a.id])).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: c.id })]);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([]);
  });


  it('1.1.9 归档保留原 world/group/zIndex，并把 incident edge 一起挂起；恢复后原位置与可恢复 edge 一并回来', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '归档工作台', { x: -800, y: -500 });
    const [a, b, c] = await store.addRecords(DEFAULT_WHITEBOARD_ID, [
      { recordId: 'archive-a', position: { x: -720, y: -420, zIndex: 9 }, groupId: group.id },
      { recordId: 'archive-b', position: { x: -360, y: -420, zIndex: 4 }, groupId: group.id },
      { recordId: 'archive-c', position: { x: 200, y: 120, zIndex: 2 } },
    ]);
    const ab = await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, b.id); const ac = await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, c.id);
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.archiveItems(DEFAULT_WHITEBOARD_ID, [a.id, b.id])).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    let board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.items).toEqual([expect.objectContaining({ id: c.id })]);
    expect(board.archivedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: a.id, recordId: 'archive-a', x: -720, y: -420, zIndex: 9, groupId: group.id }),
      expect.objectContaining({ id: b.id, recordId: 'archive-b', x: -360, y: -420, zIndex: 4, groupId: group.id }),
    ]));
    expect(board.edges).toEqual([]); expect(board.archivedEdges).toEqual(expect.arrayContaining([ab, ac]));
    await expect(store.addRecord(DEFAULT_WHITEBOARD_ID, 'archive-a', { x: 999, y: 999 })).rejects.toThrow('已归档');
    await expect(store.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, a.id)).resolves.toMatchObject({ id: a.id, x: -720, y: -420, zIndex: 9, groupId: group.id });
    board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.edges).toEqual([expect.objectContaining({ id: ac.id })]);
    expect(board.archivedEdges).toEqual([expect.objectContaining({ id: ab.id })]);
    await store.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, b.id); board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: a.id, x: -720, y: -420 }), expect.objectContaining({ id: b.id, x: -360, y: -420 })]));
    expect(board.edges).toEqual(expect.arrayContaining([expect.objectContaining({ id: ab.id }), expect.objectContaining({ id: ac.id })]));
    expect(board.archivedItems).toBeUndefined(); expect(board.archivedEdges).toBeUndefined();
  });

  it('1.3.1 归档工作台拥有独立 archivePosition，整理归档不会覆盖 Restore origin', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '原工作台', { x: -900, y: -700 });
    const item = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'archive-canvas-rec', { x: -720, y: -510, zIndex: 8 }, group.id);
    await store.archiveItems(DEFAULT_WHITEBOARD_ID, [item.id]);
    let archived = store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems?.[0];
    expect(archived).toMatchObject({ id: item.id, x: -720, y: -510, zIndex: 8, groupId: group.id, archiveX: 48, archiveY: 72 });
    const writesBeforeMove = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.moveArchivedItems(DEFAULT_WHITEBOARD_ID, [{ itemId: item.id, archiveX: 940, archiveY: -360, archiveZIndex: 44 }])).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBeforeMove + 1);
    archived = store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems?.[0];
    expect(archived).toMatchObject({ x: -720, y: -510, groupId: group.id, archiveX: 940, archiveY: -360, archiveZIndex: 44 });
    await expect(store.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, item.id)).resolves.toMatchObject({ x: -720, y: -510, zIndex: 8, groupId: group.id });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toEqual(expect.not.objectContaining({ archiveX: expect.anything() }));
    expect(WhiteboardStoreDataSchema.safeParse(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).success).toBe(true);
  });

  it('1.3.2 极小倍率混选 Card + Workbench 一次原子平移，Workbench 子树只移动一次', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const parent = await store.createGroup(DEFAULT_WHITEBOARD_ID, '父', { x: 100, y: 100 });
    const child = await store.createGroup(DEFAULT_WHITEBOARD_ID, '子', { x: 220, y: 200 }, parent.id);
    const member = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'semantic-member', { x: 280, y: 260 }, child.id);
    const archived = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'semantic-archived', { x: 320, y: 300 }, child.id); await store.archiveItems(DEFAULT_WHITEBOARD_ID, [archived.id]);
    const standalone = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'semantic-standalone', { x: -400, y: -200 });
    const archiveBefore = store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems?.find((entry) => entry.id === archived.id)!;
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.translateNodes(DEFAULT_WHITEBOARD_ID, [member.id, standalone.id], [parent.id, child.id], 50, -30)).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    const board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.groups?.find((entry) => entry.id === parent.id)).toMatchObject({ x: 150, y: 70 });
    expect(board.groups?.find((entry) => entry.id === child.id)).toMatchObject({ x: 270, y: 170 });
    expect(board.items.find((entry) => entry.id === member.id)).toMatchObject({ x: 330, y: 230 });
    expect(board.items.find((entry) => entry.id === standalone.id)).toMatchObject({ x: -350, y: -230 });
    const archivedAfter = board.archivedItems?.find((entry) => entry.id === archived.id)!;
    expect(archivedAfter).toMatchObject({ x: 370, y: 270, archiveX: archiveBefore.archiveX, archiveY: archiveBefore.archiveY });
  });

  it('1.3.5 低倍率 mixed arrange 用一次 moveNodes 原子移动 Card + Workbench subtree', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '概览整理组', { x: 100, y: 200 });
    const member = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'overview-member', { x: 180, y: 280 }, group.id);
    const standalone = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'overview-standalone', { x: 900, y: 700, zIndex: 5 });
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.moveNodes(DEFAULT_WHITEBOARD_ID, [{ itemId: standalone.id, position: { x: -300, y: -100, zIndex: 5 } }], [{ groupId: group.id, position: { x: 300, y: -100 } }])).resolves.toBe(true);
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    const board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.groups?.find((entry) => entry.id === group.id)).toMatchObject({ x: 300, y: -100 });
    expect(board.items.find((entry) => entry.id === member.id)).toMatchObject({ x: 380, y: -20, groupId: group.id });
    expect(board.items.find((entry) => entry.id === standalone.id)).toMatchObject({ x: -300, y: -100, zIndex: 5 });
    expect(WhiteboardStoreDataSchema.safeParse(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).success).toBe(true);
  });

  it('1.3.6 Restore 后一次 Undo 精确回到归档状态，并保留 Archive placement / Restore origin / membership / edge', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'Daily Closure', { x: -1200, y: 800 });
    const a = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'daily-closure-a', { x: -980, y: 930, zIndex: 7 }, group.id);
    const b = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'daily-closure-b', { x: -620, y: 930, zIndex: 8 }, group.id);
    const edge = await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, b.id); await store.updateEdgeLabel(DEFAULT_WHITEBOARD_ID, edge.id, 'closure-link');
    await store.archiveItems(DEFAULT_WHITEBOARD_ID, [a.id]);
    await store.moveArchivedItems(DEFAULT_WHITEBOARD_ID, [{ itemId: a.id, archiveX: 1440, archiveY: -620, archiveZIndex: 31 }]);
    const archivedBeforeRestore = store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems?.find((item) => item.id === a.id);
    expect(archivedBeforeRestore).toMatchObject({ id: a.id, x: -980, y: 930, zIndex: 7, groupId: group.id, archiveX: 1440, archiveY: -620, archiveZIndex: 31 });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedEdges).toEqual([expect.objectContaining({ id: edge.id, label: 'closure-link' })]);

    await expect(store.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, a.id)).resolves.toMatchObject({ id: a.id, x: -980, y: 930, zIndex: 7, groupId: group.id });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([expect.objectContaining({ id: edge.id, label: 'closure-link' })]);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems).toBeUndefined();

    const writesBeforeUndo = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.undo()).resolves.toBe(true);
    let board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBeforeUndo + 1);
    expect(board.items.some((item) => item.id === a.id)).toBe(false);
    expect(board.archivedItems?.find((item) => item.id === a.id)).toMatchObject({ x: -980, y: 930, zIndex: 7, groupId: group.id, archiveX: 1440, archiveY: -620, archiveZIndex: 31 });
    expect(board.archivedEdges).toEqual([expect.objectContaining({ id: edge.id, label: 'closure-link' })]);

    await expect(store.redo()).resolves.toBe(true); board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.items.find((item) => item.id === a.id)).toMatchObject({ x: -980, y: 930, zIndex: 7, groupId: group.id });
    expect(board.edges).toEqual([expect.objectContaining({ id: edge.id, label: 'closure-link' })]);
    expect(WhiteboardStoreDataSchema.safeParse(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).success).toBe(true);
  });

  it('1.2.0 Undo / Redo 只记录用户 mutation，并把回退后的 snapshot 再次持久化', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    await store.ensureBoard(DEFAULT_WHITEBOARD_ID);
    expect(store.canUndo()).toBe(false);
    const item = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'history-a', { x: 10, y: 20 });
    await store.moveItem(DEFAULT_WHITEBOARD_ID, item.id, { x: 400, y: -200 });
    expect(store.canUndo()).toBe(true); expect(store.canRedo()).toBe(false);
    const writesBeforeUndo = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await expect(store.undo()).resolves.toBe(true);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toMatchObject({ x: 10, y: 20 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBeforeUndo + 1);
    expect(store.canRedo()).toBe(true);
    await expect(store.redo()).resolves.toBe(true);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toMatchObject({ x: 400, y: -200 });
    await store.undo(); await store.addRecord(DEFAULT_WHITEBOARD_ID, 'history-b', { x: 0, y: 0 });
    expect(store.canRedo()).toBe(false);
  });

  it('1.2.1 Workbench 最多四层嵌套；父工作台移动原子平移后代与归档成员，禁止循环重挂', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const a = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'A', { x: 0, y: 0 });
    const b = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'B', { x: 100, y: 100 }, a.id);
    const c = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'C', { x: 200, y: 200 }, b.id);
    const d = await store.createGroup(DEFAULT_WHITEBOARD_ID, 'D', { x: 300, y: 300 }, c.id);
    await expect(store.createGroup(DEFAULT_WHITEBOARD_ID, 'E', { x: 400, y: 400 }, d.id)).rejects.toThrow('最多嵌套 4 层');
    const member = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'nested-active', { x: 340, y: 360 }, d.id);
    const archived = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'nested-archived', { x: 380, y: 390 }, c.id);
    await store.archiveItems(DEFAULT_WHITEBOARD_ID, [archived.id]);
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await store.moveGroup(DEFAULT_WHITEBOARD_ID, a.id, { x: -500, y: -250 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    const board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.groups?.find((group) => group.id === d.id)).toMatchObject({ x: -200, y: 50, parentGroupId: c.id });
    expect(board.items.find((item) => item.id === member.id)).toMatchObject({ x: -160, y: 110, groupId: d.id });
    expect(board.archivedItems?.find((item) => item.id === archived.id)).toMatchObject({ x: -120, y: 140, groupId: c.id });
    await expect(store.moveGroup(DEFAULT_WHITEBOARD_ID, a.id, { x: -500, y: -250 }, d.id)).rejects.toThrow('不能循环嵌套');
  });

  it('1.2.4 从多选创建 Workbench 是一次原子 mutation，Undo 一步恢复原 membership', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const a = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'wrap-a', { x: -200, y: 40 }); const b = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'wrap-b', { x: 160, y: 80 });
    const writesBefore = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    const group = await store.createGroupFromItems(DEFAULT_WHITEBOARD_ID, '整理组', [a.id, b.id], { x: -230, y: -30 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBefore + 1);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: a.id, groupId: group.id }), expect.objectContaining({ id: b.id, groupId: group.id })]));
    await store.undo(); const board = store.getBoard(DEFAULT_WHITEBOARD_ID)!; expect(board.groups).toBeUndefined(); expect(board.items.every((item) => !item.groupId)).toBe(true);
  });

  it('1.2.2/1.2.3 标注与连线文字可持久化；父 Workbench 移动时标注跟随，Undo 可整体撤回', async () => {
    const h = memoryStorage(); const store = new WhiteboardStore(h.storage); await store.initialize();
    const group = await store.createGroup(DEFAULT_WHITEBOARD_ID, '注释区', { x: -400, y: -300 });
    const annotation = await store.createAnnotation(DEFAULT_WHITEBOARD_ID, 'sticky', '第一版便签', { x: -320, y: -220, zIndex: 6 }, group.id);
    const a = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'label-a', { x: -280, y: -40 }, group.id);
    const b = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'label-b', { x: 60, y: -40 }, group.id);
    const edge = await store.addEdge(DEFAULT_WHITEBOARD_ID, a.id, b.id);
    await expect(store.updateEdgeLabel(DEFAULT_WHITEBOARD_ID, edge.id, '支持')).resolves.toBe(true);
    await expect(store.updateAnnotation(DEFAULT_WHITEBOARD_ID, annotation.id, '研究假设')).resolves.toBe(true);
    const writesBeforeMove = (h.storage.writeJSON as jest.Mock).mock.calls.length;
    await store.moveGroup(DEFAULT_WHITEBOARD_ID, group.id, { x: -100, y: 100 });
    expect((h.storage.writeJSON as jest.Mock).mock.calls.length).toBe(writesBeforeMove + 1);
    let board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.annotations?.[0]).toMatchObject({ id: annotation.id, kind: 'sticky', text: '研究假设', x: -20, y: 180, groupId: group.id });
    expect(board.edges[0]).toMatchObject({ id: edge.id, label: '支持' });
    expect(WhiteboardStoreDataSchema.safeParse(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).success).toBe(true);
    await store.undo(); board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.annotations?.[0]).toMatchObject({ x: -320, y: -220, text: '研究假设' });
    await store.removeGroup(DEFAULT_WHITEBOARD_ID, group.id); board = store.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.annotations?.[0].groupId).toBeUndefined();
  });

  it('1.1.7 schema 拒绝重复工作台 ID 和悬空 groupId，避免恢复出不可操作分组', () => {
    const duplicateGroups = { version: 1, boards: { board: { title: '白板', items: [], edges: [], groups: [
      { id: 'group-1', title: 'A', x: 0, y: 0, collapsed: false },
      { id: 'group-1', title: 'B', x: 10, y: 10, collapsed: false },
    ], modified: 1 } } };
    expect(WhiteboardStoreDataSchema.safeParse(duplicateGroups).success).toBe(false);
    const dangling = { version: 1, boards: { board: { title: '白板', items: [
      { id: 'item-1', recordId: 'rec-1', x: 0, y: 0, groupId: 'missing-group' },
    ], edges: [], groups: [], modified: 1 } } };
    expect(WhiteboardStoreDataSchema.safeParse(dangling).success).toBe(false);
  });

  it('1.1.6 旧 whiteboards.json 没有 groups/groupId 仍可直接恢复', async () => {
    const legacy116 = { version: 1, boards: { [DEFAULT_WHITEBOARD_ID]: { title: '白板', items: [{ id: 'old-item', recordId: 'old-rec', x: -10, y: 20 }], edges: [], modified: 1 } } };
    const h = memoryStorage({ [DEFAULT_WHITEBOARD_STORE_PATH]: legacy116 });
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0]).toMatchObject({ id: 'old-item', x: -10, y: 20 });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toBeUndefined();
    expect(h.storage.writeJSON).not.toHaveBeenCalled();
  });

  it('历史 Association 测试数据在新白板成功恢复后清理，不参与迁移', async () => {
    const legacy = { version: 1, spaces: { legacy: { items: [{ id: 'old', recordId: 'old-rec', x: 1, y: 2 }], edges: [], modified: 1 } } };
    const h = memoryStorage({ [LEGACY_ASSOCIATION_STORE_PATH]: legacy });
    const store = new WhiteboardStore(h.storage);
    await store.initialize();
    expect(h.files.has(LEGACY_ASSOCIATION_STORE_PATH)).toBe(false);
    expect(h.storage.remove).toHaveBeenCalledWith(LEGACY_ASSOCIATION_STORE_PATH);
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)).toBeUndefined();
  });

  it('schema-invalid whiteboards.json fail-closed，禁止把坏文件当空白板覆盖', async () => {
    const bad = { version: 1, boards: { board: { title: '坏白板', items: 'broken', edges: [], modified: 0 } } };
    const h = memoryStorage({ [DEFAULT_WHITEBOARD_STORE_PATH]: bad });
    const store = new WhiteboardStore(h.storage);
    await expect(store.initialize()).rejects.toThrow('白板数据格式无效');
    expect(store.getStatus()).toEqual(expect.objectContaining({ state: 'error' }));
    await expect(store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-new', { x: 0, y: 0 })).rejects.toThrow('初始化失败');
    expect(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)).toEqual(bad);
    expect(h.files.get('Think/whiteboards.corrupt.json')).toEqual(bad);
  });

  it('写盘失败 reject 且不发布假成功内存状态', async () => {
    const files = new Map<string, unknown>();
    let failWrites = true;
    const storage: IPluginStorage = {
      readJSON: async <T>(path: string): Promise<T | null> => files.has(path) ? clone(files.get(path)) as T : null,
      writeJSON: jest.fn(async (path, value) => { if (failWrites) throw new Error('模拟磁盘写入失败'); files.set(path, clone(value)); }),
      remove: jest.fn(async () => undefined),
    };
    const store = new WhiteboardStore(storage);
    await store.initialize();
    await expect(store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-failed', { x: 1, y: 2 })).rejects.toThrow('白板数据写入失败');
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)).toBeUndefined();
    failWrites = false;
    await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-ok', { x: 3, y: 4 });
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0].recordId).toBe('rec-ok');
  });
});
