/** @jsxImportSource preact */
/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { DayColumnBody } from '@/features/views/runtime/components/timeline/DayColumnBody';

function taskBlock(status: 'open' | 'done', id: string) {
  return {
    id,
    taskRecordId: id,
    coreBlock: 'task',
    status,
    title: status === 'done' ? '完成任务' : '未完成任务',
    pureText: status === 'done' ? '完成任务' : '未完成任务',
    day: '2026-08-26',
    actualStartDate: '2026-08-26',
    startMinute: 60,
    endMinute: 90,
    blockStartMinute: 60,
    blockEndMinute: 90,
    duration: 30,
    timelineSource: 'task-range',
    timelineEditTarget: { kind: 'task-range', recordId: id },
    timelineRange: { start: '2026-08-26T01:00', end: '2026-08-26T01:30' },
    isRangeStart: true,
    isRangeEnd: true,
    categoryKey: '任务',
    fileName: '目标.md',
    tags: [],
    created: 0,
    modified: 0,
    extra: {},
  } as any;
}

function pointerEvent(type: string, clientY: number, options: { pointerId?: number; pointerType?: string; button?: number } = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button: options.button ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: options.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType ?? 'mouse' });
  return event;
}

describe('Timeline task lifecycle status UI', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('renders completed and open tasks with different classes and visible status marks', async () => {
    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[taskBlock('open', 'task-open'), taskBlock('done', 'task-done')]}
        hourHeight={40}
        categoriesConfig={{}}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
      />,
      host,
    ));

    const open = host.querySelector('[data-task-status="open"]');
    const done = host.querySelector('[data-task-status="done"]');
    expect(open?.classList.contains('timeline-task-block--open')).toBe(true);
    expect(done?.classList.contains('timeline-task-block--done')).toBe(true);
    expect(open?.querySelector('.timeline-task-status')?.textContent).toBe('⏳');
    expect(done?.querySelector('.timeline-task-status')?.textContent).toBe('✅');
  });

  it('renders a start-only Task point without fabricating a duration block', async () => {
    const point = {
      ...taskBlock('open', 'task-point'),
      timelineSource: 'task-point',
      timelineEditTarget: { kind: 'task-point', recordId: 'task-point' },
      timelineRange: { start: '2026-08-14T10:00' },
      day: '2026-08-14',
      actualStartDate: '2026-08-14',
      duration: 0,
      startMinute: 600,
      endMinute: 600,
      blockStartMinute: 600,
      blockEndMinute: 600,
    } as any;
    await act(async () => {
      render(
        <DayColumnBody
          day="2026-08-14"
          blocks={[point]}
          hourHeight={60}
          categoriesConfig={{}}
          colorMap={{}}
          maxHours={24}
          onColumnClick={() => undefined}
        />,
        host,
      );
    });

    const node = host.querySelector('[data-timeline-kind="point"]') as HTMLElement | null;
    expect(node).not.toBeNull();
    expect(node?.classList.contains('timeline-task-block--point')).toBe(true);
    expect(node?.style.height).toBe('22px');
    expect(node?.querySelector('[aria-label="未完成"]')?.textContent).toBe('⏳');
  });

  it('removes the pencil path while keeping Session result, task open and range handles independent', async () => {
    const onOpenRecord = jest.fn();
    const session = {
      ...taskBlock('open', 'task-session-record'),
      id: 'task-session-record',
      taskRecordId: 'task-reopened',
      sessionRecordId: 'task-session-record',
      timelineSource: 'task-session',
      timelineEditTarget: { kind: 'task-session', recordId: 'task-session-record' },
      sessionResult: 'task-completed',
      title: '历史完成执行',
      pureText: '历史完成执行',
    } as any;

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[session]}
        hourHeight={40}
        categoriesConfig={{}}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onOpenRecord={onOpenRecord}
      />,
      host,
    ));

    const block = host.querySelector('[data-task-status="done"]');
    expect(block?.querySelector('.timeline-task-status')?.textContent).toBe('✅');
    expect(block?.getAttribute('title')).toContain('本次执行已完成任务');

    (host.querySelector('.timeline-task-link') as HTMLElement).click();
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-reopened' }));
    expect(host.querySelector('[aria-label="精确编辑"]')).toBeNull();
    expect(host.querySelector('[aria-label="拖动修改开始时间"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="拖动修改结束时间"]')).not.toBeNull();
  });

  it('previews locally while dragging and commits one full logical range on pointer up', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const block = taskBlock('open', 'task-drag');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        categoriesConfig={{}}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      task.dispatchEvent(pointerEvent('pointerdown', 60));
      task.dispatchEvent(pointerEvent('pointermove', 120));
      task.dispatchEvent(pointerEvent('pointerup', 120));
      await Promise.resolve();
    });

    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(1);
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-drag' },
      range: { start: '2026-08-26T02:00', end: '2026-08-26T02:30' },
    });
  });
});
