/** @jsxImportSource preact */
/**
 * Timeline pointer gesture browser regression.
 * Kept separate from the 1.5 non-AI core gate because JSDOM pointer capture/event delivery
 * is not the release authority for Timeline data/model/persistence contracts.
 */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import { TIMELINE_TOUCH_POLICY, TimelineTouchScope } from '@/shared/ui/timeline/TimelineTouchGesture';
import { TimelineTouchScopeContext } from '@/shared/ui/timeline/useTimelineTouchGesture';
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

function pointerEvent(type: string, clientY: number): PointerEvent {
  return createPointerEvent(type, { clientY, button: 0, pointerId: 1, pointerType: 'mouse' });
}

function touchEvent(type: string, clientY: number, clientX = 24): TouchEvent {
  const touch = { identifier: 7, clientX, clientY } as Touch;
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  const activeTouches = type === 'touchend' || type === 'touchcancel' ? [] : [touch];
  Object.defineProperty(event, 'touches', { configurable: true, value: touchList(activeTouches) });
  Object.defineProperty(event, 'changedTouches', { configurable: true, value: touchList([touch]) });
  return event;
}

function touchList(items: Touch[]): TouchList {
  return {
    length: items.length,
    item: (index: number) => items[index] ?? null,
    [Symbol.iterator]: function* () { yield* items; },
    ...items.reduce((result, item, index) => ({ ...result, [index]: item }), {}),
  } as TouchList;
}

