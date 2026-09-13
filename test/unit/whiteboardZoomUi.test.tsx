/**
 * @covers F097/ui
 * @covers F097/regression
 * @covers F098/ui
 * @covers F098/regression
 * @covers F099/ui
 * @covers F099/regression
 * @covers F136/ui
 * @covers F136/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string): RecordViewItem {
  return {
    id,
    recordType: 'thought',
    title: id,
    content: `${id} 内容`,
    tags: [],
    goalPath: '照顾好自己/睡眠',
    date: '2026-09-08',
    created: 0,
    modified: 0,
    extra: {},
  } as RecordViewItem;
}

function createReadyStore(board: WhiteboardBoard): WhiteboardStore & Record<string, jest.Mock> {
  return {
    getStatus: jest.fn(() => ({ state: 'ready' as const })),
    getBoard: jest.fn(() => ({ ...board, items: board.items.map((item) => ({ ...item })), edges: board.edges.map((edge) => ({ ...edge })) })),
    subscribe: jest.fn(() => () => undefined),
    ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(async () => { throw new Error('本用例不应加入记录'); }),
    moveItem: jest.fn(async () => { throw new Error('本用例不应移动卡片'); }),
    removeItem: jest.fn(async () => { throw new Error('本用例不应移出卡片'); }),
    addEdge: jest.fn(async () => { throw new Error('本用例不应创建连线'); }),
    removeEdge: jest.fn(async () => { throw new Error('本用例不应删除连线'); }),
  } as unknown as WhiteboardStore & Record<string, jest.Mock>;
}

describe('白板 Zoom + Camera UI 1.1.5', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('Zoom 与普通 wheel Pan 都只改 ephemeral world transform，不调用 Store mutation', async () => {
    const rec = record('rec-a');
    const board: WhiteboardBoard = {
      title: '白板',
      items: [{ id: 'item-a', recordId: rec.id, x: 100, y: 80, zIndex: 1 }],
      edges: [],
      modified: 1,
    };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));

    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    const world = host.querySelector('.think-whiteboard-world') as HTMLElement;
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('0');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('0');
    expect(world.getAttribute('style')).toContain('matrix(1,0,0,1,0,0)');

    const zoomIn = host.querySelector('button[aria-label="放大白板"]') as HTMLButtonElement;
    await act(async () => zoomIn.click());
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1.25');
    expect(world.getAttribute('style')).toContain('matrix(1.25,0,0,1.25');


    await act(async () => {
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(Number(viewport.getAttribute('data-whiteboard-zoom'))).toBeLessThan(0.5);
    await act(async () => {
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -2000, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(Number(viewport.getAttribute('data-whiteboard-zoom'))).toBeGreaterThan(2);

    const reset = host.querySelector('button[aria-label="重置白板缩放到 100%"]') as HTMLButtonElement;
    await act(async () => reset.click());
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');

    await act(async () => {
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 80, deltaY: -40, bubbles: true, cancelable: true }));
    });
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('80');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('-40');
    expect(world.getAttribute('style')).toContain('matrix(1,0,0,1,-80,40)');

    expect(store.addRecord).not.toHaveBeenCalled();
    expect(store.moveItem).not.toHaveBeenCalled();
    expect(store.removeItem).not.toHaveBeenCalled();
    expect(store.addEdge).not.toHaveBeenCalled();
    expect(store.removeEdge).not.toHaveBeenCalled();
  });

  test('右上角“回到画布中心”回到真实可见内容锚点并同时恢复 100%，不写 Store', async () => {
    const a = record('rec-center-a');
    const b = record('rec-center-b');
    const board: WhiteboardBoard = {
      title: '白板',
      items: [
        { id: 'item-a', recordId: a.id, x: -200, y: -100 },
        { id: 'item-b', recordId: b.id, x: 600, y: 300 },
      ],
      edges: [],
      modified: 1,
    };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[a, b]} whiteboardStore={store} />, host));
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    await act(async () => {
      (host.querySelector('button[aria-label="放大白板"]') as HTMLButtonElement).click();
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 500, deltaY: 400, bubbles: true, cancelable: true }));
    });
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1.25');
    const center = host.querySelector('button[aria-label="回到画布中心"]') as HTMLButtonElement;
    await act(async () => center.click());
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('-76');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('30');
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(store.moveItem).not.toHaveBeenCalled();
    expect(store.addRecord).not.toHaveBeenCalled();
  });

  test('camera 不持久化：卸载后重新打开 Workspace 回到默认 0/0/100%', async () => {
    const rec = record('rec-a');
    const board: WhiteboardBoard = { title: '白板', items: [{ id: 'item-a', recordId: rec.id, x: -300, y: 80 }], edges: [], modified: 1 };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    let viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    await act(async () => viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('120');

    await act(async () => render(null, host));
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('0');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('0');
    expect(viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
  });
});
