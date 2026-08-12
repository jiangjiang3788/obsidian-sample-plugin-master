import type { RecordEntity } from '@/core/records/RecordEntity';
import { asHabitRecord, toRecordViewItem } from '@/core/records/RecordEntity';
import { DataStoreIndex } from '@/core/services/dataStore/DataStoreIndex';
import { asTaskRecord, asTaskSeriesRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';

function record(overrides: Record<string, unknown>): RecordEntity {
  return {
    id: 'rec.base',
    schemaVersion: 2,
    coreBlock: 'thought',
    title: '',
    content: '',
    tags: [],
    categoryKey: '',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as RecordEntity;
}

describe('RecordEntity R2 boundary', () => {
  it('keeps the canonical entity separate from the consumer projection', () => {
    const thought = record({ id: 'rec.thought', coreBlock: 'thought', content: '一个想法' });
    const view = toRecordViewItem(thought);
    expect(view).toBe(thought);
    expect(view.coreBlock).toBe('thought');
  });

  it('narrows Task, Series, Session and Habit only through typed projections', () => {
    const task = record({ id: 'task.a', coreBlock: 'task', status: 'open', seriesId: 'taskseries.a' });
    const series = record({ id: 'taskseries.a', coreBlock: 'task-series', status: 'active', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' } });
    const session = record({
      id: 'tasksession.a', coreBlock: 'task-session', taskId: 'task.a', seriesId: 'taskseries.a',
      sessionStartedAt: '2026-08-11T09:00:00.000Z', sessionEndedAt: '2026-08-11T09:30:00.000Z',
      sessionDurationMinutes: 30, sessionResult: 'work-block-ended', sessionSource: 'timer',
    });
    const habit = record({ id: 'rec.habit', coreBlock: 'habit', rating: 4, image: 'x.png' });

    expect(asTaskRecord(task)?.status).toBe('open');
    expect(asTaskSeriesRecord(series)?.currentTaskId).toBeUndefined();
    expect(asTaskSessionRecord(session)?.sessionDurationMinutes).toBe(30);
    expect(asHabitRecord(habit)?.rating).toBe(4);
    expect(asTaskRecord(habit)).toBeNull();
  });

  it('stores canonical entities internally while queries return explicit view projections', () => {
    const index = new DataStoreIndex();
    const thought = record({ id: 'rec.thought', coreBlock: 'thought' });
    const session = record({
      id: 'tasksession.a', coreBlock: 'task-session', taskId: 'task.a',
      sessionStartedAt: '2026-08-11T09:00:00.000Z', sessionEndedAt: '2026-08-11T09:30:00.000Z',
      sessionDurationMinutes: 30, sessionResult: 'work-block-ended', sessionSource: 'timer',
    });
    index.stageFileItems('records.md', [thought, session]);
    index.rebuild();

    expect(index.getById('rec.thought')).toBe(thought);
    expect(index.queryRecords().map(item => item.id)).toEqual(['rec.thought', 'tasksession.a']);
    expect(index.queryItems().map(item => item.id)).toEqual(['rec.thought']);
  });
});