describe('Timeline pointer gesture UI', () => {
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

  it('previews locally while dragging, saves directly, and suppresses the synthetic edit click', async () => {
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
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      task.dispatchEvent(pointerEvent('pointerdown', 60));
      task.dispatchEvent(pointerEvent('pointermove', 120));
      task.dispatchEvent(pointerEvent('pointerup', 120));
    });
    await waitForUi(() => onUpdateTimelineRange.mock.calls.length === 1, '等待 Timeline 拖动范围提交');

    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(1);
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-drag' },
      range: { start: '2026-08-26T02:00', end: '2026-08-26T02:30' },
    });

    // Browsers may synthesize a click immediately after pointerup even though the user
    // performed a drag. That click must be consumed instead of reopening QuickInput.
    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenRecord).not.toHaveBeenCalled();

    // A later single click only selects; explicit desktop double-click edits.
    nowSpy.mockReturnValue(1_351);
    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenRecord).not.toHaveBeenCalled();
    await act(async () => {
      task.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
  });

  it('reveals mouse resize grips after selecting a task and commits start/end boundary drags', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[taskBlock('task-resize')]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onUpdateTimelineRange={onUpdateTimelineRange}
      />, host,
    ));
    const column = host.querySelector('.day-column-body') as HTMLElement;
    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440 }),
    });
    // Desktop follows the same selection-first affordance as touch: clicking
    // the task reveals its boundary controls before either edge can be dragged.
    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(task.classList.contains('timeline-task-block--edit-mode')).toBe(true);
    const startGrip = task.querySelector('.timeline-task-resize-handle--start') as HTMLElement;
    const endGrip = task.querySelector('.timeline-task-resize-handle--end') as HTMLElement;
    expect(startGrip).toBeTruthy();
    expect(endGrip).toBeTruthy();
    await act(async () => {
      startGrip.dispatchEvent(pointerEvent('pointerdown', 60));
      task.dispatchEvent(pointerEvent('pointermove', 75));
      task.dispatchEvent(pointerEvent('pointerup', 75));
    });
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-resize' },
      range: { start: '2026-08-26T01:15', end: '2026-08-26T01:30' },
    });
    await act(async () => {
      endGrip.dispatchEvent(pointerEvent('pointerdown', 90));
      task.dispatchEvent(pointerEvent('pointermove', 120));
      task.dispatchEvent(pointerEvent('pointerup', 120));
    });
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-resize' },
      range: { start: '2026-08-26T01:00', end: '2026-08-26T02:00' },
    });
    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(2);
  });

  it('keyboard handles adjust 5/15 minutes through the same range writer', async () => {
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    await act(async () => render(
      <DayColumnBody day="2026-08-26" blocks={[taskBlock('task-keyboard')]}
        hourHeight={60} colorMap={{}} maxHours={24}
        onColumnClick={() => undefined} onUpdateTimelineRange={onUpdateTimelineRange} />,
      host,
    ));
    const end = host.querySelector('.timeline-task-resize-handle--end') as HTMLElement;
    await act(async () => {
      end.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }));
    });
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-keyboard' },
      range: { start: '2026-08-26T01:00', end: '2026-08-26T01:35' },
    });
    await act(async () => {
      end.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowUp', shiftKey: true }));
    });
    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(2);
  });

  it('touch single-tap selects; two short taps edit exactly once without opening on swipe', async () => {
    const onOpenRecord = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await act(async () => render(
      <DayColumnBody
        day="2026-08-26"
        blocks={[taskBlock('task-double-tap')]}
        hourHeight={60}
        colorMap={{}}
        maxHours={24}
        onColumnClick={() => undefined}
        onOpenRecord={onOpenRecord}
      />, host,
    ));
    const column = host.querySelector('.day-column-body') as HTMLElement;
    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440 }),
    });
    await act(async () => {
      task.dispatchEvent(touchEvent('touchstart', 70, 24));
      task.dispatchEvent(touchEvent('touchend', 70, 24));
      task.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(task.classList.contains('timeline-task-block--edit-mode')).toBe(true);
    expect(onOpenRecord).not.toHaveBeenCalled();
    nowSpy.mockReturnValue(2_180);
    await act(async () => {
      task.dispatchEvent(touchEvent('touchstart', 71, 26));
      task.dispatchEvent(touchEvent('touchend', 71, 26));
      task.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      task.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
  });

  it('cancels touch edit arming when the finger swipes horizontally across a task', async () => {
    jest.useFakeTimers();
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const block = taskBlock('task-horizontal-scroll');

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
    const task = host.querySelector('.timeline-task-block') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      task.dispatchEvent(touchEvent('touchstart', 60, 24));
      task.dispatchEvent(touchEvent('touchmove', 61, 70));
      jest.advanceTimersByTime(400);
      task.dispatchEvent(touchEvent('touchend', 61, 70));
    });

    expect(task.classList.contains('timeline-task-block--touch-armed')).toBe(false);
    expect(onUpdateTimelineRange).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('long-presses blank timeline space then drags to create a selected time range', async () => {
    jest.useFakeTimers();
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
      column.dispatchEvent(touchEvent('touchstart', 60, 24));
      jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs);
    });
    expect(host.querySelector('.timeline-range-selection')).toBeTruthy();

    await act(async () => {
      column.dispatchEvent(touchEvent('touchmove', 120, 24));
      column.dispatchEvent(touchEvent('touchend', 120, 24));
    });

    expect(onColumnClick).toHaveBeenCalledTimes(1);
    expect(onColumnClick.mock.calls[0][0]).toBe('2026-08-26');
    expect(onColumnClick.mock.calls[0][2]).toEqual({ startMinute: 60, endMinute: 120 });
    jest.useRealTimers();
  });

  it('a second finger cancels an active range edit without creating a range or zoom', async () => {
    jest.useFakeTimers();
    const scope = new TimelineTouchScope();
    const onColumnClick = jest.fn();
    await act(async () => render(
      <TimelineTouchScopeContext.Provider value={scope}>
        <DayColumnBody
          day="2026-08-26"
          blocks={[]}
          hourHeight={60}
          colorMap={{}}
          maxHours={24}
          onColumnClick={onColumnClick}
        />
      </TimelineTouchScopeContext.Provider>, host,
    ));
    const column = host.querySelector('.day-column-body') as HTMLElement;
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });
    await act(async () => {
      column.dispatchEvent(touchEvent('touchstart', 60));
      jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs);
      column.dispatchEvent(touchEvent('touchmove', 120));
    });
    expect(host.querySelector('.timeline-range-selection')).toBeTruthy();
    let allowed: boolean | null = null;
    await act(async () => { allowed = scope.requestPinch(); });
    expect(allowed).toBe(false); // editing was already being dragged
    expect(host.querySelector('.timeline-range-selection')).toBeNull();
    await act(async () => { column.dispatchEvent(touchEvent('touchend', 120)); });
    expect(onColumnClick).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('requires a long press before touch drag commits a timeline move', async () => {
    jest.useFakeTimers();
    const onUpdateTimelineRange = jest.fn().mockResolvedValue(undefined);
    const onOpenRecord = jest.fn();
    const block = taskBlock('task-touch-drag');

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
    Object.defineProperty(column, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) }),
    });

    await act(async () => {
      task.dispatchEvent(touchEvent('touchstart', 60));
      jest.advanceTimersByTime(349);
      task.dispatchEvent(touchEvent('touchmove', 120));
      task.dispatchEvent(touchEvent('touchend', 120));
    });
    expect(onUpdateTimelineRange).not.toHaveBeenCalled();

    await act(async () => {
      task.dispatchEvent(touchEvent('touchstart', 60));
      jest.advanceTimersByTime(TIMELINE_TOUCH_POLICY.longPressMs);
      task.dispatchEvent(touchEvent('touchmove', 120));
      task.dispatchEvent(touchEvent('touchend', 120));
    });

    expect(onUpdateTimelineRange).toHaveBeenCalledTimes(1);
    expect(onUpdateTimelineRange).toHaveBeenCalledWith({
      target: { kind: 'task-range', recordId: 'task-touch-drag' },
      range: { start: '2026-08-26T02:00', end: '2026-08-26T02:30' },
    });
    expect(onOpenRecord).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

});
