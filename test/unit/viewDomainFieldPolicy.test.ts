import { normalizeViewFilters, normalizeViewGroupFields, normalizeDisplayFields, normalizeViewConfigDomain, readFieldValue } from '@/core/public';
import type { RecordViewItem } from '@/core/public';

describe('view domain field policy', () => {
  it('keeps category path filters distinct from RecordType and normalizes explicit CoreBlock labels', () => {
    expect(normalizeViewFilters([{ field: 'categoryKey', op: '=', value: '闪念/感受' }]))
      .toEqual([{ field: 'categoryKey', op: '=', value: '闪念/感受' }]);
    expect(normalizeViewFilters([{ field: '记录类型', op: '=', value: '打卡' }]))
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

  it('keeps current Goal/content fields and canonical grouping fields', () => {
    expect(normalizeDisplayFields(['goalPath', 'content'])).toEqual(['goalPath', 'content']);
    expect(normalizeViewGroupFields(['coreBlock', 'leafGoal'])).toEqual(['coreBlock', 'leafGoal']);
  });

  it('normalizes canonical view axes without introducing Task storage aliases', () => {
    expect(normalizeViewConfigDomain({ rowField: 'recurrence', colField: 'categoryKey', groupBy: 'categoryKey', categories: [{ name: '闪念/感受' }] })).toEqual({
      rowField: 'recurrence',
      colField: 'categoryKey',
      groupBy: 'categoryKey',
      categories: [{ name: '闪念/感受' }],
    });
    expect(normalizeViewConfigDomain({ categories: [], goalPaths: [] })).toEqual({});
  });

  it('resolves explicit status and structured cadence', () => {
    const item = {
      id: 'task.01J00000000000000000000044', coreBlock: 'task', status: 'done',
      title: 'done task', content: 'done task', tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
      seriesId: 'taskseries.01J00000000000000000000044', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    } as RecordViewItem;
    expect(readFieldValue(item, 'status')).toBe('done');
    expect(readFieldValue(item, 'cadence')).toBe('week');
    expect(readFieldValue(item, 'recurrence')).toBe('every week');
  });
});
