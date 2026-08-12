import { TaskCompletionMutation } from '@core/services/item/TaskCompletionMutation';
import type { RecordViewItem } from '@core/types/public';

const taskId = 'task.01J00000000000000000000000';
const seriesId = 'taskseries.01J00000000000000000000000';

function openTask(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: taskId,
    schemaVersion: 2,
    coreBlock: 'task',
    status: 'open',
    title: 'Current',
    content: 'Current',
    tags: [],
    categoryKey: '',
    created: 0,
    modified: 0,
    extra: {},
    source: { path: 'Tasks.md', startLine: 1, endLine: 10, modified: 1 },
    ...overrides,
  } as RecordViewItem;
}

function activeSeries(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: seriesId,
    schemaVersion: 2,
    coreBlock: 'task-series',
    status: 'active',
    title: 'Weekly',
    content: 'Series default',
    tags: [],
    categoryKey: '',
    recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    currentTaskId: taskId,
    rolloverPolicy: 'carry',
    created: 0,
    modified: 0,
    extra: { 精力要求: 'high' },
    goalId: 'goal.series',
    goalPath: '#Series',
    scheduledDate: undefined,
    ...overrides,
  } as RecordViewItem;
}

function harness(task: RecordViewItem, series?: RecordViewItem) {
  const records = new Map<string, RecordViewItem>([[task.id, task]]);
  if (series) records.set(series.id, series);
  const updates: Array<{ recordId: string; patch: Record<string, unknown> }> = [];
  const batches: any[][] = [];
  const repository = {
    getById: async (id: string) => records.get(id) || null,
    update: async (recordId: string, patch: Record<string, unknown>) => {
      updates.push({ recordId, patch });
      const current = records.get(recordId)!;
      Object.assign(current, patch);
      return current;
    },
    batch: async (operations: any[]) => {
      batches.push(operations);
      return { writtenPaths: ['Tasks.md'], createdRecordIds: operations.filter(op => op.kind === 'create').map(op => op.record.recordId) };
    },
  };
  const dataStore = { getRecordLocation: (id: string) => records.has(id) ? { path: 'Tasks.md', startLine: 1, endLine: 10, modified: 1 } : null };
  return { mutation: new TaskCompletionMutation(dataStore as any, repository as any), updates, batches };
}

describe('TaskCompletionMutation v2', () => {
  it('completes a one-time Task with an explicit state transition only', async () => {
    const { mutation, updates, batches } = harness(openTask());
    await mutation.completeItem(taskId);
    expect(updates).toHaveLength(1);
    expect(updates[0].patch.status).toBe('done');
    expect(typeof updates[0].patch.completedAt).toBe('string');
    expect(batches).toHaveLength(0);
  });

  it('advances an active Series atomically and takes future defaults from Series', async () => {
    const task = openTask({
      seriesId,
      scheduledDate: '2026-08-11',
      goalId: 'goal.old',
      goalPath: '#Old',
      content: 'Old instance text',
    });
    const series = activeSeries({ priority: 'high' });
    const { mutation, batches } = harness(task, series);
    await mutation.completeItem(taskId);

    expect(batches).toHaveLength(1);
    const [finish, createNext, advanceSeries] = batches[0];
    expect(finish).toMatchObject({ kind: 'update', recordId: taskId, patch: { status: 'done' } });
    expect(createNext.kind).toBe('create');
    expect(createNext.record.fields.seriesId).toBe(seriesId);
    expect(createNext.record.fields.scheduledDate).toBe('2026-08-18');
    expect(createNext.record.fields.goalId).toBe('goal.series');
    expect(createNext.record.fields.content).toBe('Series default');
    expect(createNext.record.fields.priority).toBe('high');
    expect(advanceSeries).toMatchObject({ kind: 'update', recordId: seriesId });
    expect(advanceSeries.patch.currentTaskId).toBe(createNext.record.recordId);
  });

  it('requires currentTaskId to match instead of guessing the active occurrence', async () => {
    const { mutation } = harness(openTask({ seriesId }), activeSeries({ currentTaskId: undefined }));
    await expect(mutation.completeItem(taskId)).rejects.toThrow('task_series_current_conflict');
  });

  it('allows a stopped Series current occurrence to finish without creating a next instance', async () => {
    const { mutation, updates, batches } = harness(openTask({ seriesId }), activeSeries({ status: 'stopped' }));
    await mutation.completeItem(taskId);
    expect(updates).toHaveLength(1);
    expect(updates[0].patch.status).toBe('done');
    expect(batches).toHaveLength(0);
  });

  it('blocks reopening a historical recurring occurrence after the Series pointer advanced', async () => {
    const done = openTask({ seriesId, status: 'done' });
    const { mutation } = harness(done, activeSeries({ currentTaskId: 'task.01J11111111111111111111111' }));
    await expect(mutation.reopenItem(taskId)).rejects.toThrow('task_reopen_recurring_conflict');
  });

  it('updates Series defaults without rewriting history, with optional current-instance sync', async () => {
    const task = openTask({ seriesId });
    const { mutation, batches } = harness(task, activeSeries());
    await mutation.updateSeries(seriesId, {
      recurrence: { interval: 2 },
      goalId: 'goal.future',
      priority: 'highest',
    }, { includeCurrent: true });

    expect(batches).toHaveLength(1);
    expect(batches[0][0]).toMatchObject({
      kind: 'update',
      recordId: seriesId,
      patch: { recurrenceUnit: 'week', recurrenceInterval: 2, recurrenceAnchor: 'scheduled', goalId: 'goal.future', priority: 'highest' },
    });
    expect(batches[0][1]).toMatchObject({ kind: 'update', recordId: taskId, patch: { goalId: 'goal.future', priority: 'highest' } });
  });
  it('completes a one-time Task and creates its TaskSession in one batch', async () => {
    const { mutation, updates, batches } = harness(openTask());
    await mutation.completeItemWithSession(taskId, {
      startedAt: '2026-08-11T09:10:00.000Z',
      endedAt: '2026-08-11T09:48:00.000Z',
      durationMinutes: 38,
      result: 'task-completed',
      source: 'timer',
    });
    expect(updates).toHaveLength(0);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(batches[0][0]).toMatchObject({ kind: 'update', recordId: taskId, patch: { status: 'done' } });
    expect(batches[0][1]).toMatchObject({
      kind: 'create',
      record: { coreBlock: 'task-session', fields: { taskId, sessionResult: 'task-completed', sessionDurationMinutes: 38 } },
    });
  });

  it('includes TaskSession in the same recurring advance transaction', async () => {
    const task = openTask({ seriesId, scheduledDate: '2026-08-11' });
    const { mutation, batches } = harness(task, activeSeries());
    await mutation.completeItemWithSession(taskId, {
      startedAt: '2026-08-11T09:10:00.000Z',
      endedAt: '2026-08-11T09:48:00.000Z',
      durationMinutes: 38,
      result: 'task-completed',
      source: 'energy-view',
      suggestedDurationMinutes: 45,
    });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(4);
    expect(batches[0][0]).toMatchObject({ kind: 'update', recordId: taskId });
    expect(batches[0][1]).toMatchObject({ kind: 'create', record: { coreBlock: 'task-session' } });
    expect(batches[0][1].record.fields).toMatchObject({ taskId, seriesId, sessionSource: 'energy-view', suggestedDurationMinutes: 45 });
    expect(batches[0][2]).toMatchObject({ kind: 'create', record: { coreBlock: 'task' } });
    expect(batches[0][3]).toMatchObject({ kind: 'update', recordId: seriesId });
  });

});
