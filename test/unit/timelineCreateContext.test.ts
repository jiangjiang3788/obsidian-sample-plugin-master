import { getRecordTypeById, RECORD_TYPE_IDS } from '@core/recordTypes/public';
import type { TaskBlock } from '@core/types/public';
import { hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import type { QuickInputFieldSourceMap } from '@/features/quickinput/editor/model/types';
import { resolveTimelineCreateContext } from '@/app/actions/recordCreate/timelineCreateAction';

function block(input: Partial<TaskBlock> & Pick<TaskBlock, 'blockStartMinute' | 'blockEndMinute'>): TaskBlock {
  return {
    id: input.id || `block-${input.blockStartMinute}-${input.blockEndMinute}`,
    taskRecordId: input.taskRecordId || input.id || `task-${input.blockStartMinute}-${input.blockEndMinute}`,
    blockStartMinute: input.blockStartMinute,
    blockEndMinute: input.blockEndMinute,
    day: input.day || '2026-05-13',
    startMinute: input.startMinute ?? input.blockStartMinute,
    endMinute: input.endMinute ?? input.blockEndMinute,
    duration: input.duration ?? Math.max(0, input.blockEndMinute - input.blockStartMinute),
    pureText: input.pureText || 'task',
    actualStartDate: input.actualStartDate || '2026-05-13',
    title: input.title || 'task',
    coreBlock: 'task',
    categoryKey: '任务',
  } as TaskBlock;
}

function hydrateTaskContext(context: Record<string, unknown>, current: Record<string, unknown> = {}, fieldSources: QuickInputFieldSourceMap = {}) {
  const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
  if (!template) throw new Error('Task template missing');
  return hydrateQuickInputTemplateDefaults({
    template,
    context,
    current,
    fieldSources,
    selectedGoal: null,
    currentGoalPath: null,
    currentGoalTitle: null,
    currentPeriod: null,
    timeDirection: 'forward',
  });
}

describe('Timeline create context', () => {
  it('restores the old gap-filling behavior between tasks and is order-independent', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        block({ id: 'next', blockStartMinute: 120, blockEndMinute: 180 }),
        block({ id: 'prev-old', blockStartMinute: 0, blockEndMinute: 40 }),
        block({ id: 'prev-nearest', blockStartMinute: 40, blockEndMinute: 80 }),
      ],
    });

    expect(result.suggestedStartMinute).toBe(80);
    expect(result.suggestedEndMinute).toBe(120);
    expect(result.previousBlock?.id).toBe('prev-nearest');
    expect(result.nextBlock?.id).toBe('next');
    expect(result.context).toMatchObject({
      日期: '2026-05-13',
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
      时间: '01:20',
      结束: '02:00',
      __recordUiContext: {
        kind: 'timeline_create',
        timeContext: {
          date: '2026-05-13',
          clickedMinute: 90,
          suggestedStartMinute: 80,
          suggestedEndMinute: 120,
          startSource: 'previous_block_end',
          endSource: 'next_block_start',
          previousBlockId: 'prev-nearest',
          nextBlockId: 'next',
        },
      },
    });
  });

  it('starts at the clicked slot before the first task and closes at the next task', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 60,
      dayBlocks: [block({ id: 'first', blockStartMinute: 120, blockEndMinute: 180 })],
    });

    expect(result.context).toMatchObject({
      startAt: '2026-05-13T01:00',
      endAt: '2026-05-13T02:00',
      __recordUiContext: {
        timeContext: {
          startSource: 'clicked_slot',
          endSource: 'next_block_start',
        },
      },
    });
  });

  it('starts from the previous task end after the last task and leaves the end open', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 240,
      dayBlocks: [block({ id: 'last', blockStartMinute: 120, blockEndMinute: 180 })],
    });

    expect(result.context.startAt).toBe('2026-05-13T03:00');
    expect(result.context['时间']).toBe('03:00');
    expect(result.context).not.toHaveProperty('endAt');
    expect(result.context).not.toHaveProperty('结束');
    expect(result.context).toMatchObject({
      __recordUiContext: {
        timeContext: {
          suggestedStartMinute: 180,
          suggestedEndMinute: null,
          startSource: 'previous_block_end',
          endSource: 'open_end',
        },
      },
    });
  });

  it('does not invent a zero-duration end when two blocks touch at the clicked boundary', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 120,
      dayBlocks: [
        block({ id: 'prev', blockStartMinute: 60, blockEndMinute: 120 }),
        block({ id: 'next', blockStartMinute: 120, blockEndMinute: 180 }),
      ],
    });

    expect(result.suggestedStartMinute).toBe(120);
    expect(result.suggestedEndMinute).toBeNull();
    expect(result.context.startAt).toBe('2026-05-13T02:00');
    expect(result.context).not.toHaveProperty('endAt');
  });

  it('clamps click geometry to the current day instead of emitting invalid clock values', () => {
    expect(resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: -30, dayBlocks: [] }).context.startAt)
      .toBe('2026-05-13T00:00');
    expect(resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: 2000, dayBlocks: [] }).context.startAt)
      .toBe('2026-05-13T23:59');
  });

  it('hydrates canonical Task datetime fields and derives the gap duration', () => {
    const resolved = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        block({ blockStartMinute: 40, blockEndMinute: 80 }),
        block({ blockStartMinute: 120, blockEndMinute: 180 }),
      ],
    });
    const hydrated = hydrateTaskContext(resolved.context);

    expect(hydrated.formData).toMatchObject({
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 40,
    });
    expect(hydrated.fieldSources).toMatchObject({
      startAt: 'context',
      endAt: 'context',
      expectedDurationMinutes: 'system_auto',
    });
  });

  it('never overwrites a user-owned Task time with invocation context on re-hydration', () => {
    const resolved = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        block({ blockStartMinute: 40, blockEndMinute: 80 }),
        block({ blockStartMinute: 120, blockEndMinute: 180 }),
      ],
    });
    const first = hydrateTaskContext(resolved.context);
    const second = hydrateTaskContext(
      resolved.context,
      { ...first.formData, startAt: '2026-05-13T01:35' },
      { ...first.fieldSources, startAt: 'user' },
    );

    expect(second.formData.startAt).toBe('2026-05-13T01:35');
    expect(second.fieldSources.startAt).toBe('user');
  });
});
