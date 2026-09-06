/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 * @covers F126/regression
 */
import { TaskSessionMutation } from '@/core/services/item/TaskSessionMutation';

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-session.01KZZQ6G798KJN54XBGKJVH7TM',
    coreBlock: 'task-session',
    taskId: 'task.01KZZQ6G798KJN54XBGKJVH7TN',
    sessionStartedAt: '2026-08-26T23:00:00',
    sessionEndedAt: '2026-08-27T01:00:00',
    sessionDurationMinutes: 120,
    sessionResult: 'work-block-ended',
    sessionSource: 'timeline',
    ...overrides,
  } as any;
}

describe('TaskSession exact time mutation V4', () => {
  it('re-anchors edited end clock to the edited start day instead of keeping the old end date', async () => {
    let current = session();
    let savedPatch: Record<string, unknown> = {};
    const repository = {
      getById: jest.fn(async () => current),
      update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
        savedPatch = patch;
        current = { ...current, ...patch };
      }),
    } as any;
    const mutation = new TaskSessionMutation({} as any, repository);

    await mutation.updateSessionTime(current.id, { time: '22:00', endTime: '23:30' });

    expect(savedPatch?.sessionDurationMinutes).toBe(90);
    const start = Date.parse(String(savedPatch?.sessionStartedAt));
    const end = Date.parse(String(savedPatch?.sessionEndedAt));
    expect(end - start).toBe(90 * 60_000);
    expect(new Date(end).getDate()).toBe(new Date(start).getDate());
  });

  it('treats an earlier end clock as the following day', async () => {
    let current = session();
    let savedPatch: Record<string, unknown> = {};
    const repository = {
      getById: jest.fn(async () => current),
      update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
        savedPatch = patch;
        current = { ...current, ...patch };
      }),
    } as any;
    const mutation = new TaskSessionMutation({} as any, repository);

    await mutation.updateSessionTime(current.id, { time: '23:00', endTime: '01:00' });

    expect(savedPatch?.sessionDurationMinutes).toBe(120);
    const start = Date.parse(String(savedPatch?.sessionStartedAt));
    const end = Date.parse(String(savedPatch?.sessionEndedAt));
    expect(end - start).toBe(120 * 60_000);
  });
});
