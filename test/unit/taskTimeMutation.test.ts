import { TaskTimeMutation } from '@/core/services/item/TaskTimeMutation';

function taskRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
    schemaVersion: 2,
    coreBlock: 'task',
    status: 'done',
    title: '个地方官方',
    content: '个地方官方',
    tags: [],
    categoryKey: '任务',
    created: 0,
    modified: 0,
    extra: {},
    startAt: '2026-08-14T16:45',
    endAt: '2026-08-14T17:35',
    expectedDurationMinutes: 50,
    ...overrides,
  } as any;
}

describe('TaskTimeMutation', () => {
  it('updates a manual Task range instead of requiring TaskSession', async () => {
    let current = taskRecord();
    const repository = {
      getById: jest.fn(async () => current),
      update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
        current = { ...current, ...patch };
      }),
    } as any;
    const taskSessions = { updateSessionTime: jest.fn() } as any;
    const mutation = new TaskTimeMutation(repository, taskSessions);

    await mutation.update(current.id, { duration: 60 });

    expect(taskSessions.updateSessionTime).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(current.id, {
      startAt: '2026-08-14T16:45',
      endAt: '2026-08-14T17:45',
      expectedDurationMinutes: 60,
    });
  });

  it('dispatches TaskSession IDs back to TaskSessionMutation', async () => {
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

    await mutation.update(session.id, { duration: 40 });

    expect(taskSessions.updateSessionTime).toHaveBeenCalledWith(session.id, { duration: 40 });
  });
});
