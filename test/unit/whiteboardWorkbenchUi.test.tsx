/**
 * @covers F134/ui
 * @covers F134/regression
 * @covers F137/ui
 * @covers F137/regression
 * @covers F138/ui
 * @covers F138/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string): RecordViewItem {
  return { id, coreBlock: 'thought', title: id, content: `${id} content`, tags: [], categoryKey: 'thought', goalPath: '测试', date: '2026-09-08', created: 0, modified: 0, extra: {} };
}

function fakeStore(initial: WhiteboardBoard) {
  let board = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const update = (next: WhiteboardBoard) => { board = next; notify(); };
  return {
    getStatus: () => ({ state: 'ready' as const }),
    getBoard: () => ({ ...board, items: board.items.map((item) => ({ ...item })), edges: board.edges.map((edge) => ({ ...edge })), groups: board.groups?.map((group) => ({ ...group })) }),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(),
    addRecords: jest.fn(),
    moveItem: jest.fn(async (_boardId: string, itemId: string, position: { x: number; y: number; zIndex?: number }, groupId?: string | null) => {
      update({ ...board, items: board.items.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...position };
        if (groupId === null) delete next.groupId;
        else if (groupId) next.groupId = groupId;
        return next;
      }), modified: Date.now() });
      return true;
    }),
    removeItem: jest.fn(async () => false),
    addEdge: jest.fn(),
    removeEdge: jest.fn(async () => false),
    createGroup: jest.fn(async (_boardId: string, title: string, position: { x: number; y: number }, parentGroupId?: string | null) => {
      const group = { id: `group-${(board.groups?.length ?? 0) + 1}`, title, ...position, collapsed: false, ...(parentGroupId ? { parentGroupId } : {}) };
      update({ ...board, groups: [...(board.groups ?? []), group], modified: Date.now() });
      return group;
    }),
    renameGroup: jest.fn(async (_boardId: string, groupId: string, title: string) => {
      update({ ...board, groups: (board.groups ?? []).map((group) => group.id === groupId ? { ...group, title } : group), modified: Date.now() }); return true;
    }),
    setGroupCollapsed: jest.fn(async (_boardId: string, groupId: string, collapsed: boolean) => {
      update({ ...board, groups: (board.groups ?? []).map((group) => group.id === groupId ? { ...group, collapsed } : group), modified: Date.now() }); return true;
    }),
    moveGroup: jest.fn(async () => true),
    canUndo: () => true,
    canRedo: () => false,
    undo: jest.fn(async () => true),
    redo: jest.fn(async () => true),
    removeGroup: jest.fn(async (_boardId: string, groupId: string) => {
      update({ ...board, groups: (board.groups ?? []).filter((group) => group.id !== groupId), items: board.items.map((item) => item.groupId === groupId ? { ...item, groupId: undefined } : item), modified: Date.now() }); return true;
    }),
  } as unknown as WhiteboardStore;
}

describe('Whiteboard Workbench 1.1.7 UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('工作台可折叠/展开并隐藏成员卡与相关 edge，find/Record Source 真源不被改写', async () => {
    const a = record('rec-a'); const b = record('rec-b');
    const store = fakeStore({
      title: '白板', modified: 1,
      groups: [{ id: 'group-a', title: '研究台', x: 0, y: 0, collapsed: false }],
      items: [{ id: 'item-a', recordId: a.id, x: 80, y: 80, groupId: 'group-a' }, { id: 'item-b', recordId: b.id, x: 900, y: 80 }],
      edges: [{ id: 'edge-a', fromItemId: 'item-a', toItemId: 'item-b' }],
    });
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    expect(host.querySelector('[data-whiteboard-group-id="group-a"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-edge-id="edge-a"]')).toBeTruthy();
    const collapse = host.querySelector('button[aria-label="折叠工作台"]') as HTMLButtonElement;
    await act(async () => { collapse.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-whiteboard-group-collapsed="true"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')).toBeNull();
    expect(host.querySelector('[data-whiteboard-edge-id="edge-a"]')).toBeNull();
    expect(host.querySelector('[data-whiteboard-source-record-id="rec-a"]')).toBeNull();
    const expand = host.querySelector('button[aria-label="展开工作台"]') as HTMLButtonElement;
    await act(async () => { expand.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')).toBeTruthy();
  });

  test('工作台可重命名；成员可显式移出工作台但保留白板卡片；新建按钮创建独立工作台', async () => {
    const a = record('rec-a');
    const store = fakeStore({
      title: '白板', modified: 1,
      groups: [{ id: 'group-a', title: '研究台', x: 0, y: 0, collapsed: false }],
      items: [{ id: 'item-a', recordId: a.id, x: 80, y: 80, groupId: 'group-a' }], edges: [],
    });
    await act(async () => render(<WhiteboardWorkspace records={[a]} whiteboardStore={store} />, host));
    const rename = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '重命名') as HTMLButtonElement;
    await act(async () => rename.click());
    const input = host.querySelector('input[aria-label="工作台名称"]') as HTMLInputElement;
    await act(async () => { input.value = '睡眠研究'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain('睡眠研究');
    const removeFromGroup = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '移出工作台') as HTMLButtonElement;
    await act(async () => { removeFromGroup.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')).toBeTruthy();
    expect((store.moveItem as jest.Mock).mock.calls.at(-1)?.[3]).toBeNull();
    const create = host.querySelector('button[aria-label="新建工作台"]') as HTMLButtonElement;
    await act(async () => { create.click(); await Promise.resolve(); });
    expect((store.createGroup as jest.Mock)).toHaveBeenCalled();
    expect(host.querySelectorAll('[data-whiteboard-group-id]').length).toBe(2);
  });
  test('1.2.0 工具栏提供 Undo / Redo，Ctrl/⌘+Z 走白板历史而不是修改 Record', async () => {
    const a = record('rec-history');
    const store = fakeStore({ title: '白板', modified: 1, items: [{ id: 'item-a', recordId: a.id, x: 0, y: 0 }], edges: [] });
    await act(async () => render(<WhiteboardWorkspace records={[a]} whiteboardStore={store} />, host));
    const undo = host.querySelector('button[aria-label="撤销白板操作"]') as HTMLButtonElement;
    const redo = host.querySelector('button[aria-label="重做白板操作"]') as HTMLButtonElement;
    expect(undo.disabled).toBe(false); expect(redo.disabled).toBe(true);
    await act(async () => { undo.click(); await Promise.resolve(); });
    expect(store.undo).toHaveBeenCalledTimes(1);
    await act(async () => { host.querySelector('.think-whiteboard-workspace')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await Promise.resolve(); });
    expect(store.undo).toHaveBeenCalledTimes(2);
  });

  test('1.2.1 Workbench 可进入同尺寸子画布、显示 breadcrumb，并在当前 Workbench 内继续创建子工作台', async () => {
    const a = record('rec-nested');
    const store = fakeStore({
      title: '白板', modified: 1,
      groups: [
        { id: 'group-a', title: '产品', x: 0, y: 0, collapsed: false },
        { id: 'group-b', title: '研究', x: 100, y: 100, collapsed: false, parentGroupId: 'group-a' },
      ],
      items: [{ id: 'item-a', recordId: a.id, x: 160, y: 180, groupId: 'group-b' }], edges: [],
    });
    await act(async () => render(<WhiteboardWorkspace records={[a]} whiteboardStore={store} />, host));
    const parent = host.querySelector('[data-whiteboard-group-id="group-a"]') as HTMLElement;
    const enter = parent.querySelector('button[aria-label="全屏进入工作台"]') as HTMLButtonElement;
    await act(async () => { enter.click(); await Promise.resolve(); });
    expect(host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-active-group-id')).toBe('group-a');
    expect(host.querySelector('[data-whiteboard-group-id="group-a"]')).toBeNull();
    expect(host.querySelector('[data-whiteboard-group-id="group-b"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-breadcrumb-group-id="group-a"]')?.textContent).toBe('产品');
    const create = host.querySelector('button[aria-label="新建工作台"]') as HTMLButtonElement;
    await act(async () => { create.click(); await Promise.resolve(); });
    expect((store.createGroup as jest.Mock).mock.calls.at(-1)?.[3]).toBe('group-a');
  });

});
