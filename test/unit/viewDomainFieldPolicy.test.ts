import { normalizeViewFilters, normalizeViewGroupFields, normalizeDisplayFields, normalizeViewConfigDomain, readFieldValue } from '@/core/public';
import type { Item } from '@/core/public';

describe('view domain field policy', () => {
  it('converts generic category filters into canonical coreBlock filters', () => {
    expect(normalizeViewFilters([{ field: 'categoryKey', op: '=', value: '打卡' }]))
      .toEqual([{ field: 'coreBlock', op: '=', value: 'habit' }]);
  });

  it('keeps canonical Task status filters canonical', () => {
    expect(normalizeViewFilters([
      { field: 'coreBlock', op: '=', value: 'task', logic: 'and' },
      { field: 'status', op: '=', value: 'done' },
    ])).toEqual([
      { field: 'coreBlock', op: '=', value: 'task', logic: 'and' },
      { field: 'status', op: '=', value: 'done' },
    ]);
  });

  it('removes noisy template / period columns from default visible fields', () => {
    expect(normalizeDisplayFields(['goalPath', 'templateId', 'cycleId', 'content'])).toEqual(['goalPath', 'content']);
    expect(normalizeViewGroupFields(['categoryKey', '模板来源', 'leafTheme'])).toEqual(['coreBlock', 'leafTheme']);
  });

  it('normalizes canonical view axes without introducing Task storage aliases', () => {
    expect(normalizeViewConfigDomain({ rowField: 'recurrence', colField: 'categoryKey', groupBy: 'category', categories: [{ name: '打卡' }] })).toEqual({
      rowField: 'recurrence',
      colField: 'coreBlock',
      groupBy: 'coreBlock',
      categories: [{ name: '打卡' }],
    });
    expect(normalizeViewConfigDomain({ categories: [], themePaths: [] })).toEqual({});
  });

  it('resolves explicit status and structured cadence', () => {
    const item = {
      id: 'task.01J00000000000000000000044', schemaVersion: 2, coreBlock: 'task', status: 'done',
      title: 'done task', content: 'done task', tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
      seriesId: 'taskseries.01J00000000000000000000044', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    } as Item;
    expect(readFieldValue(item, 'status')).toBe('done');
    expect(readFieldValue(item, 'cadence')).toBe('week');
    expect(readFieldValue(item, 'recurrence')).toBe('every week');
  });
});
