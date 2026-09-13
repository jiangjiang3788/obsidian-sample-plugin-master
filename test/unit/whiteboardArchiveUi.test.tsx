/**
 * @covers F136/ui
 * @covers F136/regression
 * @covers F146/ui
 * @covers F146/regression
 * @covers F147/ui
 * @covers F147/regression
 * @covers F149/ui
 * @covers F153/ui
 * @covers F153/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, type WhiteboardBoard, type WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string): RecordViewItem {
  return { id, recordType: 'thought', title: id, content: `${id} 内容`, tags: [], goalPath: '主题', date: '2026-09-08', created: 0, modified: 0, extra: {} } as RecordViewItem;
}

function fakeStore(board: WhiteboardBoard): WhiteboardStore & Record<string, jest.Mock> {
  return {
    getStatus: jest.fn(() => ({ state: 'ready' as const })),
    getBoard: jest.fn(() => JSON.parse(JSON.stringify(board)) as WhiteboardBoard),
    subscribe: jest.fn(() => () => undefined), ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(), addRecords: jest.fn(), moveItem: jest.fn(), moveItems: jest.fn(), moveArchivedItems: jest.fn(async () => true), translateNodes: jest.fn(async () => true), removeItem: jest.fn(), removeItems: jest.fn(),
    archiveItems: jest.fn(async () => true), restoreArchivedItem: jest.fn(async (_boardId: string, itemId: string) => {
      const archived = board.archivedItems?.find((item) => item.id === itemId); if (!archived) return null;
      const { archivedAt: _archivedAt, archiveX: _archiveX, archiveY: _archiveY, archiveZIndex: _archiveZIndex, ...item } = archived; return item;
    }),
    createGroup: jest.fn(), renameGroup: jest.fn(), setGroupCollapsed: jest.fn(), moveGroup: jest.fn(), removeGroup: jest.fn(), bringItemToFront: jest.fn(),
    addEdge: jest.fn(), removeEdge: jest.fn(),
  } as unknown as WhiteboardStore & Record<string, jest.Mock>;
}

describe('白板 Archive / Restore UI 1.1.9', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('归档入口隐藏 Projection；归档箱可按原 world 坐标恢复，归档 Record 不回到左侧候选', async () => {
    const active = record('active-record'); const archivedRecord = record('archived-record');
    const board: WhiteboardBoard = {
      title: '白板', modified: 1, edges: [], items: [{ id: 'item-active', recordId: active.id, x: 20, y: 30 }],
      archivedItems: [{ id: 'item-archived', recordId: archivedRecord.id, x: -500, y: -300, zIndex: 7, archivedAt: 10 }],
    };
    const store = fakeStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[active, archivedRecord]} whiteboardStore={store} />, host));

    expect(host.querySelector('[data-whiteboard-source-record-id="archived-record"]')).toBeNull();
    const activeCard = host.querySelector('[data-whiteboard-item-id="item-active"]') as HTMLElement;
    expect(activeCard.textContent).not.toContain('归档');
    expect(activeCard.textContent).not.toContain('移出');
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 30 });
    await act(async () => activeCard.dispatchEvent(contextMenuEvent));
    const archiveButton = Array.from(host.querySelectorAll('.think-whiteboard-context-menu button')).find((button) => button.textContent === '归档') as HTMLButtonElement;
    expect(archiveButton).toBeTruthy();
    await act(async () => { archiveButton.click(); });
    await waitForUi(() => store.archiveItems.mock.calls.length > 0, '等待归档写入');
    expect(store.archiveItems).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, ['item-active']);

    const openArchive = host.querySelector('button[aria-label="归档箱（1）"]') as HTMLButtonElement;
    await act(async () => openArchive.click());
    expect(host.querySelector('.think-whiteboard-archive-canvas')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-archived-item-id="item-archived"]')?.textContent).toContain('恢复位置 -500, -300');
    const restore = Array.from(host.querySelectorAll('[data-whiteboard-archived-item-id="item-archived"] button')).find((button) => button.textContent === '恢复到原位置') as HTMLButtonElement;
    await act(async () => { restore.click(); });
    await waitForUi(() => store.restoreArchivedItem.mock.calls.length > 0, '等待归档恢复');
    expect(store.restoreArchivedItem).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, 'item-archived');
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('-376');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('-170');
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(host.querySelector('.think-whiteboard-archive-canvas')).toBeNull();
  });

  test('恢复深层工作台归档卡时会进入原工作台、关闭归档箱并在 100% 精确找回卡片', async () => {
    const nestedRecord = record('nested-archived-record');
    const board: WhiteboardBoard = {
      title: '白板', modified: 1, edges: [], items: [],
      groups: [
        { id: 'group-parent', title: '父工作台', x: 100, y: 100, collapsed: false },
        { id: 'group-child', title: '子工作台', x: 300, y: 220, collapsed: false, parentGroupId: 'group-parent' },
      ],
      archivedItems: [{ id: 'nested-archived-item', recordId: nestedRecord.id, x: 520, y: 410, zIndex: 9, groupId: 'group-child', archivedAt: 20 }],
    };
    const store = fakeStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[nestedRecord]} whiteboardStore={store} />, host));
    await act(async () => (host.querySelector('button[aria-label="放大白板"]') as HTMLButtonElement).click());
    expect((host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement).getAttribute('data-whiteboard-zoom')).toBe('1.25');

    await act(async () => (host.querySelector('button[aria-label="归档箱（1）"]') as HTMLButtonElement).click());
    const restore = host.querySelector('[data-whiteboard-archived-item-id="nested-archived-item"] button') as HTMLButtonElement;
    await act(async () => { restore.click(); });
    await waitForUi(() => store.restoreArchivedItem.mock.calls.length > 0, '等待深层归档恢复');

    const workspace = host.querySelector('.think-whiteboard-workspace') as HTMLElement;
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    expect(workspace.dataset.whiteboardActiveGroupId).toBe('group-child');
    expect(host.querySelector('.think-whiteboard-archive-canvas')).toBeNull();
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('644');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('540');
    expect(host.querySelector('button[aria-label="返回上一级工作台"]')).toBeTruthy();
  });

  test('归档工作台可独立网格/目标×类型×时间排布，移动 archivePosition 不改变恢复原点', async () => {
    const a = record('archive-layout-a'); const b = { ...record('archive-layout-b'), recordType: 'task', goalPath: '另一个目标', date: '2026-10-08' } as RecordViewItem;
    const board: WhiteboardBoard = {
      title: '白板', modified: 1, edges: [], items: [],
      archivedItems: [
        { id: 'archive-layout-item-a', recordId: a.id, x: -800, y: -500, archivedAt: 10, archiveX: 48, archiveY: 72 },
        { id: 'archive-layout-item-b', recordId: b.id, x: 900, y: 600, archivedAt: 11, archiveX: 900, archiveY: 700 },
      ],
    };
    const store = fakeStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    await act(async () => (host.querySelector('button[aria-label="归档箱（2）"]') as HTMLButtonElement).click());
    const archiveViewport = host.querySelector('.think-whiteboard-archive-canvas__viewport') as HTMLDivElement;
    archiveViewport.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800, x: 0, y: 0, toJSON: () => ({}) });
    const pointer = (type: string, x: number, y: number) => { return createPointerEvent(type, { pointerId: 88, pointerType: 'mouse', button: 0, clientX: x, clientY: y, ctrlKey: true, metaKey: false }); };
    await act(async () => { archiveViewport.dispatchEvent(pointer('pointerdown', 0, 0)); window.dispatchEvent(pointer('pointermove', 380, 360)); });
    await waitForUi(() => host.querySelector('.think-whiteboard-archive-canvas__title')?.textContent?.includes('已选 1') === true, '等待归档框选状态');
    expect(host.querySelector('.think-whiteboard-archive-canvas__title')?.textContent).toContain('已选 1');
    await act(async () => window.dispatchEvent(pointer('pointerup', 380, 360)));
    const selectAll = Array.from(host.querySelectorAll('.think-whiteboard-archive-canvas button')).find((button) => button.textContent === '全选') as HTMLButtonElement;
    await act(async () => selectAll.click());
    expect(host.querySelector('.think-whiteboard-archive-canvas__title')?.textContent).toContain('已选 2');
    const grid = Array.from(host.querySelectorAll('.think-whiteboard-archive-canvas button')).find((button) => button.textContent === '网格整理') as HTMLButtonElement;
    await act(async () => { grid.click(); });
    await waitForUi(() => store.moveArchivedItems.mock.calls.length >= 1, '等待归档网格整理');
    expect(store.moveArchivedItems).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, expect.arrayContaining([
      expect.objectContaining({ itemId: 'archive-layout-item-a' }), expect.objectContaining({ itemId: 'archive-layout-item-b' }),
    ]));
    const semantic = Array.from(host.querySelectorAll('.think-whiteboard-archive-canvas button')).find((button) => button.textContent === '目标 × 类型 × 时间') as HTMLButtonElement;
    await act(async () => { semantic.click(); });
    await waitForUi(() => store.moveArchivedItems.mock.calls.length === 2, '等待归档语义整理');
    expect(store.moveArchivedItems).toHaveBeenCalledTimes(2);
    expect(board.archivedItems?.[0]).toMatchObject({ x: -800, y: -500 });
  });

});
