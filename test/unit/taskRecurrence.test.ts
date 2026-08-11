import { isTaskRecurring, normalizeTaskRecurrenceValue } from '@core/records/task';
import type { Item } from '@core/types/public';

function row(recurrence: string, rawSource = ''): Item {
  return {
    id: 'task',
    title: 'task',
    content: 'task',
    type: 'task',
    tags: [],
    categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1',
    recurrence,
    rawSource,
    created: 0,
    modified: 0,
    extra: {},
  } as Item;
}

describe('Task recurrence semantics', () => {
  it('treats normalized none values as non-recurring', () => {
    expect(normalizeTaskRecurrenceValue('none')).toBeNull();
    expect(normalizeTaskRecurrenceValue('\u4e0d\u91cd\u590d')).toBeNull();
    expect(isTaskRecurring(row('none'))).toBe(false);
  });

  it('recognizes canonical recurrence info and raw recurrence rules', () => {
    expect(isTaskRecurring(row('every day'))).toBe(true);
    expect(isTaskRecurring(row('none', '- [ ] task \ud83d\udd01 every week'))).toBe(true);
  });
});
