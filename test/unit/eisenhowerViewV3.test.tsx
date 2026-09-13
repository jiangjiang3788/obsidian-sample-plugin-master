/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F093/ui
 * @covers F093/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import { EisenhowerView } from '@/features/views/runtime/EisenhowerView/EisenhowerView';
import { buildEisenhowerColumns } from '@/features/views/runtime/EisenhowerView/EisenhowerViewModel';

function item(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'task-1', recordType: 'task', status: 'open', title: 'task-1', content: 'task-1',
    tags: [], created: 0, modified: 0, extra: {}, ...overrides,
  };
}

function task(id: string, importance?: 'important' | 'normal', urgency?: 'urgent' | 'normal', status = 'open'): RecordViewItem {
  return item({ id, title: id, content: id, status, importance, urgency });
}

describe('四象限 View V3', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('只显示 open Task，并把未设置分类的任务放到未分类', () => {
    const columns = buildEisenhowerColumns([
      task('q1', 'important', 'urgent'),
      task('inbox'),
      task('done', 'important', 'normal', 'done'),
      item({ id: 'note', recordType: 'thought', status: 'open' }),
    ]);
    expect(columns.q1.map((row) => row.id)).toEqual(['q1']);
    expect(columns.unclassified.map((row) => row.id)).toEqual(['inbox']);
    expect(Object.values(columns).flat().map((row) => row.id)).not.toContain('done');
  });

  it('点击卡片继续打开原 Task，不创建四象限自己的记录', async () => {
    const onOpenRecord = jest.fn();
    await act(async () => render(<EisenhowerView items={[task('task-1')]} onOpenRecord={onOpenRecord} />, host));
    const card = host.querySelector('.think-eisenhower-card') as HTMLButtonElement;
    expect(card).toBeTruthy();
    await act(async () => card.click());
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1', recordType: 'task' }));
  });

  it('拖到 Q1 只发出 Task 分类意图', async () => {
    const onTaskQuadrantChange = jest.fn().mockResolvedValue(undefined);
    await act(async () => render(<EisenhowerView items={[task('task-1')]} onTaskQuadrantChange={onTaskQuadrantChange} />, host));
    const zone = host.querySelector('[data-quadrant="q1"]') as HTMLElement;
    const store = new Map<string, string>();
    const dataTransfer = {
      getData: (key: string) => store.get(key) || '',
      setData: (key: string, value: string) => { store.set(key, value); },
    } as unknown as DataTransfer;
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    dataTransfer.setData('text/plain', 'task-1');
    await act(async () => { zone.dispatchEvent(event); });
    expect(onTaskQuadrantChange).toHaveBeenCalledWith('task-1', 'q1');
  });
});
