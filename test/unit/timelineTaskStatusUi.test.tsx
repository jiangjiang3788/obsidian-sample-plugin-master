/** @jsxImportSource preact */
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
    categoryKey: '任务',
    fileName: '目标.md',
    tags: [],
    created: 0,
    modified: 0,
    extra: {},
  } as any;
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
      duration: 0,
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

  it('renders Session result independently and keeps task-open vs precise-edit gestures separate', async () => {
    const onOpenRecord = jest.fn();
    const onEditTask = jest.fn();
    const session = {
      ...taskBlock('open', 'task-session-record'),
      id: 'task-session-record',
      taskRecordId: 'task-reopened',
      sessionRecordId: 'task-session-record',
      timelineSource: 'task-session',
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
        onEditTask={onEditTask}
      />,
      host,
    ));

    const block = host.querySelector('[data-task-status="done"]');
    expect(block?.querySelector('.timeline-task-status')?.textContent).toBe('✅');
    expect(block?.getAttribute('title')).toContain('本次执行已完成任务');

    (host.querySelector('.timeline-task-link') as HTMLElement).click();
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-reopened' }));
    expect(onEditTask).not.toHaveBeenCalled();

    const preciseButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === '精确编辑') as HTMLButtonElement | undefined;
    expect(preciseButton).toBeDefined();
    preciseButton?.click();
    expect(onEditTask).toHaveBeenCalledWith(expect.objectContaining({ sessionRecordId: 'task-session-record' }));
  });

});
