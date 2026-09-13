/**
 * @covers F135/ui
 * @covers F135/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, type WhiteboardBoard, type WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string): RecordViewItem {
  return { id, recordType: 'thought', title: id, content: id, tags: [], goalPath: '测试', date: '2026-09-09', created: 0, modified: 0, extra: {} };
}

function fakeStore(board: WhiteboardBoard): WhiteboardStore {
  const listeners = new Set<() => void>();
  return {
    getStatus: () => ({ state: 'ready' as const }), getBoard: () => board,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    ensureBoard: jest.fn(async () => board), addRecord: jest.fn(), addRecords: jest.fn(), moveItem: jest.fn(async () => true),
    moveItems: jest.fn(async () => true), removeItem: jest.fn(async () => false), removeItems: jest.fn(async () => true), addEdge: jest.fn(), removeEdge: jest.fn(async () => false),
    createGroup: jest.fn(), renameGroup: jest.fn(), setGroupCollapsed: jest.fn(), moveGroup: jest.fn(), removeGroup: jest.fn(),
  } as unknown as WhiteboardStore;
}

function modifierPointerDown(target: Element, key: 'ctrlKey' | 'shiftKey' = 'ctrlKey') {
  target.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, [key]: true }));
}

describe('Whiteboard Canvas selection 1.1.8 UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('Ctrl/⌘/Shift 点击逐条切换右侧选择，并显示选择数量/清空入口', async () => {
    const a = record('a'); const b = record('b');
    const store = fakeStore({ title: '白板', modified: 1, items: [
      { id: 'item-a', recordId: 'a', x: 0, y: 0 }, { id: 'item-b', recordId: 'b', x: 300, y: 0 },
    ], edges: [] });
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    const itemA = host.querySelector('[data-whiteboard-item-id="item-a"]')!;
    const itemB = host.querySelector('[data-whiteboard-item-id="item-b"]')!;
    await act(async () => { modifierPointerDown(itemA); modifierPointerDown(itemB, 'shiftKey'); });
    await waitForUi(() => host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-selection-count') === '2', '等待白板多选状态');
    expect(itemA.getAttribute('data-whiteboard-selected')).toBe('true');
    expect(itemB.getAttribute('data-whiteboard-selected')).toBe('true');
    expect(host.querySelector('.think-whiteboard-board-selection')?.textContent).toContain('已选 2');
    const clear = host.querySelector('button[aria-label="清除白板选择"]') as HTMLButtonElement;
    await act(async () => clear.click());
    expect(host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-selection-count')).toBe('0');
  });

  test('Ctrl/⌘ + 拖动空白框选可见卡片，Shift 单独拖空白仍不是框选', async () => {
    const a = record('a'); const b = record('b');
    const store = fakeStore({ title: '白板', modified: 1, items: [
      { id: 'item-a', recordId: 'a', x: 0, y: 0 }, { id: 'item-b', recordId: 'b', x: 500, y: 0 },
    ], edges: [] });
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLDivElement;
    viewport.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    const pointer = (type: string, x: number, y: number, ctrlKey = false, shiftKey = false) => {
      return createPointerEvent(type, { pointerId: 7, pointerType: 'mouse', button: 0, clientX: x, clientY: y, ctrlKey, shiftKey });
    };
    await act(async () => {
      viewport.dispatchEvent(pointer('pointerdown', 0, 0, true));
      window.dispatchEvent(pointer('pointermove', 260, 270, true));
    });
    await waitForUi(() => host.querySelector('[data-whiteboard-item-id="item-a"]')?.getAttribute('data-whiteboard-selected') === 'true', '等待白板框选状态');
    expect(host.querySelector('[data-whiteboard-item-id="item-a"]')?.getAttribute('data-whiteboard-selected')).toBe('true');
    expect(host.querySelector('[data-whiteboard-item-id="item-b"]')?.getAttribute('data-whiteboard-selected')).toBe('false');
    expect(host.querySelector('.think-whiteboard-selection-marquee')).not.toBeNull();
    await act(async () => window.dispatchEvent(pointer('pointerup', 260, 270, true)));
    expect(host.querySelector('.think-whiteboard-selection-marquee')).toBeNull();

    await act(async () => viewport.dispatchEvent(pointer('pointerdown', 10, 10, false, true)));
    expect(host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-selection-count')).toBe('0');
    expect(host.querySelector('.think-whiteboard-selection-marquee')).toBeNull();
    await act(async () => window.dispatchEvent(pointer('pointerup', 10, 10, false, true)));
  });

  test('多选拖入展开工作台时整批 moveItems 指向同一 groupId；点击移出会批量移出白板', async () => {
    const a = record('a'); const b = record('b');
    const board: WhiteboardBoard = { title: '白板', modified: 1, groups: [{ id: 'group-a', title: '工作台', x: 400, y: 0, collapsed: false }], items: [
      { id: 'item-a', recordId: 'a', x: 0, y: 80 }, { id: 'item-b', recordId: 'b', x: 280, y: 80 },
    ], edges: [] };
    const store = fakeStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    const itemA = host.querySelector('[data-whiteboard-item-id="item-a"]')!;
    const itemB = host.querySelector('[data-whiteboard-item-id="item-b"]')!;
    await act(async () => { modifierPointerDown(itemA); modifierPointerDown(itemB); });
    await waitForUi(() => host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-selection-count') === '2', '等待白板多选拖动准备');
    const drag = (type: string, x: number, y: number) => { return createPointerEvent(type, {
      pointerId: 21, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
    }); };
    await act(async () => { itemA.dispatchEvent(drag('pointerdown', 20, 100)); window.dispatchEvent(drag('pointermove', 470, 100)); window.dispatchEvent(drag('pointerup', 470, 100)); });
    await waitForUi(() => (store.moveItems as jest.Mock).mock.calls.length > 0, '等待多选拖入工作台');
    expect(store.moveItems).toHaveBeenCalled();
    expect((store.moveItems as jest.Mock).mock.calls.at(-1)?.[2]).toBe('group-a');
    const remove = Array.from(itemA.querySelectorAll('button')).find((button) => button.textContent === '移出') as HTMLButtonElement;
    await act(async () => { remove.click(); });
    await waitForUi(() => (store.removeItems as jest.Mock).mock.calls.length > 0, '等待批量移出白板');
    expect(store.removeItems).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, expect.arrayContaining(['item-a', 'item-b']));
  });

});
