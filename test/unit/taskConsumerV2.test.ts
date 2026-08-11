import type { Item } from '@core/types/public';
import { buildEnergyRecommendationLearning, attachEnergyRecommendationLearning } from '@core/energy/public';
import { readFieldValue } from '@/core/fields';
import { processItemsToTimelineTasks } from '@/features/settings/views/runtime/timeline-parser';
import { fromCachedItem, toCachedItem } from '@/core/types/cache';

function item(overrides: Partial<Item>): Item {
  return {
    id: 'record', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides,
  } as Item;
}

function task(id: string, overrides: Partial<Item> = {}): Item {
  return item({
    id, title: id, content: id, coreBlock: 'task', status: 'open',
    file: { path: 'tasks.md', basename: 'tasks', folder: '' },
    ...overrides,
  });
}

function session(id: string, taskId: string, seriesId: string, delta: number, date: string): Item {
  return item({
    id, coreBlock: 'task-session', taskId, seriesId,
    sessionStartedAt: `${date}T09:00:00`, sessionEndedAt: `${date}T10:00:00`, sessionDurationMinutes: 60,
    sessionResult: 'task-completed', sessionSource: 'timer', endEnergyRecordId: `energy.${id}`, energyDelta: delta,
  });
}

describe('Task v2 consumer convergence', () => {
  it('inherits Energy learning through stable Series identity across Task instances', () => {
    const seriesId = 'taskseries.weekly';
    const old1 = task('task.old1', { seriesId, status: 'done', themePath: '工作/开发' });
    const old2 = task('task.old2', { seriesId, status: 'done', themePath: '工作/开发' });
    const old3 = task('task.old3', { seriesId, status: 'done', themePath: '工作/开发' });
    const current = task('task.current', { seriesId, themePath: '工作/开发' });
    const records = [
      old1, old2, old3, current,
      session('session.1', old1.id, seriesId, -10, '2026-08-01'),
      session('session.2', old2.id, seriesId, -12, '2026-08-08'),
      session('session.3', old3.id, seriesId, -14, '2026-08-15'),
    ];
    const learning = buildEnergyRecommendationLearning(records);
    const [candidate] = attachEnergyRecommendationLearning([{
      id: current.id,
      seriesId,
      title: current.title,
      source: 'task',
      valueScore: 50,
    }], learning);
    expect(candidate.historicalEffect).toMatchObject({ sampleCount: 3, meanDelta: -12 });
  });

  it('projects Timeline execution rows from TaskSession identity, not Task time fields', () => {
    const t = task('task.timeline', { expectedDurationMinutes: 5 });
    const s = item({
      id: 'session.timeline', coreBlock: 'task-session', taskId: t.id,
      sessionStartedAt: '2026-08-10T09:10:00', sessionEndedAt: '2026-08-10T09:48:00', sessionDurationMinutes: 38,
      sessionResult: 'work-block-ended', sessionSource: 'timer',
    });
    const rows = processItemsToTimelineTasks([t, s]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'session.timeline',
      sessionRecordId: 'session.timeline',
      taskRecordId: 'task.timeline',
      duration: 38,
      startTime: '09:10',
      endTime: '09:48',
    });
  });

  it('resolves canonical Task status and cadence through the Field System', () => {
    const t = task('task.weekly', {
      status: 'open',
      seriesId: 'taskseries.weekly',
      recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    });
    expect(readFieldValue(t, 'status')).toBe('open');
    expect(readFieldValue(t, 'cadence')).toBe('week');
  });

  it('round-trips canonical Task fields through warm-start cache v12', () => {
    const t = task('task.cache', {
      status: 'open',
      priority: 'high',
      expectedDurationMinutes: 75,
      scheduledDate: '2026-08-12',
      dueDate: '2026-08-15',
      seriesId: 'taskseries.cache',
      source: { path: 'tasks.md', startLine: 10, endLine: 20, modified: 123 },
    });
    const restored = fromCachedItem(toCachedItem(t));
    expect(restored).toMatchObject({
      id: 'task.cache',
      status: 'open',
      priority: 'high',
      expectedDurationMinutes: 75,
      scheduledDate: '2026-08-12',
      dueDate: '2026-08-15',
      seriesId: 'taskseries.cache',
    });
  });
});
