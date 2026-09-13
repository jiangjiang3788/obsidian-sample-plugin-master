/** @jsxImportSource preact */
/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import { DayColumnBody } from '@/features/views/runtime/components/timeline/DayColumnBody';

function taskBlock(status: 'open' | 'done', id: string) {
  return {
    id,
    taskRecordId: id,
    recordType: 'task',
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
    fileName: '目标.md',
    tags: [],
    created: 0,
    modified: 0,
    extra: {},
    goalPath: '测试目标',
  } as any;
}

function pointerEvent(type: string, clientY: number, options: { pointerId?: number; pointerType?: string; button?: number } = {}) {
  return createPointerEvent(type, { clientY, button: options.button ?? 0, pointerId: options.pointerId ?? 1, pointerType: options.pointerType ?? 'mouse' });
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
    const onOpenRecordOrigin = jest.fn();
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
        colorMap={{ '测试目标': '#f59e0b' }}
        maxHours={24}
        onColumnClick={() => undefined}
        onOpenRecord={onOpenRecord}
        onOpenRecordOrigin={onOpenRecordOrigin}
      />,
      host,
    ));

    const block = host.querySelector('[data-task-status="done"]');
    expect((block as HTMLElement | null)?.style.getPropertyValue('--timeline-goal-color')).toBe('#f59e0b');
    expect(block?.querySelector('.timeline-task-indicator')).toBeNull();
    expect(block?.getAttribute('data-record-type')).toBeNull();
    expect(block?.querySelector('.timeline-task-status')?.textContent).toBe('✅');
    expect(block?.getAttribute('title')).toContain('本次执行已完成任务');

    (block as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-reopened' }));

    (block as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(onOpenRecordOrigin).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-session-record' }));

    const alignmentControls = host.querySelector('.task-buttons');
    if (alignmentControls) {
      alignmentControls.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
    expect(onOpenRecordOrigin).toHaveBeenCalledTimes(1);

    const taskLink = host.querySelector('.timeline-task-link') as HTMLElement;
    taskLink.focus();
    taskLink.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(onOpenRecord).toHaveBeenCalledTimes(2);

    expect(host.querySelector('[aria-label="精确编辑"]')).toBeNull();
    expect(host.querySelector('[aria-label="拖动修改开始时间"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="拖动修改结束时间"]')).not.toBeNull();
  });
});
