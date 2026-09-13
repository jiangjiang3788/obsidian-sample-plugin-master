/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 * @covers F126/regression
 */
import { TaskSessionMutation } from '@/core/services/item/TaskSessionMutation';

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-session.01KZZQ6G798KJN54XBGKJVH7TM',
    recordType: 'task-session',
    taskId: 'task.01KZZQ6G798KJN54XBGKJVH7TN',
    sessionStartedAt: '2026-08-26T23:00:00',
    sessionEndedAt: '2026-08-27T01:00:00',
    sessionDurationMinutes: 120,
    sessionResult: 'work-block-ended',
    sessionSource: 'timeline',
    ...overrides,
  } as any;
}

describe('TaskSession full-range mutation V4', () => {
  it('persists the complete final range and derives duration from one truth source', async () => {
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

    await mutation.updateSessionTime(current.id, {
      start: '2026-08-26T22:00',
      end: '2026-08-26T23:30',
    });

    expect(savedPatch.sessionDurationMinutes).toBe(90);
    expect(Date.parse(String(savedPatch.sessionEndedAt)) - Date.parse(String(savedPatch.sessionStartedAt))).toBe(90 * 60_000);
  });

  it('keeps an explicit cross-midnight range instead of guessing from clock fields', async () => {
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

    await mutation.updateSessionTime(current.id, {
      start: '2026-08-26T23:30',
      end: '2026-08-27T01:15',
    });

    expect(savedPatch.sessionDurationMinutes).toBe(105);
    expect(Date.parse(String(savedPatch.sessionEndedAt)) - Date.parse(String(savedPatch.sessionStartedAt))).toBe(105 * 60_000);
  });
});
