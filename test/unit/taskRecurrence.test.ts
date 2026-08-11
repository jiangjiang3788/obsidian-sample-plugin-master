import {
  addRecurrenceToDate,
  buildNextOccurrenceDates,
  formatTaskRecurrence,
  isTaskRecurring,
  normalizeRecurrenceInfo,
} from '@core/records/task';
import type { Item } from '@core/types/public';

function task(seriesId?: string): Item {
  return {
    id: 'task.01J00000000000000000000000',
    schemaVersion: 2,
    coreBlock: 'task',
    status: 'open',
    title: 'task',
    content: 'task',
    tags: [],
    categoryKey: '任务',
    seriesId,
    created: 0,
    modified: 0,
    extra: {},
  } as Item;
}

describe('Task recurrence v2', () => {
  it('uses seriesId as the recurring-instance identity signal', () => {
    expect(isTaskRecurring(task())).toBe(false);
    expect(isTaskRecurring(task('taskseries.01J00000000000000000000000'))).toBe(true);
  });

  it('accepts only structured recurrence values', () => {
    expect(normalizeRecurrenceInfo({ unit: 'week', interval: 1, anchor: 'scheduled' })).toEqual({
      unit: 'week', interval: 1, anchor: 'scheduled',
    });
    expect(normalizeRecurrenceInfo({ unit: 'week', interval: 0, anchor: 'scheduled' })).toBeNull();
    expect(formatTaskRecurrence({ unit: 'month', interval: 2, anchor: 'due' })).toBe('every 2 months');
  });

  it('advances explicit task dates without parsing raw markdown', () => {
    expect(buildNextOccurrenceDates(
      { scheduledDate: '2026-08-11', startDate: '2026-08-10', dueDate: '2026-08-12' },
      { unit: 'week', interval: 1, anchor: 'scheduled' },
      '2026-08-11T12:00:00Z',
    )).toEqual({ scheduledDate: '2026-08-18', startDate: '2026-08-17', dueDate: '2026-08-19' });
    expect(addRecurrenceToDate('2026-08-11', { unit: 'day', interval: 3, anchor: 'scheduled' })).toBe('2026-08-14');
  });
});
