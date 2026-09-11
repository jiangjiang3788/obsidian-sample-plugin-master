/**
 * @covers F094/integration
 * @covers F094/persistence
 * @covers F094/regression
 * @covers F095/integration
 * @covers F095/persistence
 * @covers F095/regression
 * @covers F098/integration
 * @covers F098/persistence
 * @covers F098/regression
 * @covers F134/integration
 * @covers F134/persistence
 * @covers F134/restart
 * @covers F134/regression
 * @covers F135/integration
 * @covers F135/persistence
 * @covers F135/restart
 * @covers F135/regression
 * @covers F136/integration
 * @covers F136/persistence
 * @covers F136/restart
 * @covers F136/regression
 * @covers F138/integration
 * @covers F138/persistence
 * @covers F138/restart
 * @covers F138/regression
 * @covers F139/integration
 * @covers F139/persistence
 * @covers F139/restart
 * @covers F139/regression
 * @covers F140/integration
 * @covers F140/persistence
 * @covers F140/restart
 * @covers F140/regression
 * @covers F146/integration
 * @covers F146/persistence
 * @covers F146/restart
 * @covers F146/regression
 * @covers F147/integration
 * @covers F147/persistence
 * @covers F147/restart
 * @covers F147/regression
 * @covers F148/integration
 * @covers F148/persistence
 * @covers F148/restart
 * @covers F148/regression
 */
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_STORE_PATH, WhiteboardStore } from '@core/whiteboard/public';
import type { WhiteboardStoreData } from '@core/whiteboard/public';
import type { IPluginStorage } from '@/core/services/StorageService';

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

