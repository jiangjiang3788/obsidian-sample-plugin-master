/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F053/integration
 * @covers F053/persistence
 * @covers F053/restart
 * @covers F054/error
 * @covers F054/integration
 * @covers F054/regression
 * @covers F054/restart
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { RecordRepository } from '@/core/records/RecordRepository';
import { TaskCompletionMutation } from '@/core/services/item/TaskCompletionMutation';

const SERIES_ID = 'taskseries.01JWF7T20074QW3VAKQMEWSBJ0';
const FIRST_TASK_ID = 'task.01JWF7T20074QW3VAKQMEWSBJ1';
const EXTRA_TASK_ID = 'task.01JWF7T20074QW3VAKQMEWSBJ2';

function createEnvironment() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const storageFiles = new Map<string, unknown>();
  let clock = 5000;

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
    return { dataStore, repository, completion: new TaskCompletionMutation(dataStore, repository) };
  };
  return { boot };
}

describe('P0 循环任务与 TaskSeries 在真实 Record 数据层的长期一致性', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('完成当前周期任务会创建下一次任务并更新 Series 指针，重启后关系保持一致', async () => {
    const env = createEnvironment();
    const first = await env.boot();

    await first.repository.batch([
      {
        kind: 'create',
        record: {
          recordId: SERIES_ID,
          coreBlock: 'task-series',
          targetFilePath: 'tasks.md',
          fields: {
            status: 'active',
            content: '每周复盘',
            recurrenceUnit: 'week',
            recurrenceInterval: 1,
            recurrenceAnchor: 'scheduled',
            seriesStartDate: '2026-08-24',
            currentTaskId: FIRST_TASK_ID,
          },
        },
      },
      {
        kind: 'create',
        record: {
          recordId: FIRST_TASK_ID,
          coreBlock: 'task',
          targetFilePath: 'tasks.md',
          fields: {
            status: 'open',
            content: '每周复盘',
            scheduledDate: '2026-08-24',
            seriesId: SERIES_ID,
          },
        },
      },
    ]);

    await first.completion.completeItem(FIRST_TASK_ID);
    const completed = first.dataStore.getRecordById(FIRST_TASK_ID);
    const series = first.dataStore.getRecordById(SERIES_ID) as any;
    expect(completed?.status).toBe('done');
    expect(series?.currentTaskId).toBeTruthy();
    expect(series?.currentTaskId).not.toBe(FIRST_TASK_ID);

    const nextTaskId = String(series.currentTaskId);
    const next = first.dataStore.getRecordById(nextTaskId) as any;
    expect(next?.coreBlock).toBe('task');
    expect(next?.status).toBe('open');
    expect(next?.seriesId).toBe(SERIES_ID);
    expect(next?.scheduledDate).toBe('2026-08-31');
    first.dataStore.dispose();

    const restarted = await env.boot();
    expect(restarted.dataStore.getRecordById(FIRST_TASK_ID)?.status).toBe('done');
    expect((restarted.dataStore.getRecordById(SERIES_ID) as any)?.currentTaskId).toBe(nextTaskId);
    expect((restarted.dataStore.getRecordById(nextTaskId) as any)?.scheduledDate).toBe('2026-08-31');
    restarted.dataStore.dispose();
  });

  it('Series 指针损坏时只在“恰好一个 open 实例”时自动修复；多个候选时拒绝猜测', async () => {
    const env = createEnvironment();
    const first = await env.boot();
    await first.repository.batch([
      {
        kind: 'create',
        record: {
          recordId: SERIES_ID,
          coreBlock: 'task-series',
          targetFilePath: 'tasks.md',
          fields: {
            status: 'active',
            content: '系列修复',
            recurrenceUnit: 'week',
            recurrenceInterval: 1,
            recurrenceAnchor: 'scheduled',
            currentTaskId: 'task.01JWF7T20074QW3VAKQMEWSBZZ',
          },
        },
      },
      {
        kind: 'create',
        record: {
          recordId: FIRST_TASK_ID,
          coreBlock: 'task',
          targetFilePath: 'tasks.md',
          fields: { status: 'open', content: '唯一候选', seriesId: SERIES_ID },
        },
      },
    ]);

    await expect(first.completion.repairSeriesCurrentTask(SERIES_ID)).resolves.toBe('repaired');
    expect((first.dataStore.getRecordById(SERIES_ID) as any)?.currentTaskId).toBe(FIRST_TASK_ID);

    await first.repository.create({
      recordId: EXTRA_TASK_ID,
      coreBlock: 'task',
      targetFilePath: 'tasks.md',
      fields: { status: 'open', content: '第二候选', seriesId: SERIES_ID },
    });
    await first.repository.update(SERIES_ID, { currentTaskId: 'task.01JWF7T20074QW3VAKQMEWSBYY' });

    await expect(first.completion.repairSeriesCurrentTask(SERIES_ID)).rejects.toThrow(`task_series_repair_ambiguous:${SERIES_ID}:2`);
    expect((first.dataStore.getRecordById(SERIES_ID) as any)?.currentTaskId).toBe('task.01JWF7T20074QW3VAKQMEWSBYY');
    first.dataStore.dispose();
  });
});
