import {
  addRecurrenceToDate,
  buildNextOccurrenceDates,
  formatTaskRecurrence,
  isTaskRecurring,
  normalizeRecurrenceInfo,
} from '@core/records/public';
import type { RecordViewItem } from '@core/types/public';

function task(seriesId?: string): RecordViewItem {
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
  } as RecordViewItem;
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

  it('supports quarter recurrence and month-end boundaries', () => {
    expect(addRecurrenceToDate('2026-01-10', { unit: 'quarter', interval: 1, anchor: 'scheduled' })).toBe('2026-04-10');
    expect(buildNextOccurrenceDates(
      { scheduledDate: '2026-01-31' },
      { unit: 'month', interval: 1, anchor: 'scheduled' },
      '2026-01-31T10:00:00Z',
    ).scheduledDate).toBe('2026-02-28');
  });

});
