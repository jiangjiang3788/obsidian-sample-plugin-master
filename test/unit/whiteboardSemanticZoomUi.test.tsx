/**
 * @covers F139/ui
 * @covers F139/regression
 * @covers F143/ui
 * @covers F143/regression
 * @covers F144/ui
 * @covers F144/regression
 * @covers F145/ui
 * @covers F145/regression
 * @covers F148/ui
 * @covers F148/regression
 * @covers F151/ui
 * @covers F151/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string): RecordViewItem {
  return { id, coreBlock: 'thought', title: id, content: `${id} 内容`, tags: [], categoryKey: 'thought', goalPath: '', date: '2026-09-09', created: 0, modified: 0, extra: {} } as RecordViewItem;
}

function createReadyStore(board: WhiteboardBoard): WhiteboardStore & Record<string, jest.Mock> {
  return {
    getStatus: jest.fn(() => ({ state: 'ready' as const })),
    getBoard: jest.fn(() => structuredClone(board)),
    subscribe: jest.fn(() => () => undefined),
    ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(), addRecords: jest.fn(), moveItem: jest.fn(), moveItems: jest.fn(), moveArchivedItems: jest.fn(), translateNodes: jest.fn(async () => true), moveNodes: jest.fn(async () => true), removeItem: jest.fn(async () => true), removeItems: jest.fn(async () => true),
    addEdge: jest.fn(), removeEdge: jest.fn(), updateEdgeLabel: jest.fn(),
    createGroup: jest.fn(), moveGroup: jest.fn(), renameGroup: jest.fn(), setGroupCollapsed: jest.fn(), dissolveGroup: jest.fn(), setItemsGroup: jest.fn(),
    addAnnotation: jest.fn(), updateAnnotation: jest.fn(), moveAnnotation: jest.fn(), removeAnnotation: jest.fn(),
    archiveItems: jest.fn(), restoreItem: jest.fn(), replaceBoard: jest.fn(),
  } as unknown as WhiteboardStore & Record<string, jest.Mock>;
}

describe('Whiteboard semantic zoom UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('zooming out changes detail -> compact -> overview and keeps fixed locators for cards/workbenches', async () => {
    const rec = record('rec-semantic');
    const board: WhiteboardBoard = {
      title: '白板',
      items: [{ id: 'item-semantic', recordId: rec.id, x: 800, y: 500 }],
      groups: [{ id: 'group-semantic', title: '远处工作台', x: 600, y: 400, collapsed: false }],
      annotations: [{ id: 'annotation-semantic', kind: 'sticky', text: '远处便签', x: 1200, y: 700 }],
      edges: [], modified: 1,
    };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    expect(viewport.getAttribute('data-whiteboard-lod')).toBe('detail');

    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, ctrlKey: true, bubbles: true, cancelable: true })));
    expect(viewport.getAttribute('data-whiteboard-lod')).toBe('compact');
    expect(host.querySelector('[data-whiteboard-item-id="item-semantic"]')).toBeNull();
    expect(host.querySelector('[data-whiteboard-overview-group-id="group-semantic"]')).not.toBeNull();
    expect(host.querySelector('[data-whiteboard-overview-item-id="item-semantic"]')).not.toBeNull();
    expect(host.querySelector('.think-whiteboard-semantic-status')?.textContent).toContain('简化视图');

    await act(async () => (host.querySelector('button[aria-label^="重置白板缩放"]') as HTMLButtonElement).click());
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true })));
    expect(viewport.getAttribute('data-whiteboard-lod')).toBe('overview');
    expect(host.querySelector('[data-whiteboard-item-id="item-semantic"]')).toBeNull();
    expect(host.querySelector('[data-whiteboard-overview-item-id="item-semantic"]')).not.toBeNull();
    expect(host.querySelector('[data-whiteboard-overview-group-id="group-semantic"]')).not.toBeNull();
    expect(host.querySelector('[data-whiteboard-overview-annotation-id="annotation-semantic"]')).not.toBeNull();
    expect(host.querySelector('.think-whiteboard-semantic-status')?.textContent).toContain('概览模式');
  });

  test('clicking an overview card locator recovers that real card at 100% without Store mutation', async () => {
    const rec = record('rec-focus');
    const board: WhiteboardBoard = { title: '白板', items: [{ id: 'item-focus', recordId: rec.id, x: 900000, y: -700000 }], edges: [], modified: 1 };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true })));
    const marker = host.querySelector('button[aria-label="定位卡片：rec-focus"]') as HTMLButtonElement;
    expect(marker).not.toBeNull();
    await act(async () => marker.click());
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(viewport.getAttribute('data-whiteboard-lod')).toBe('detail');
    expect(host.querySelector('[data-whiteboard-item-id="item-focus"]')).not.toBeNull();
    expect(store.moveItem).not.toHaveBeenCalled();
    expect(store.moveItems).not.toHaveBeenCalled();
    expect(store.addRecord).not.toHaveBeenCalled();
  });

  test('低倍率 Locator 可 Ctrl/⌘ 混选直属 Card + Workbench，并拖动为一次 translateNodes', async () => {
    const root = record('rec-root'); const nested = record('rec-nested');
    const board: WhiteboardBoard = {
      title: '白板',
      items: [
        { id: 'item-root', recordId: root.id, x: 0, y: 0 },
        { id: 'item-nested', recordId: nested.id, x: 620, y: 120, groupId: 'group-root' },
      ],
      groups: [{ id: 'group-root', title: '根工作台', x: 500, y: 0, collapsed: false }], edges: [], modified: 1,
    };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[root, nested]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, ctrlKey: true, bubbles: true, cancelable: true })));
    expect(viewport.getAttribute('data-whiteboard-lod')).not.toBe('detail');
    expect(host.querySelector('[data-whiteboard-overview-item-id="item-root"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-overview-item-id="item-nested"]')).toBeNull(); // 当前层只把 Workbench 当原子节点
    const itemButton = host.querySelector('[data-whiteboard-overview-item-id="item-root"] button') as HTMLButtonElement;
    const groupButton = host.querySelector('[data-whiteboard-overview-group-id="group-root"] button') as HTMLButtonElement;
    const pointer = (type: string, id: number, x: number, y: number, ctrlKey = false) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperties(event, {
      pointerId: { value: id }, pointerType: { value: 'mouse' }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y }, ctrlKey: { value: ctrlKey }, metaKey: { value: false },
    }); return event; };
    await act(async () => { itemButton.dispatchEvent(pointer('pointerdown', 31, 100, 100, true)); groupButton.dispatchEvent(pointer('pointerdown', 32, 300, 100, true)); });
    expect(host.querySelector('.think-whiteboard-workspace')?.getAttribute('data-whiteboard-selection-count')).toBe('2');
    expect(itemButton.classList.contains('is-selected')).toBe(true); expect(groupButton.classList.contains('is-selected')).toBe(true);
    await act(async () => { groupButton.dispatchEvent(pointer('pointerdown', 33, 300, 100)); window.dispatchEvent(pointer('pointermove', 33, 360, 130)); window.dispatchEvent(pointer('pointerup', 33, 360, 130)); await Promise.resolve(); });
    const call = store.translateNodes.mock.calls.at(-1); expect(call?.[1]).toEqual(['item-root']); expect(call?.[2]).toEqual(['group-root']); expect(typeof call?.[3]).toBe('number'); expect(typeof call?.[4]).toBe('number');

    await act(async () => groupButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 100, button: 2 })));
    expect(host.querySelector('.think-whiteboard-context-menu')?.textContent).toContain('1 卡片 · 1 工作台');
    const alignTop = Array.from(host.querySelectorAll('.think-whiteboard-context-menu button')).find((button) => button.textContent === '顶部对齐') as HTMLButtonElement;
    expect(alignTop.disabled).toBe(false);
    await act(async () => { alignTop.click(); await Promise.resolve(); });
    expect(store.moveNodes).toHaveBeenCalledTimes(1);
    const arrangeCall = store.moveNodes.mock.calls[0]; expect(arrangeCall[1]).toHaveLength(1); expect(arrangeCall[2]).toHaveLength(1);
    expect(arrangeCall[1][0].itemId).toBe('item-root'); expect(arrangeCall[2][0].groupId).toBe('group-root');
    expect(arrangeCall[1][0].position.y).toBe(arrangeCall[2][0].position.y);
  });


  test('1.3.7 低倍率 Card Locator 可直接拖回左侧 Record Source，消费 drop 后不再平移', async () => {
    const rec = record('rec-source-drop');
    const board: WhiteboardBoard = { title: '白板', items: [{ id: 'item-source-drop', recordId: rec.id, x: 600, y: 300 }], edges: [], modified: 1 };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    const source = host.querySelector('.think-whiteboard-source') as HTMLElement;
    source.getBoundingClientRect = () => ({ left: 0, top: 0, right: 280, bottom: 900, width: 280, height: 900, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, ctrlKey: true, bubbles: true, cancelable: true })));
    const button = host.querySelector('[data-whiteboard-overview-item-id="item-source-drop"] button') as HTMLButtonElement;
    const pointer = (type: string, id: number, x: number, y: number) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperties(event, {
      pointerId: { value: id }, pointerType: { value: 'mouse' }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y }, ctrlKey: { value: false }, metaKey: { value: false },
    }); return event; };
    await act(async () => { button.dispatchEvent(pointer('pointerdown', 61, 520, 320)); window.dispatchEvent(pointer('pointermove', 61, 120, 320)); });
    expect(source.classList.contains('is-remove-drop-target')).toBe(true);
    await act(async () => { window.dispatchEvent(pointer('pointerup', 61, 120, 320)); await Promise.resolve(); await Promise.resolve(); });
    expect(store.removeItem).toHaveBeenCalledWith('whiteboard-default', 'item-source-drop');
    expect(store.translateNodes).not.toHaveBeenCalled();
  });

  test('1.3.7 overview 下文字标注 Locator 可拖动到左侧负坐标，而不是只能点回 100%', async () => {
    const rec = record('rec-annotation-anchor');
    const board: WhiteboardBoard = {
      title: '白板', items: [{ id: 'item-annotation-anchor', recordId: rec.id, x: 0, y: 0 }],
      annotations: [{ id: 'annotation-move-low', kind: 'text', text: '低倍率可移动文字', x: 50, y: 80 }], edges: [], modified: 1,
    };
    const store = createReadyStore(board); store.moveAnnotation.mockResolvedValue(true);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true })));
    expect(viewport.getAttribute('data-whiteboard-lod')).toBe('overview');
    const button = host.querySelector('[data-whiteboard-overview-annotation-id="annotation-move-low"] button') as HTMLButtonElement;
    const pointer = (type: string, id: number, x: number, y: number) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperties(event, {
      pointerId: { value: id }, pointerType: { value: 'mouse' }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y },
    }); return event; };
    await act(async () => { button.dispatchEvent(pointer('pointerdown', 62, 300, 200)); window.dispatchEvent(pointer('pointermove', 62, 260, 200)); window.dispatchEvent(pointer('pointerup', 62, 260, 200)); await Promise.resolve(); });
    expect(store.moveAnnotation).toHaveBeenCalled();
    const call = store.moveAnnotation.mock.calls.at(-1); expect(call?.[1]).toBe('annotation-move-low'); expect(call?.[2].x).toBeLessThan(0); expect(call?.[2].y).toBe(80);
  });

});
