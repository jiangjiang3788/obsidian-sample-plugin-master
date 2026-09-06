/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F052/unit
 */
import { TaskTimeMutation } from '@/core/services/item/TaskTimeMutation';

function taskRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
    coreBlock: 'task',
    status: 'done',
    title: '个地方官方',
    content: '个地方官方',
    tags: [],
    categoryKey: '任务',
    created: 0,
    modified: 0,
    extra: {},
    scheduledAt: '2026-08-14T15:00',
    startAt: '2026-08-14T16:45',
    endAt: '2026-08-14T17:35',
    expectedDurationMinutes: 50,
    ...overrides,
  } as any;
}

function repositoryFor(initial: any) {
  let current = initial;
  return {
    repository: {
      getById: jest.fn(async () => current),
      update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
        current = { ...current, ...patch };
      }),
    } as any,
    current: () => current,
  };
}

describe('TaskTimeMutation Timeline range boundary', () => {
  it('updates planned time without changing actual Task fields', async () => {
    const repo = repositoryFor(taskRecord());
    const taskSessions = { updateSessionTime: jest.fn() } as any;
    const mutation = new TaskTimeMutation(repo.repository, taskSessions);

    await mutation.updateTimelineRange(
      { kind: 'task-plan', recordId: repo.current().id },
      { start: '2026-08-14T15:30', end: '2026-08-14T16:45' },
    );

    expect(repo.repository.update).toHaveBeenCalledWith(repo.current().id, {
      scheduledAt: '2026-08-14T15:30',
      expectedDurationMinutes: 75,
    });
    expect(repo.current().startAt).toBe('2026-08-14T16:45');
    expect(repo.current().endAt).toBe('2026-08-14T17:35');
  });

  it('updates a legacy actual range without polluting expectedDurationMinutes', async () => {
    const repo = repositoryFor(taskRecord());
    const taskSessions = { updateSessionTime: jest.fn() } as any;
    const mutation = new TaskTimeMutation(repo.repository, taskSessions);

    await mutation.updateTimelineRange(
      { kind: 'task-range', recordId: repo.current().id },
      { start: '2026-08-14T17:00', end: '2026-08-14T18:10' },
    );

    expect(repo.repository.update).toHaveBeenCalledWith(repo.current().id, {
      startAt: '2026-08-14T17:00',
      endAt: '2026-08-14T18:10',
    });
    expect(repo.current().expectedDurationMinutes).toBe(50);
  });

  it('moves a legacy point by changing only startAt', async () => {
    const repo = repositoryFor(taskRecord({ endAt: undefined, expectedDurationMinutes: undefined }));
    const taskSessions = { updateSessionTime: jest.fn() } as any;
    const mutation = new TaskTimeMutation(repo.repository, taskSessions);

    await mutation.updateTimelineRange(
      { kind: 'task-point', recordId: repo.current().id },
      { start: '2026-08-15T09:20' },
    );

    expect(repo.repository.update).toHaveBeenCalledWith(repo.current().id, {
      startAt: '2026-08-15T09:20',
    });
  });

  it('dispatches an explicit TaskSession target to TaskSessionMutation', async () => {
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7YB',
      coreBlock: 'task-session',
      taskId: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
      sessionStartedAt: '2026-08-14T16:45:00',
      sessionEndedAt: '2026-08-14T17:35:00',
      sessionDurationMinutes: 50,
      sessionResult: 'task-completed',
      sessionSource: 'timer',
    } as any;
    const repository = { getById: jest.fn(async () => session) } as any;
    const taskSessions = { updateSessionTime: jest.fn(async () => session) } as any;
    const mutation = new TaskTimeMutation(repository, taskSessions);
    const range = { start: '2026-08-14T16:50', end: '2026-08-14T17:30' };

    await mutation.updateTimelineRange({ kind: 'task-session', recordId: session.id }, range);

    expect(taskSessions.updateSessionTime).toHaveBeenCalledWith(session.id, range);
  });
});
