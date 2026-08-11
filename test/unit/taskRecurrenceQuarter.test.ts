import { generateNextRecurringTask, parseRecurrence } from '@core/records/public';

describe('task recurrence quarter support', () => {
  it('parses pure normalized recurrence text', () => {
    expect(parseRecurrence('every week')).toEqual({ interval: 1, unit: 'week', whenDone: false });
  });

  it('supports quarter as a first-class recurrence unit', () => {
    expect(parseRecurrence('🔁 every quarter')).toEqual({ interval: 1, unit: 'quarter', whenDone: false });
    expect(generateNextRecurringTask('- [ ] 季度复盘 🔁 every quarter 📅 2026-01-10', '2026-01-10')).toContain('📅 2026-04-10');
  });
});
