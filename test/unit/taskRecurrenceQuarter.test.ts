import { addRecurrenceToDate, buildNextOccurrenceDates } from '@core/records/public';

describe('task recurrence quarter support v2', () => {
  it('supports quarter as a first-class structured recurrence unit', () => {
    expect(addRecurrenceToDate('2026-01-10', { unit: 'quarter', interval: 1, anchor: 'scheduled' })).toBe('2026-04-10');
  });

  it('handles month-end boundaries through date arithmetic rather than task-line tokens', () => {
    expect(buildNextOccurrenceDates(
      { scheduledDate: '2026-01-31' },
      { unit: 'month', interval: 1, anchor: 'scheduled' },
      '2026-01-31T10:00:00Z',
    ).scheduledDate).toBe('2026-02-28');
  });
});
