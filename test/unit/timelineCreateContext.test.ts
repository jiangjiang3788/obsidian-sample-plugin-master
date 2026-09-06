/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F092/unit
 */
import { getRecordTypeById, RECORD_TYPE_IDS } from '@core/recordTypes/public';
import type { TaskBlock } from '@core/types/public';
import { applyQuickInputFieldUpdate, applyQuickInputTimeDirectionChange, hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import { buildQuickInputDisplayTemplate } from '@/features/quickinput/editor/model/displayTemplate';
import type { QuickInputFieldSourceMap } from '@/features/quickinput/editor/model/types';
import { resolveTimelineCreateContext, resolveTimelineSelectedRangeContext } from '@/app/actions/recordCreate/timelineCreateAction';

function block(input: Partial<TaskBlock> & Pick<TaskBlock, 'blockStartMinute' | 'blockEndMinute'>): TaskBlock {
  return {
    id: input.id || `block-${input.blockStartMinute}-${input.blockEndMinute}`,
    taskRecordId: input.taskRecordId || input.id || `task-${input.blockStartMinute}-${input.blockEndMinute}`,
    timelineSource: input.timelineSource || 'task-range',
    timelineEditTarget: input.timelineEditTarget || { kind: 'task-range', recordId: input.taskRecordId || input.id || `task-${input.blockStartMinute}-${input.blockEndMinute}` },
    timelineRange: input.timelineRange || { start: '2026-05-13T00:00', end: '2026-05-13T00:05' },
    blockStartMinute: input.blockStartMinute,
    blockEndMinute: input.blockEndMinute,
    isRangeStart: input.isRangeStart ?? true,
    isRangeEnd: input.isRangeEnd ?? true,
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

function hydrateTaskContext(context: Record<string, unknown>, current: Record<string, unknown> = {}, fieldSources: QuickInputFieldSourceMap = {}, timeDirection: 'forward' | 'backward' = 'forward') {
  const rawTemplate = getRecordTypeById(RECORD_TYPE_IDS.TASK);
  if (!rawTemplate) throw new Error('Task template missing');
  const template = buildQuickInputDisplayTemplate(rawTemplate, RECORD_TYPE_IDS.TASK, [], { taskTimingMode: 'execution' });
  if (!template) throw new Error('Task execution template missing');
  return hydrateQuickInputTemplateDefaults({
    template,
    context,
    current,
    fieldSources,
    selectedGoal: null,
    currentGoalPath: null,
    currentGoalTitle: null,
    currentPeriod: null,
    timeDirection,
  });
}

describe('Timeline create context', () => {
  it('uses an explicit drag range without neighbouring gap inference', () => {
    const result = resolveTimelineSelectedRangeContext({
      day: '2026-05-13',
      startMinute: 9 * 60 + 15,
      endMinute: 10 * 60 + 45,
      maxHours: 24,
    });

    expect(result).toMatchObject({
      startMinute: 555,
      endMinute: 645,
      context: {
        status: 'done',
        startAt: '2026-05-13T09:15',
        endAt: '2026-05-13T10:45',
        __recordUiContext: {
          kind: 'timeline_create',
          captureMode: 'completed_execution',
          timeContext: { startSource: 'drag_selection', endSource: 'drag_selection' },
        },
      },
    });
  });

  it('preserves a drag ending at 24:00 as next-day 00:00', () => {
    const result = resolveTimelineSelectedRangeContext({
      day: '2026-05-13',
      startMinute: 23 * 60 + 45,
      endMinute: 24 * 60,
      maxHours: 24,
    });

    expect(result).toMatchObject({
      startMinute: 1425,
      endMinute: 1440,
      context: {
        startAt: '2026-05-13T23:45',
        endAt: '2026-05-14T00:00',
      },
    });
  });

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
        captureMode: 'completed_execution',
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

  it('uses 00:00 as the first blank-interval boundary before the first task', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 60,
      dayBlocks: [block({ id: 'first', blockStartMinute: 120, blockEndMinute: 180 })],
    });

    expect(result.context).toMatchObject({
      status: 'done',
      __timeDirection: 'backward',
      startAt: '2026-05-13T00:00',
      endAt: '2026-05-13T02:00',
      __recordUiContext: {
        timeContext: {
          startSource: 'day_start',
          endSource: 'next_block_start',
        },
      },
    });
  });

  it('uses the clicked slot as the provisional end after the last task', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 240,
      dayBlocks: [block({ id: 'last', blockStartMinute: 120, blockEndMinute: 180 })],
    });

    expect(result.context.startAt).toBe('2026-05-13T03:00');
    expect(result.context.endAt).toBe('2026-05-13T04:00');
    expect(result.context['时间']).toBe('03:00');
    expect(result.context['结束']).toBe('04:00');
    expect(result.context).toMatchObject({
      __recordUiContext: {
        timeContext: {
          suggestedStartMinute: 180,
          suggestedEndMinute: 240,
          startSource: 'previous_block_end',
          endSource: 'clicked_slot',
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
  });


  it('creates the first Timeline Task from 00:00 to the clicked slot and defaults it completed', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-08-26',
      clickedMinute: 9 * 60 + 25,
      dayBlocks: [],
    });

    expect(result.context).toMatchObject({
      日期: '2026-08-26',
      status: 'done',
      __timeDirection: 'backward',
      startAt: '2026-08-26T00:00',
      endAt: '2026-08-26T09:25',
      时间: '00:00',
      结束: '09:25',
      __recordUiContext: {
        kind: 'timeline_create',
        timeContext: {
          clickedMinute: 565,
          suggestedStartMinute: 0,
          suggestedEndMinute: 565,
          startSource: 'day_start',
          endSource: 'clicked_slot',
          previousBlockId: null,
          nextBlockId: null,
        },
      },
    });
  });

  it('clamps click geometry to the current day instead of emitting invalid clock values', () => {
    expect(resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: -30, dayBlocks: [] }).context.startAt)
      .toBe('2026-05-13T00:00');
    const late = resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: 2000, dayBlocks: [] });
    expect(late.context.startAt).toBe('2026-05-13T00:00');
    expect(late.context.endAt).toBe('2026-05-13T23:59');
  });

  it('uses the configured visible-day boundary for click clamping instead of assuming 24 hours', () => {
    const result = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 900,
      maxHours: 12,
      dayBlocks: [],
    });
    expect(result.clickedMinute).toBe(719);
    expect(result.context.startAt).toBe('2026-05-13T00:00');
    expect(result.context.endAt).toBe('2026-05-13T11:59');
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

  it('treats Timeline gap context as a seed so backward linked edits are not restored to the original gap', () => {
    const resolved = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        block({ blockStartMinute: 40, blockEndMinute: 80 }),
        block({ blockStartMinute: 120, blockEndMinute: 180 }),
      ],
    });
    const first = hydrateTaskContext(resolved.context);
    const backward = applyQuickInputTimeDirectionChange({
      formData: first.formData,
      fieldSources: first.fieldSources,
      nextDirection: 'backward',
      timeFieldSet: 'task',
    });
    const edited = applyQuickInputFieldUpdate({
      formData: backward.formData,
      fieldSources: backward.fieldSources,
      key: 'expectedDurationMinutes',
      value: 20,
      timeDirection: 'backward',
    });

    expect(edited.formData).toMatchObject({
      startAt: '2026-05-13T01:40',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 20,
    });
    expect(edited.fieldSources.startAt).toBe('system_auto');

    const rehydrated = hydrateTaskContext(
      resolved.context,
      edited.formData,
      edited.fieldSources,
      'backward',
    );

    expect(rehydrated.formData).toMatchObject({
      startAt: '2026-05-13T01:40',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 20,
    });
  });

  it('lets the user clear a Timeline-suggested time instead of immediately restoring it', () => {
    const resolved = resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: 90, dayBlocks: [] });
    const first = hydrateTaskContext(resolved.context);
    const cleared = {
      ...first.formData,
      startAt: '',
    };
    const sources = {
      ...first.fieldSources,
      startAt: 'user',
    } as QuickInputFieldSourceMap;

    const rehydrated = hydrateTaskContext(resolved.context, cleared, sources);
    expect(rehydrated.formData.startAt).toBe('');
    expect(rehydrated.fieldSources.startAt).toBe('user');
  });

});
