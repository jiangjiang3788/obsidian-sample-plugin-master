/** @jsxImportSource preact */
/**
 * Timeline pointer gesture browser regression.
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

function pointerEvent(type: string, clientY: number): PointerEvent {
  return createPointerEvent(type, { clientY, button: 0, pointerId: 1, pointerType: 'mouse' });
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

    // The suppression is short-lived and Timeline's normal "click = edit" contract
    // remains intact after the drag gesture has finished.
    nowSpy.mockReturnValue(1_351);
    await act(async () => {
      task.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenRecord).toHaveBeenCalledTimes(1);
  });
});
