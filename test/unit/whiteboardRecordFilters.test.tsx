/**
 * @covers F094/ui
 * @covers F094/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardRecordSourcePanel } from '@/features/whiteboard/WhiteboardRecordSourcePanel';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function record(id: string, recordType: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    recordType,
    title: id,
    content: `${id} 内容`,
    tags: [],
    goalPath: '照顾好自己/睡眠',
    date: '2026-08-10',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

function findLabel(host: HTMLElement, needle: string): HTMLLabelElement {
  const label = Array.from(host.querySelectorAll('label')).find((candidate) => candidate.textContent?.includes(needle));
  if (!label) throw new Error(`未找到筛选标签：${needle}`);
  return label;
}

function goalNode(host: HTMLElement, path: string): HTMLElement {
  const node = host.querySelector(`[data-goal-path="${path}"]`) as HTMLElement | null;
  if (!node) throw new Error(`未找到目标节点：${path}`);
  return node;
}


function sourceRecordIds(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll('[data-whiteboard-source-record-id]'))
    .map((node) => node.getAttribute('data-whiteboard-source-record-id') || '')
    .filter(Boolean)
    .sort();
}

function createReadyStore(board: WhiteboardBoard): WhiteboardStore & Record<string, jest.Mock> {
  const listeners = new Set<() => void>();
  const store = {
    getStatus: jest.fn(() => ({ state: 'ready' as const })),
    getBoard: jest.fn(() => ({ ...board, items: board.items.map(item => ({ ...item })), edges: board.edges.map(edge => ({ ...edge })) })),
    subscribe: jest.fn((listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }),
    ensureBoard: jest.fn(async () => board),
    addRecord: jest.fn(async () => { throw new Error('本用例不应加入 Record'); }),
    moveItem: jest.fn(async () => { throw new Error('本用例不应移动卡片'); }),
    removeItem: jest.fn(async () => { throw new Error('本用例不应移出卡片'); }),
    addEdge: jest.fn(async () => { throw new Error('本用例不应创建连线'); }),
    removeEdge: jest.fn(async () => { throw new Error('本用例不应删除连线'); }),
  } as unknown as WhiteboardStore & Record<string, jest.Mock>;
  return store;
}

describe('白板 Record Source 筛选 UI 1.1.1', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('类型使用简洁复选框且不显示数量；关键词、类型、时间可组合', async () => {
    const records = [
      record('thought-phone', 'thought', { content: '半夜手机', goalPath: '照顾好自己/睡眠', date: '2026-08-10' }),
      record('evidence-phone', 'event', { content: '手机刺激', goalPath: '照顾好自己/睡眠/刺激', date: '2026-08-11' }),
      record('task-phone', 'task', { content: '手机任务', goalPath: '我若安好便是晴天/娱乐', date: '2026-08-10', status: 'open' }),
      record('thought-code', 'thought', { content: '编程', goalPath: '爱好能力/电脑', date: '2026-08-10' }),
    ];
    await act(async () => render(<WhiteboardRecordSourcePanel records={records} boardRecordIds={new Set()} onAdd={jest.fn()} />, host));

    const thoughtType = findLabel(host, '思考');
    expect(thoughtType.textContent?.trim()).toBe('思考');

    const search = host.querySelector('input[aria-label="搜索记录"]') as HTMLInputElement;
    await act(async () => { search.value = '手机'; search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(sourceRecordIds(host)).toEqual(['evidence-phone', 'task-phone', 'thought-phone']);

    await act(async () => { (thoughtType.querySelector('input') as HTMLInputElement).click(); });
    expect(host.textContent).toContain('thought-phone');
    expect(host.textContent).not.toContain('evidence-phone');
    expect(host.textContent).not.toContain('task-phone');

    const timeLabel = findLabel(host, '限定时间范围');
    await act(async () => { (timeLabel.querySelector('input') as HTMLInputElement).click(); });
    const start = host.querySelector('input[aria-label="开始日期"]') as HTMLInputElement;
    const end = host.querySelector('input[aria-label="结束日期"]') as HTMLInputElement;
    await act(async () => {
      start.value = '2026-08-10';
      start.dispatchEvent(new Event('input', { bubbles: true }));
      end.value = '2026-08-10';
      end.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(sourceRecordIds(host)).toEqual(['thought-phone']);
  });

  test('目标使用层级复选树：折叠父目标勾选整个子树，展开后可逐个取消子目标并呈现半选', async () => {
    const records = [
      record('sleep', 'thought', { goalPath: '照顾好自己/睡眠' }),
      record('stimulus', 'event', { goalPath: '照顾好自己/睡眠/刺激' }),
      record('body', 'habit', { goalPath: '照顾好自己/身体' }),
      record('code', 'thought', { goalPath: '爱好能力/电脑' }),
    ];
    await act(async () => render(<WhiteboardRecordSourcePanel records={records} boardRecordIds={new Set()} onAdd={jest.fn()} />, host));

    expect(host.querySelector('input[aria-label="搜索目标"]')).toBeNull();
    const care = goalNode(host, '照顾好自己');
    const careCheckbox = care.querySelector(':scope > .think-whiteboard-goal-tree__row input[type="checkbox"]') as HTMLInputElement;
    await act(async () => { careCheckbox.click(); });
    expect(sourceRecordIds(host)).toEqual(['body', 'sleep', 'stimulus']);

    const expand = care.querySelector(':scope > .think-whiteboard-goal-tree__row button[aria-label^="展开"]') as HTMLButtonElement;
    await act(async () => { expand.click(); });
    const sleep = goalNode(host, '照顾好自己/睡眠');
    const sleepCheckbox = sleep.querySelector(':scope > .think-whiteboard-goal-tree__row input[type="checkbox"]') as HTMLInputElement;
    expect(sleepCheckbox.checked).toBe(true);

    await act(async () => { sleepCheckbox.click(); });
    expect(sourceRecordIds(host)).toEqual(['body']);
    expect(careCheckbox.indeterminate).toBe(true);
  });

  test('左侧任何查询变化都不隐藏右侧卡片，也不调用 WhiteboardStore mutation', async () => {
    const onBoard = record('board-record', 'event', { content: '右侧持久卡', goalPath: '照顾好自己/睡眠', date: '2026-08-01' });
    const candidate = record('candidate', 'thought', { content: '左侧手机候选', goalPath: '爱好能力/电脑', date: '2026-09-01' });
    const board: WhiteboardBoard = { title: '白板', items: [{ id: 'board-item', recordId: onBoard.id, x: 24, y: 24 }], edges: [], modified: 1 };
    const store = createReadyStore(board);

    await act(async () => render(<WhiteboardWorkspace records={[onBoard, candidate]} whiteboardStore={store} />, host));
    const rightCard = () => host.querySelector('[data-whiteboard-item-id="board-item"]');
    expect(rightCard()).toBeTruthy();

    const search = host.querySelector('input[aria-label="搜索记录"]') as HTMLInputElement;
    await act(async () => { search.value = '左侧手机'; search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(rightCard()).toBeTruthy();

    const thoughtType = findLabel(host, '思考');
    await act(async () => { (thoughtType.querySelector('input') as HTMLInputElement).click(); });
    expect(rightCard()).toBeTruthy();

    const computerGoal = goalNode(host, '爱好能力');
    await act(async () => { (computerGoal.querySelector(':scope > .think-whiteboard-goal-tree__row input') as HTMLInputElement).click(); });
    expect(rightCard()).toBeTruthy();

    expect(store.addRecord).not.toHaveBeenCalled();
    expect(store.moveItem).not.toHaveBeenCalled();
    expect(store.removeItem).not.toHaveBeenCalled();
    expect(store.addEdge).not.toHaveBeenCalled();
    expect(store.removeEdge).not.toHaveBeenCalled();
  });

  test('已在白板 Record 从左侧候选排除，右侧保持唯一已加入视觉真源', async () => {
    const rec = record('already', 'thought', { content: '已经加入白板' });
    await act(async () => render(<WhiteboardRecordSourcePanel records={[rec]} boardRecordIds={new Set([rec.id])} onAdd={jest.fn()} />, host));
    expect(host.querySelector('[data-whiteboard-source-record-id="already"]')).toBeNull();
    expect(host.textContent).not.toContain('已在白板');
  });
});
