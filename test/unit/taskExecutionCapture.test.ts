/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F053/unit
 * @covers F083/unit
 * @covers F092/regression
 */
import { buildTimelineCompletedExecutionPersistence, buildTimelineCompletedExecutionSessionInput } from '@/core/records/task/taskExecutionCapture';

const timelineContext = {
  __recordUiContext: {
    kind: 'timeline_create',
    captureMode: 'completed_execution',
  },
};

describe('Timeline completed execution capture contract', () => {
  it('captures the finalized reverse-time range instead of recalculating it', () => {
    expect(buildTimelineCompletedExecutionSessionInput({
      context: timelineContext,
      taskFields: {
        status: 'done',
        startAt: '2026-08-26T09:30',
        endAt: '2026-08-26T10:00',
        expectedDurationMinutes: 30,
      },
    })).toEqual({
      startedAt: new Date('2026-08-26T09:30').toISOString(),
      endedAt: new Date('2026-08-26T10:00').toISOString(),
      durationMinutes: 30,
      result: 'task-completed',
      source: 'timeline',
    });
  });

  it('captures a create-only completed QuickInput range as a manual/unknown TaskSession fact', () => {
    expect(buildTimelineCompletedExecutionSessionInput({
      context: { __recordUiContext: { kind: 'quickinput_create', captureMode: 'completed_execution' } },
      taskFields: {
        status: 'done',
        startAt: '2026-08-26T09:30',
        endAt: '2026-08-26T10:00',
      },
    })).toEqual({
      startedAt: new Date('2026-08-26T09:30').toISOString(),
      endedAt: new Date('2026-08-26T10:00').toISOString(),
      durationMinutes: 30,
      result: 'task-completed',
      source: 'unknown',
    });
  });

  it('does not create execution history for ordinary QuickInput even if the Task is done', () => {
    expect(buildTimelineCompletedExecutionSessionInput({
      context: {},
      taskFields: {
        status: 'done',
        startAt: '2026-08-26T09:30',
        endAt: '2026-08-26T10:00',
      },
    })).toBeNull();
  });

  it('treats Timeline completed_execution as authoritative even when a stale form status is open', () => {
    expect(buildTimelineCompletedExecutionSessionInput({
      context: timelineContext,
      taskFields: {
        status: 'open',
        startAt: '2026-08-26T09:30',
        endAt: '2026-08-26T10:00',
      },
    })).toEqual({
      startedAt: new Date('2026-08-26T09:30').toISOString(),
      endedAt: new Date('2026-08-26T10:00').toISOString(),
      durationMinutes: 30,
      result: 'task-completed',
      source: 'timeline',
    });
  });

  it('still refuses to fabricate a Timeline Session when the execution range is invalid', () => {
    expect(buildTimelineCompletedExecutionSessionInput({
      context: timelineContext,
      taskFields: {
        status: 'done',
        startAt: '2026-08-26T10:00',
        endAt: '2026-08-26T09:30',
      },
    })).toBeNull();
  });
  it('stores Timeline actual time only in TaskSession while keeping completedAt on Task', () => {
    const result = buildTimelineCompletedExecutionPersistence({
      context: timelineContext,
      taskFields: {
        status: 'done',
        content: '反向补记',
        startAt: '2026-08-26T09:30',
        endAt: '2026-08-26T10:00',
        expectedDurationMinutes: 30,
        completedAt: '2026-08-26T10:00',
      },
    });

    expect(result.session).toEqual({
      startedAt: new Date('2026-08-26T09:30').toISOString(),
      endedAt: new Date('2026-08-26T10:00').toISOString(),
      durationMinutes: 30,
      result: 'task-completed',
      source: 'timeline',
    });
    expect(result.taskFields).toMatchObject({
      status: 'done',
      content: '反向补记',
      completedAt: '2026-08-26T10:00',
    });
    expect(result.taskFields).not.toHaveProperty('startAt');
    expect(result.taskFields).not.toHaveProperty('endAt');
    expect(result.taskFields).not.toHaveProperty('expectedDurationMinutes');
  });

  it('does not strip ordinary QuickInput Task timing fields', () => {
    const result = buildTimelineCompletedExecutionPersistence({
      context: {},
      taskFields: { status: 'done', startAt: '2026-08-26T09:30', endAt: '2026-08-26T10:00', expectedDurationMinutes: 30 },
    });
    expect(result.session).toBeNull();
    expect(result.taskFields).toMatchObject({
      startAt: '2026-08-26T09:30',
      endAt: '2026-08-26T10:00',
      expectedDurationMinutes: 30,
    });
  });

});