describe('WhiteboardStore restart lifecycle', () => {
  it('独立 Whiteboard ID 恢复 cards/坐标/zIndex，dangling recordId 继续保留', async () => {
    const h = persistentMemoryStorage();
    const first = new WhiteboardStore(h.storage);
    await first.initialize();
    const item = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'rec.missing.but-preserved', { x: 10, y: 20 });
    await first.moveItem(DEFAULT_WHITEBOARD_ID, item.id, { x: -310, y: -45, zIndex: 7 });
    first.dispose();

    const persisted = h.files.get(DEFAULT_WHITEBOARD_STORE_PATH) as WhiteboardStoreData | undefined;
    expect(Object.keys(persisted?.boards ?? {})).toEqual([DEFAULT_WHITEBOARD_ID]);
    expect(persisted?.boards[DEFAULT_WHITEBOARD_ID]?.items[0]).toMatchObject({ recordId: 'rec.missing.but-preserved', x: -310, y: -45, zIndex: 7 });

    const restarted = new WhiteboardStore(h.storage);
    await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: item.id, recordId: 'rec.missing.but-preserved', x: -310, y: -45, zIndex: 7 })]);
  });

  it('directed edge restart 后保持 identity 与方向', async () => {
    const h = persistentMemoryStorage();
    const first = new WhiteboardStore(h.storage);
    await first.initialize();
    const from = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-a', { x: 10, y: 20 });
    const to = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-b', { x: 300, y: 80 });
    const edge = await first.addEdge(DEFAULT_WHITEBOARD_ID, from.id, to.id);
    first.dispose();

    const restarted = new WhiteboardStore(h.storage);
    await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([{ id: edge.id, fromItemId: from.id, toItemId: to.id }]);
  });
  it('1.1.8 多选本身不持久化，但整组移动后的 durable XY 在重启后恢复', async () => {
    const h = persistentMemoryStorage();
    const first = new WhiteboardStore(h.storage);
    await first.initialize();
    const a = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'multi-a', { x: -100, y: 20 });
    const b = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'multi-b', { x: 300, y: 120 });
    await first.moveItems(DEFAULT_WHITEBOARD_ID, [
      { itemId: a.id, position: { x: -350, y: -180, zIndex: 5 } },
      { itemId: b.id, position: { x: 50, y: -80 } },
    ]);
    first.dispose();
    const persisted = h.files.get(DEFAULT_WHITEBOARD_STORE_PATH) as WhiteboardStoreData;
    expect(JSON.stringify(persisted)).not.toContain('selected');
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: a.id, x: -350, y: -180, zIndex: 5 }),
      expect.objectContaining({ id: b.id, x: 50, y: -80 }),
    ]));
  });


  it('1.1.9 归档 Projection 与原 world 位置跨重启恢复；再次 restore 后回到同一坐标', async () => {
    const h = persistentMemoryStorage(); const first = new WhiteboardStore(h.storage); await first.initialize();
    const item = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'archive-restart', { x: -640, y: 275, zIndex: 8 });
    await first.archiveItems(DEFAULT_WHITEBOARD_ID, [item.id]);
    await first.moveArchivedItems(DEFAULT_WHITEBOARD_ID, [{ itemId: item.id, archiveX: 1200, archiveY: -800, archiveZIndex: 19 }]); first.dispose();
    const persisted = h.files.get(DEFAULT_WHITEBOARD_STORE_PATH) as WhiteboardStoreData;
    expect(persisted.boards[DEFAULT_WHITEBOARD_ID]?.items).toEqual([]);
    expect(persisted.boards[DEFAULT_WHITEBOARD_ID]?.archivedItems).toEqual([expect.objectContaining({ id: item.id, x: -640, y: 275, zIndex: 8, archiveX: 1200, archiveY: -800, archiveZIndex: 19 })]);
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedItems).toEqual([expect.objectContaining({ id: item.id, x: -640, y: 275, zIndex: 8, archiveX: 1200, archiveY: -800 })]);
    await restarted.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, item.id);
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: item.id, x: -640, y: 275, zIndex: 8 })]);
  });

  it('1.1.7 工作台名称/折叠/成员关系与整组移动位置在重启后恢复', async () => {
    const h = persistentMemoryStorage();
    const first = new WhiteboardStore(h.storage);
    await first.initialize();
    const group = await first.createGroup(DEFAULT_WHITEBOARD_ID, '长期研究', { x: -600, y: -300 });
    const [member] = await first.addRecords(DEFAULT_WHITEBOARD_ID, [{ recordId: 'rec-grouped', position: { x: -520, y: -220 }, groupId: group.id }]);
    await first.setGroupCollapsed(DEFAULT_WHITEBOARD_ID, group.id, true);
    await first.moveGroup(DEFAULT_WHITEBOARD_ID, group.id, { x: -400, y: -100 });
    first.dispose();

    const restarted = new WhiteboardStore(h.storage);
    await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toEqual([expect.objectContaining({ id: group.id, title: '长期研究', x: -400, y: -100, collapsed: true })]);
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: member.id, recordId: 'rec-grouped', x: -320, y: -20, groupId: group.id })]);
  });

  it('1.2.1 四层 Workbench parentGroupId 与后代 world 位置在重启后保持', async () => {
    const h = persistentMemoryStorage(); const first = new WhiteboardStore(h.storage); await first.initialize();
    const a = await first.createGroup(DEFAULT_WHITEBOARD_ID, 'A', { x: -800, y: -400 });
    const b = await first.createGroup(DEFAULT_WHITEBOARD_ID, 'B', { x: -600, y: -250 }, a.id);
    const c = await first.createGroup(DEFAULT_WHITEBOARD_ID, 'C', { x: -400, y: -100 }, b.id);
    const d = await first.createGroup(DEFAULT_WHITEBOARD_ID, 'D', { x: -200, y: 50 }, c.id);
    const item = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'nested-restart', { x: -120, y: 130 }, d.id);
    first.dispose();
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: b.id, parentGroupId: a.id }), expect.objectContaining({ id: c.id, parentGroupId: b.id }), expect.objectContaining({ id: d.id, parentGroupId: c.id }),
    ]));
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: item.id, groupId: d.id, x: -120, y: 130 })]);
  });

  it('1.3.2 mixed semantic selection 的 durable 平移结果跨重启保持，selection 本身不持久化', async () => {
    const h = persistentMemoryStorage(); const first = new WhiteboardStore(h.storage); await first.initialize();
    const group = await first.createGroup(DEFAULT_WHITEBOARD_ID, '语义鸟瞰组', { x: 100, y: 100 });
    const member = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'semantic-restart-member', { x: 180, y: 180 }, group.id);
    const standalone = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'semantic-restart-root', { x: -300, y: 40 });
    await first.translateNodes(DEFAULT_WHITEBOARD_ID, [standalone.id], [group.id], 75, -25); first.dispose();
    const persistedText = JSON.stringify(h.files.get(DEFAULT_WHITEBOARD_STORE_PATH)); expect(persistedText).not.toContain('selectedGroupIds'); expect(persistedText).not.toContain('semanticDragDelta');
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize(); const board = restarted.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.groups?.find((entry) => entry.id === group.id)).toMatchObject({ x: 175, y: 75 });
    expect(board.items.find((entry) => entry.id === member.id)).toMatchObject({ x: 255, y: 155, groupId: group.id });
    expect(board.items.find((entry) => entry.id === standalone.id)).toMatchObject({ x: -225, y: 15 });
  });

  it('1.2.2/1.2.3 空间标注与 Edge label 跨重启保持，兼容旧 version:1 数据', async () => {
    const h = persistentMemoryStorage(); const first = new WhiteboardStore(h.storage); await first.initialize();
    const group = await first.createGroup(DEFAULT_WHITEBOARD_ID, '注释容器', { x: -500, y: -200 });
    const note = await first.createAnnotation(DEFAULT_WHITEBOARD_ID, 'text', '核心假设', { x: -410, y: -120 }, group.id);
    const a = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'edge-label-a', { x: -350, y: 50 }, group.id);
    const b = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'edge-label-b', { x: 20, y: 50 }, group.id);
    const edge = await first.addEdge(DEFAULT_WHITEBOARD_ID, a.id, b.id); await first.updateEdgeLabel(DEFAULT_WHITEBOARD_ID, edge.id, '依赖'); first.dispose();
    const restarted = new WhiteboardStore(h.storage); await restarted.initialize(); const board = restarted.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.annotations).toEqual([expect.objectContaining({ id: note.id, kind: 'text', text: '核心假设', x: -410, y: -120, groupId: group.id })]);
    expect(board.edges).toEqual([expect.objectContaining({ id: edge.id, label: '依赖' })]);
  });

  it('1.3.0 四层嵌套 × 归档 × 父树移动 × Edge/Annotation × Restore × Restart 保持一致', async () => {
    const h = persistentMemoryStorage(); const first = new WhiteboardStore(h.storage); await first.initialize();
    const a = await first.createGroup(DEFAULT_WHITEBOARD_ID, '稳定性 A', { x: -1200, y: -700 });
    const b = await first.createGroup(DEFAULT_WHITEBOARD_ID, '稳定性 B', { x: -900, y: -500 }, a.id);
    const c = await first.createGroup(DEFAULT_WHITEBOARD_ID, '稳定性 C', { x: -600, y: -300 }, b.id);
    const d = await first.createGroup(DEFAULT_WHITEBOARD_ID, '稳定性 D', { x: -300, y: -100 }, c.id);
    const lead = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'stability-lead', { x: -220, y: 20, zIndex: 11 }, d.id);
    const mate = await first.addRecord(DEFAULT_WHITEBOARD_ID, 'stability-mate', { x: 180, y: 80, zIndex: 12 }, d.id);
    const note = await first.createAnnotation(DEFAULT_WHITEBOARD_ID, 'sticky', '四层稳定性', { x: 80, y: 320, zIndex: 13 }, d.id);
    const edge = await first.addEdge(DEFAULT_WHITEBOARD_ID, lead.id, mate.id); await first.updateEdgeLabel(DEFAULT_WHITEBOARD_ID, edge.id, '跨层保持');

    await first.archiveItems(DEFAULT_WHITEBOARD_ID, [lead.id]);
    expect(first.getBoard(DEFAULT_WHITEBOARD_ID)?.archivedEdges).toEqual([expect.objectContaining({ id: edge.id, label: '跨层保持' })]);
    await first.moveGroup(DEFAULT_WHITEBOARD_ID, a.id, { x: 300, y: 100 });
    const moved = first.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(moved.archivedItems).toEqual([expect.objectContaining({ id: lead.id, groupId: d.id, x: 1280, y: 820 })]);
    expect(moved.items).toEqual([expect.objectContaining({ id: mate.id, groupId: d.id, x: 1680, y: 880 })]);
    expect(moved.annotations).toEqual([expect.objectContaining({ id: note.id, groupId: d.id, x: 1580, y: 1120 })]);

    const restored = await first.restoreArchivedItem(DEFAULT_WHITEBOARD_ID, lead.id);
    expect(restored).toMatchObject({ id: lead.id, groupId: d.id, x: 1280, y: 820, zIndex: 11 });
    expect(first.getBoard(DEFAULT_WHITEBOARD_ID)?.edges).toEqual([expect.objectContaining({ id: edge.id, fromItemId: lead.id, toItemId: mate.id, label: '跨层保持' })]);
    first.dispose();

    const restarted = new WhiteboardStore(h.storage); await restarted.initialize(); const board = restarted.getBoard(DEFAULT_WHITEBOARD_ID)!;
    expect(board.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: a.id, x: 300, y: 100 }),
      expect.objectContaining({ id: b.id, parentGroupId: a.id, x: 600, y: 300 }),
      expect.objectContaining({ id: c.id, parentGroupId: b.id, x: 900, y: 500 }),
      expect.objectContaining({ id: d.id, parentGroupId: c.id, x: 1200, y: 700 }),
    ]));
    expect(board.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: lead.id, groupId: d.id, x: 1280, y: 820, zIndex: 11 }),
      expect.objectContaining({ id: mate.id, groupId: d.id, x: 1680, y: 880, zIndex: 12 }),
    ]));
    expect(board.annotations).toEqual([expect.objectContaining({ id: note.id, groupId: d.id, x: 1580, y: 1120, text: '四层稳定性' })]);
    expect(board.edges).toEqual([expect.objectContaining({ id: edge.id, label: '跨层保持' })]);
    expect(board.archivedItems ?? []).toEqual([]); expect(board.archivedEdges ?? []).toEqual([]);
  });

});
