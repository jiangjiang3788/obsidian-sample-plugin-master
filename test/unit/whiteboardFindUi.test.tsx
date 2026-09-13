/**
 * @covers F096/ui
 * @covers F096/regression
 * @covers F098/ui
 * @covers F098/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
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
    ...overrides,
  } as RecordViewItem;
}

function createReadyStore(board: WhiteboardBoard): WhiteboardStore & Record<string, jest.Mock> {
  const listeners = new Set<() => void>();
  return {
    getStatus: jest.fn(() => ({ state: 'ready' as const })),
    getBoard: jest.fn(() => ({ ...board, items: board.items.map((item) => ({ ...item })), edges: board.edges.map((edge) => ({ ...edge })) })),
    subscribe: jest.fn((listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }),
    ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(async () => { throw new Error('本用例不应加入记录'); }),
    moveItem: jest.fn(async () => { throw new Error('本用例不应移动卡片'); }),
    removeItem: jest.fn(async () => { throw new Error('本用例不应移出卡片'); }),
    addEdge: jest.fn(async () => { throw new Error('本用例不应创建连线'); }),
    removeEdge: jest.fn(async () => { throw new Error('本用例不应删除连线'); }),
  } as unknown as WhiteboardStore & Record<string, jest.Mock>;
}

describe('白板内定位与工作区收纳 1.1.3', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('右上角只查当前白板：命中高亮、非命中淡化、上下项循环且不调用 Store mutation', async () => {
    const sleep = record('rec-sleep', { title: '睡眠观察', content: '半夜醒来' });
    const phone = record('rec-phone', { title: '手机刺激', content: '睡前刷手机', goalPath: '我若安好便是晴天/娱乐' });
    const other = record('rec-other', { title: '工作会议', content: '投标' });
    const board: WhiteboardBoard = {
      title: '白板',
      items: [
        { id: 'item-sleep', recordId: sleep.id, x: 24, y: 24 },
        { id: 'item-phone', recordId: phone.id, x: 320, y: 24 },
        { id: 'item-other', recordId: other.id, x: 620, y: 24 },
      ],
      edges: [],
      modified: 1,
    };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[sleep, phone, other]} whiteboardStore={store} />, host));

    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement;
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 600 });
    const find = host.querySelector('.think-whiteboard-board-tools input[aria-label="查找白板卡片"]') as HTMLInputElement;
    expect(find).toBeTruthy();
    await act(async () => { find.value = '手机'; find.dispatchEvent(new Event('input', { bubbles: true })); });

    expect(host.querySelector('[data-whiteboard-item-id="item-phone"]')?.getAttribute('data-whiteboard-find-state')).toBe('active');
    expect(host.querySelector('[data-whiteboard-item-id="item-sleep"]')?.getAttribute('data-whiteboard-find-state')).toBe('dimmed');
    expect(host.textContent).toContain('1/1');
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('44');
    expect(viewport.getAttribute('data-whiteboard-camera-y')).toBe('-146');

    await act(async () => { find.value = '睡'; find.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.querySelector('[data-whiteboard-item-id="item-sleep"]')?.getAttribute('data-whiteboard-find-state')).toBe('active');
    expect(host.querySelector('[data-whiteboard-item-id="item-phone"]')?.getAttribute('data-whiteboard-find-state')).toBe('match');
    const next = host.querySelector('button[aria-label="下一个匹配"]') as HTMLButtonElement;
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('-252');
    await act(async () => next.click());
    expect(host.querySelector('[data-whiteboard-item-id="item-phone"]')?.getAttribute('data-whiteboard-find-state')).toBe('active');
    expect(viewport.getAttribute('data-whiteboard-camera-x')).toBe('44');

    expect(store.addRecord).not.toHaveBeenCalled();
    expect(store.moveItem).not.toHaveBeenCalled();
    expect(store.removeItem).not.toHaveBeenCalled();
    expect(store.addEdge).not.toHaveBeenCalled();
    expect(store.removeEdge).not.toHaveBeenCalled();
  });

  test('筛选范围可折叠；整个左侧 Record Source 可收起再展开且不卸载其搜索状态', async () => {
    const rec = record('rec-a', { title: '白板候选' });
    const board: WhiteboardBoard = { title: '白板', items: [], edges: [], modified: 1 };
    const store = createReadyStore(board);
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));

    const sourceSearch = host.querySelector('input[aria-label="搜索记录"]') as HTMLInputElement;
    await act(async () => { sourceSearch.value = '白板候选'; sourceSearch.dispatchEvent(new Event('input', { bubbles: true })); });

    const filterToggle = host.querySelector('.think-whiteboard-source-filters__toggle') as HTMLButtonElement;
    expect(filterToggle.getAttribute('aria-expanded')).toBe('true');
    await act(async () => filterToggle.click());
    expect(filterToggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[role="tree"][aria-label="目标筛选"]')).toBeNull();

    const collapse = host.querySelector('button[aria-label="收起记录栏"]') as HTMLButtonElement;
    await act(async () => collapse.click());
    expect(host.querySelector('.think-whiteboard-body')?.classList.contains('is-source-collapsed')).toBe(true);
    expect(host.querySelector('aside[aria-label="搜索记录"]')).toBeTruthy();

    const expand = host.querySelector('button[aria-label="展开记录栏"]') as HTMLButtonElement;
    await act(async () => expand.click());
    expect((host.querySelector('input[aria-label="搜索记录"]') as HTMLInputElement).value).toBe('白板候选');
  });
});
