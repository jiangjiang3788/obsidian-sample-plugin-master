/**
 * @covers F094/ui
 * @covers F094/regression
 * @covers F095/ui
 * @covers F095/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, type WhiteboardBoard, type WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string, coreBlock: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return { id, coreBlock, title: id, content: `${id} content`, tags: [], categoryKey: coreBlock, goalPath: '真实/主题', date: '2026-09-01', created: 0, modified: 0, extra: {}, ...overrides };
}

function fakeStore(initial: WhiteboardBoard | undefined) {
  let board = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const store = {
    getStatus: () => ({ state: 'ready' as const }),
    getBoard: () => board ? { ...board, items: board.items.map((item) => ({ ...item })), edges: board.edges.map((edge) => ({ ...edge })) } : undefined,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    ensureBoard: jest.fn(async (_id: string, title: string) => {
      board = board ?? { title, items: [], edges: [], modified: Date.now() };
      notify();
      return board;
    }),
    addRecord: jest.fn(async (_id: string, recordId: string, position: { x: number; y: number; zIndex?: number }) => {
      if (!board) throw new Error('白板不存在');
      const existing = board.items.find((item) => item.recordId === recordId);
      if (existing) return existing;
      const item = { id: `item-${board.items.length + 1}`, recordId, ...position };
      board = { ...board, items: [...board.items, item], modified: Date.now() };
      notify();
      return item;
    }),
    moveItem: jest.fn(async (_id: string, itemId: string, position: { x: number; y: number; zIndex?: number }) => {
      if (!board) return false;
      const found = board.items.some((item) => item.id === itemId);
      if (!found) return false;
      board = { ...board, items: board.items.map((item) => item.id === itemId ? { ...item, ...position } : item), modified: Date.now() };
      notify();
      return true;
    }),
    removeItems: jest.fn(async () => true),
    removeItem: jest.fn(async (_id: string, itemId: string) => {
      if (!board) return false;
      board = { ...board, items: board.items.filter((item) => item.id !== itemId), edges: board.edges.filter((edge) => edge.fromItemId !== itemId && edge.toItemId !== itemId), modified: Date.now() };
      notify();
      return true;
    }),
    addEdge: jest.fn(async (_id: string, fromItemId: string, toItemId: string) => {
      if (!board) throw new Error('白板不存在');
      const edge = { id: `edge-${board.edges.length + 1}`, fromItemId, toItemId };
      board = { ...board, edges: [...board.edges, edge], modified: Date.now() };
      notify();
      return edge;
    }),
    removeEdge: jest.fn(async (_id: string, edgeId: string) => {
      if (!board) return false;
      board = { ...board, edges: board.edges.filter((edge) => edge.id !== edgeId), modified: Date.now() };
      notify();
      return true;
    }),
  } as unknown as WhiteboardStore;
  return store;
}


describe('ThinkOS 独立白板 Workspace 1.1.0', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('左侧是永久 Record Source，右侧白板不依赖 ViewInstance / Layout / Toolbar', async () => {
    const old = record('rec-old', 'evidence', { content: '睡眠相关证据' });
    const other = record('rec-other', 'thought', { content: '编程想法' });
    const store = fakeStore({ title: '白板', items: [{ id: 'item-old', recordId: old.id, x: 24, y: 24 }], edges: [], modified: 1 });
    await act(async () => render(<WhiteboardWorkspace records={[old, other]} whiteboardStore={store} />, host));

    expect(host.querySelector('.think-whiteboard-header')).toBeNull();
    expect(host.querySelector('aside[aria-label="搜索记录"]')).toBeTruthy();
    expect(host.querySelector('main[aria-label="白板"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-item-id="item-old"]')).toBeTruthy();
    expect(host.textContent).not.toContain('Toolbar');
    expect(host.textContent).not.toContain('布局');

    const input = host.querySelector('input[aria-label="搜索记录"]') as HTMLInputElement;
    await act(async () => { input.value = '编程'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).toContain('rec-other');
    expect(host.querySelector('[data-whiteboard-item-id="item-old"]')).toBeTruthy();
  });

  it('点击加入写入默认 Whiteboard identity，加入成功后从左侧候选移除', async () => {
    const rec = record('rec-add', 'task');
    const store = fakeStore({ title: '白板', items: [], edges: [], modified: 1 });
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    const add = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '加入') as HTMLButtonElement;
    await act(async () => { add.click(); await Promise.resolve(); await Promise.resolve(); });
    expect((store.addRecord as jest.Mock)).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, rec.id, { x: 24, y: 24, zIndex: 1 });
    expect(host.querySelector('[data-whiteboard-item-id="item-1"]')).toBeTruthy();
    expect(host.querySelector('[data-whiteboard-source-record-id="rec-add"]')).toBeNull();
  });

  // Pointer Capture 的浏览器级行为由真机验收；jsdom 仅保留 WhiteboardDragModel 纯模型覆盖。

  it('卡片四边都可直接拖出 A→B 连线，不再需要“连线/连到这里”按钮', async () => {
    const a = record('rec-a', 'evidence');
    const b = record('rec-b', 'thought');
    const store = fakeStore({ title: '白板', items: [{ id: 'item-a', recordId: a.id, x: 24, y: 24 }, { id: 'item-b', recordId: b.id, x: 360, y: 180 }], edges: [], modified: 1 });
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLDivElement;
    viewport.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    const aCard = host.querySelector('[data-whiteboard-item-id="item-a"]') as HTMLElement;
    const bCard = host.querySelector('[data-whiteboard-item-id="item-b"]') as HTMLElement;
    expect(aCard.querySelectorAll('[data-whiteboard-edge-handle]')).toHaveLength(4);
    expect(aCard.textContent).not.toContain('连到这里'); expect(aCard.textContent).not.toContain('取消连线');
    const original = document.elementFromPoint; Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: jest.fn(() => bCard) });
    const pointer = (type: string, x: number, y: number) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperties(event, {
      pointerId: { value: 31 }, pointerType: { value: 'mouse' }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y },
    }); return event; };
    const start = aCard.querySelector('[data-whiteboard-edge-handle="right"]') as HTMLButtonElement;
    await act(async () => { start.dispatchEvent(pointer('pointerdown', 272, 90)); window.dispatchEvent(pointer('pointermove', 380, 220)); });
    expect(host.querySelector('[data-whiteboard-edge-preview="true"]')).toBeTruthy();
    expect(bCard.getAttribute('data-whiteboard-connection-target')).toBe('true');
    await act(async () => { window.dispatchEvent(pointer('pointerup', 380, 220)); await Promise.resolve(); await Promise.resolve(); });
    expect((store.addEdge as jest.Mock)).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_ID, 'item-a', 'item-b');
    expect(host.querySelector('[data-whiteboard-edge-id="edge-1"]')).toBeTruthy();
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: original });
  });
});
