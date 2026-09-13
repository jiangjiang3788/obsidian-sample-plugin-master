/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F050/integration
 * @covers F050/regression
 * @covers F051/error
 * @covers F051/integration
 * @covers F051/persistence
 * @covers F051/restart
 * @covers F052/error
 * @covers F052/integration
 * @covers F052/persistence
 * @covers F052/restart
 * @covers F055/error
 * @covers F055/integration
 * @covers F055/persistence
 * @covers F055/restart
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { RecordRepository } from '@/core/records/RecordRepository';
import { TaskCompletionMutation } from '@/core/services/item/TaskCompletionMutation';
import { TaskSessionMutation } from '@/core/services/item/TaskSessionMutation';
import { TaskTimeMutation } from '@/core/services/item/TaskTimeMutation';

const TASK_ID = 'task.01JWF7T20074QW3VAKQMEWSBH0';

function createEnvironment() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const storageFiles = new Map<string, unknown>();
  let clock = 1000;

  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter((path) => path.endsWith('.md'))),
    writeFile: jest.fn(async (path, content) => {
      files.set(path, content);
      clock += 1;
      stats.set(path, { ctime: stats.get(path)?.ctime ?? clock, mtime: clock, size: content.length });
    }),
    deleteFile: jest.fn(async (path) => { files.delete(path); stats.delete(path); }),
  };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => []) };
  const fileStat: FileStatPort = { stat: jest.fn(async (path) => stats.get(path) ?? null) };
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string) => {
      const value = storageFiles.get(path);
      return value == null ? null : JSON.parse(JSON.stringify(value)) as T;
    },
    writeJSON: jest.fn(async (path, data) => { storageFiles.set(path, JSON.parse(JSON.stringify(data))); }),
    remove: jest.fn(async (path) => { storageFiles.delete(path); }),
  };
  const boot = async () => {
    const dataStore = new DataStore(vault, metadata, fileStat, storage);
    await dataStore.warmStart();
    const repository = new RecordRepository(vault, dataStore);
    const sessions = new TaskSessionMutation(dataStore, repository);
    return {
      dataStore,
      repository,
      completion: new TaskCompletionMutation(dataStore, repository, sessions),
      sessions,
      time: new TaskTimeMutation(repository, sessions),
    };
  };
  return { files, boot };
}

describe('P0 Task 状态、时间、Session 的持久化与重启恢复', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('任务完成后重启仍为 done；重新打开后再次重启仍为 open；非法重复 reopen 明确失败', async () => {
    const env = createEnvironment();
    const first = await env.boot();
    await first.repository.create({
      recordId: TASK_ID,
      recordType: 'task',
      targetFilePath: 'tasks.md',
      fields: {
        status: 'open',
        content: '完成测试',
        startAt: '2026-08-24T09:00',
        expectedDurationMinutes: 60,
      },
    });

    await first.completion.completeItem(TASK_ID);
    expect(first.dataStore.getRecordById(TASK_ID)?.status).toBe('done');
    expect(first.dataStore.getRecordById(TASK_ID)?.completedAt).toBeTruthy();
    first.dataStore.dispose();

    const afterCompleteRestart = await env.boot();
    expect(afterCompleteRestart.dataStore.getRecordById(TASK_ID)?.status).toBe('done');
    await afterCompleteRestart.completion.reopenItem(TASK_ID);
    expect(afterCompleteRestart.dataStore.getRecordById(TASK_ID)?.status).toBe('open');
    expect(afterCompleteRestart.dataStore.getRecordById(TASK_ID)?.completedAt).toBeFalsy();
    afterCompleteRestart.dataStore.dispose();

    const afterReopenRestart = await env.boot();
    expect(afterReopenRestart.dataStore.getRecordById(TASK_ID)?.status).toBe('open');
    await expect(afterReopenRestart.completion.reopenItem(TASK_ID)).rejects.toThrow('task_transition_invalid:open:reopen');
    afterReopenRestart.dataStore.dispose();
  });

  it('修改实际任务时间范围后落盘，重启保持；计划时长独立且非法范围不会写坏任务', async () => {
    const env = createEnvironment();
    const first = await env.boot();
    await first.repository.create({
      recordId: TASK_ID,
      recordType: 'task',
      targetFilePath: 'tasks.md',
      fields: {
        status: 'open',
        content: '时间编辑测试',
        startAt: '2026-08-24T09:00',
        expectedDurationMinutes: 60,
      },
    });

    await first.time.updateTimelineRange(
      { kind: 'task-range', recordId: TASK_ID },
      { start: '2026-08-24T10:30', end: '2026-08-24T12:00' },
    );
    const changed = first.dataStore.getRecordById(TASK_ID);
    expect(changed?.startAt).toContain('2026-08-24T10:30');
    expect(changed?.endAt).toContain('2026-08-24T12:00');
    // Timeline actual-range edits no longer overwrite the Task planning duration.
    expect(changed?.expectedDurationMinutes).toBe(60);
    await expect(first.time.updateTimelineRange(
      { kind: 'task-range', recordId: TASK_ID },
      { start: '2026-08-24T12:00', end: '2026-08-24T12:00' },
    )).rejects.toThrow('timeline_range_time_order_invalid');
    expect(first.dataStore.getRecordById(TASK_ID)?.expectedDurationMinutes).toBe(60);
    first.dataStore.dispose();

    const restarted = await env.boot();
    const restored = restarted.dataStore.getRecordById(TASK_ID);
    expect(restored?.startAt).toContain('2026-08-24T10:30');
    expect(restored?.endAt).toContain('2026-08-24T12:00');
    expect(restored?.expectedDurationMinutes).toBe(60);
    restarted.dataStore.dispose();
  });

  it('TaskSession 写入与任务处于同一 Record 数据层，重启后 Session 仍可索引；非法 taskId 明确失败', async () => {
    const env = createEnvironment();
    const first = await env.boot();
    await first.repository.create({
      recordId: TASK_ID,
      recordType: 'task',
      targetFilePath: 'tasks.md',
      fields: { status: 'open', content: 'Session 测试' },
    });

    const session = await first.sessions.createSession(TASK_ID, {
      startedAt: '2026-08-24T09:00:00.000Z',
      endedAt: '2026-08-24T09:30:00.000Z',
      durationMinutes: 30,
      result: 'work-block-ended',
      source: 'timer',
    });
    expect(session.recordType).toBe('task-session');
    expect((session as any).taskId).toBe(TASK_ID);
    const sessionId = session.id;
    first.dataStore.dispose();

    const restarted = await env.boot();
    expect(restarted.dataStore.getRecordById(sessionId)?.recordType).toBe('task-session');
    expect((restarted.dataStore.getRecordById(sessionId) as any)?.taskId).toBe(TASK_ID);
    await expect(restarted.sessions.createSession('task.missing', {
      startedAt: '2026-08-24T10:00:00.000Z',
      endedAt: '2026-08-24T10:10:00.000Z',
      durationMinutes: 10,
      result: 'work-block-ended',
      source: 'timer',
    })).rejects.toThrow('task_record_required:task.missing');
    restarted.dataStore.dispose();
  });
});
