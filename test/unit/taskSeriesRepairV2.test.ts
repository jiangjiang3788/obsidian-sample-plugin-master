import { TaskCompletionMutation } from '@/core/services/item/TaskCompletionMutation';
import type { Item } from '@/core/types/schema';
import type { DataStore } from '@/core/services/DataStore';
import type { RecordRepository } from '@/core/records/RecordRepository';

function record(id: string, coreBlock: string, extra: Partial<Item> = {}): Item {
  return { id, coreBlock, title: id, content: id, tags: [], goalPaths: [], categoryKey: coreBlock, created: 1, modified: 1, extra: {}, ...extra } as Item;
}

describe('Task Series deterministic repair', () => {
  it('repairs an invalid currentTaskId only when exactly one open instance exists', async () => {
    const series = record('taskseries.01J00000000000000000000010', 'task-series', {
      status: 'active',
      currentTaskId: 'task.01J00000000000000000009999',
      recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    });
    const task = record('task.01J00000000000000000000010', 'task', { status: 'open', seriesId: series.id });
    const repository = {
      getById: jest.fn(async (id: string) => id === series.id ? series : id === task.id ? task : null),
      update: jest.fn(async () => series),
    } as unknown as RecordRepository;
    const dataStore = { queryRecords: jest.fn(() => [series, task]) } as unknown as DataStore;
    const mutation = new TaskCompletionMutation(dataStore, repository);
    await expect(mutation.repairSeriesCurrentTask(series.id)).resolves.toBe('repaired');
    expect(repository.update).toHaveBeenCalledWith(series.id, { currentTaskId: task.id });
  });

  it('refuses ambiguous multi-open repair instead of guessing', async () => {
    const series = record('taskseries.01J00000000000000000000011', 'task-series', {
      status: 'active', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    });
    const taskA = record('task.01J00000000000000000000011', 'task', { status: 'open', seriesId: series.id });
    const taskB = record('task.01J00000000000000000000012', 'task', { status: 'open', seriesId: series.id });
    const repository = { getById: jest.fn(async (id: string) => id === series.id ? series : null), update: jest.fn() } as unknown as RecordRepository;
    const dataStore = { queryRecords: jest.fn(() => [series, taskA, taskB]) } as unknown as DataStore;
    const mutation = new TaskCompletionMutation(dataStore, repository);
    await expect(mutation.repairSeriesCurrentTask(series.id)).rejects.toThrow(`task_series_repair_ambiguous:${series.id}:2`);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
