/** @jsxImportSource preact */
/**
 * Timeline direct-manipulation browser regression.
 * Kept separate from the 1.5 non-AI core gate because JSDOM pointer capture/event delivery
 * is not the release authority for Timeline data/model/persistence contracts.
 */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import { DayColumnBody } from '@/features/views/runtime/components/timeline/DayColumnBody';

function taskBlock(id: string) {
  return {
    id,
    taskRecordId: id,
    recordType: 'task',
    status: 'open',
    title: '未完成任务',
    pureText: '未完成任务',
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
  } as any;
}

function pointerEvent(
  type: string,
  clientY: number,
  pointerType: 'mouse' | 'touch' | 'pen' = 'mouse',
  clientX = 24,
  pointerId = 1,
): PointerEvent {
  return createPointerEvent(type, { clientY, clientX, button: 0, pointerId, pointerType });
}

describe('Timeline direct-manipulation UI', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    render(null, host);
    host.remove();
  });

  it('moves only from the explicit grip; single click stays inert and double click edits', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const onOpenRecord = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const block = taskBlock('task-drag');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
        onOpenRecord={onOpenRecord}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    const moveHandle = host.querySelector('.timeline-task-move-handle') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      moveHandle.dispatchEvent(pointerEvent('pointerdown', 60));
      moveHandle.dispatchEvent(pointerEvent('pointermove', 120));
      moveHandle.dispatchEvent(pointerEvent('pointerup', 120));
    });
    await waitForUi(() => onUpdateTimelineRange.mock.calls.length === 1, '等待 Timeline 握柄拖动范围提交');

    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(1);
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-drag' },
      range: { start: '2026-08-26T02:00', end: '2026-08-26T02:30' },
    });

    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onOpenRecord).not.toHaveBeenCalled();

    nowSpy.mockReturnValue(1_351);
    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      task.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);

    const taskButtons = host.querySelector('.task-buttons') as HTMLElement;
    await act(async () => {
      taskButtons.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
  });

  it('keeps resize boundaries independent from the move grip', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const block = taskBlock('task-resize');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    const startHandle = host.querySelector('.timeline-task-resize-handle--start') as HTMLElement;
    const endHandle = host.querySelector('.timeline-task-resize-handle--end') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      startHandle.dispatchEvent(pointerEvent('pointerdown', 60));
      startHandle.dispatchEvent(pointerEvent('pointermove', 75));
      startHandle.dispatchEvent(pointerEvent('pointerup', 75));
    });
    await waitForUi(() => onUpdateTimelineRange.mock.calls.length === 1, '等待 Timeline 开始边界提交');
    expect(onUpdateTimelineRange.mock.calls[0][0]).toEqual({
      target: { kind: 'task-range', recordId: 'task-resize' },
      range: { start: '2026-08-26T01:15', end: '2026-08-26T01:30' },
    });

    await act(async () => {
      endHandle.dispatchEvent(pointerEvent('pointerdown', 90, 'mouse', 80, 2));
      endHandle.dispatchEvent(pointerEvent('pointermove', 120, 'mouse', 80, 2));
      endHandle.dispatchEvent(pointerEvent('pointerup', 120, 'mouse', 80, 2));
    });
    await waitForUi(() => onUpdateTimelineRange.mock.calls.length === 2, '等待 Timeline 结束边界提交');
    expect(onUpdateTimelineRange.mock.calls[1][0]).toEqual({
      target: { kind: 'task-range', recordId: 'task-resize' },
      range: { start: '2026-08-26T01:00', end: '2026-08-26T02:00' },
    });
  });

  it('keeps task-body touch movement as native pan instead of arming a timeline edit', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const onOpenRecord = jest.fn();
    const block = taskBlock('task-scroll');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
        onOpenRecord={onOpenRecord}
      />,
      host,
    ));

    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    await act(async () => {
      task.dispatchEvent(pointerEvent('pointerdown', 60, 'touch', 24, 7));
      task.dispatchEvent(pointerEvent('pointermove', 122, 'touch', 25, 7));
      task.dispatchEvent(pointerEvent('pointercancel', 122, 'touch', 25, 7));
    });

    expect(onUpdateTimelineRange).not.toHaveBeenCalled();
    expect(onOpenRecord).not.toHaveBeenCalled();
    expect(task.classList.contains('timeline-task-block--dragging')).toBe(false);
  });

  it('supports touch double-tap edit without making a single tap edit', async () => {
    const onOpenRecord = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now');
    const block = taskBlock('task-double-tap');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onOpenRecord={onOpenRecord}
      />,
      host,
    ));

    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    nowSpy.mockReturnValue(1_000);
    await act(async () => {
      task.dispatchEvent(pointerEvent('pointerdown', 70, 'touch', 30, 8));
      task.dispatchEvent(pointerEvent('pointerup', 70, 'touch', 30, 8));
    });
    expect(onOpenRecord).not.toHaveBeenCalled();

    nowSpy.mockReturnValue(1_250);
    await act(async () => {
      task.dispatchEvent(pointerEvent('pointerdown', 70, 'touch', 31, 9));
      task.dispatchEvent(pointerEvent('pointerup', 70, 'touch', 31, 9));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
  });

  it('never turns a one-finger blank-column swipe into touch range creation', async () => {
    const onColumnClick = jest.fn();

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={onColumnClick}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const down = pointerEvent('pointerdown', 60, 'touch', 96, 11);
    const move = pointerEvent('pointermove', 120, 'touch', 96, 11);
    const up = pointerEvent('pointerup', 120, 'touch', 96, 11);
    await act(async () => {
      column.dispatchEvent(down);
      column.dispatchEvent(move);
      column.dispatchEvent(up);
    });

    expect(onColumnClick).not.toHaveBeenCalled();
    expect(down.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(up.defaultPrevented).toBe(false);
    expect(host.querySelector('.timeline-range-create-rail')).toBeNull();
    expect(host.querySelector('.timeline-range-selection')).toBeNull();
  });

  it('keeps mouse drag-selection for precise desktop range creation', async () => {
    const onColumnClick = jest.fn();

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={onColumnClick}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      column.dispatchEvent(pointerEvent('pointerdown', 60, 'mouse', 50, 12));
      column.dispatchEvent(pointerEvent('pointermove', 120, 'mouse', 50, 12));
      column.dispatchEvent(pointerEvent('pointerup', 120, 'mouse', 50, 12));
    });

    expect(onColumnClick).toHaveBeenCalledTimes(1);
    expect(onColumnClick.mock.calls[0][2]).toEqual({ startMinute: 60, endMinute: 120 });
  });

  it('uses the same explicit move grip for touch without a long-press delay', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const block = taskBlock('task-touch-grip');

    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[block]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
      />,
      host,
    ));

    const column = host.querySelector('.day-column-body') as HTMLElement;
    const moveHandle = host.querySelector('.timeline-task-move-handle') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      moveHandle.dispatchEvent(pointerEvent('pointerdown', 60, 'touch', 10, 12));
      moveHandle.dispatchEvent(pointerEvent('pointermove', 120, 'touch', 10, 12));
      moveHandle.dispatchEvent(pointerEvent('pointerup', 120, 'touch', 10, 12));
    });

    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(1);
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-touch-grip' },
      range: { start: '2026-08-26T02:00', end: '2026-08-26T02:30' },
    });
  });
});
