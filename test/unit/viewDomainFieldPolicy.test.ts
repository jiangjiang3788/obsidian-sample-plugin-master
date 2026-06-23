import { normalizeViewFilters, normalizeViewGroupFields, normalizeDisplayFields, normalizeViewConfigDomain, readFieldValue } from '@/core/public';
import type { Item } from '@/core/public';

describe('view domain field policy', () => {
  it('converts legacy category filters into coreBlock filters', () => {
    const filters = normalizeViewFilters([
      { field: 'categoryKey', op: '=', value: '打卡' },
    ]);
    expect(filters).toEqual([{ field: 'coreBlock', op: '=', value: 'habit' }]);
  });

  it('preserves task done/open meaning when converging old task categories', () => {
    const filters = normalizeViewFilters([
      { field: 'categoryKey', op: '=', value: '完成任务' },
    ]);
    expect(filters).toEqual([
      { field: 'coreBlock', op: '=', value: 'task', logic: 'and' },
      { field: 'taskStatus', op: '=', value: 'done' },
    ]);
  });

  it('removes noisy template / period columns from default visible fields', () => {
    expect(normalizeDisplayFields(['goalPath', 'templateId', 'cycleId', 'content'])).toEqual(['goalPath', 'content']);
    expect(normalizeViewGroupFields(['categoryKey', '模板来源', 'leafTheme'])).toEqual(['coreBlock', 'leafTheme']);
  });



  it('normalizes legacy viewConfig field axes without deleting color category palettes', () => {
    expect(normalizeViewConfigDomain({ rowField: 'recurrence', colField: 'categoryKey', groupBy: 'category', categories: [{ name: '打卡' }] })).toEqual({
      rowField: 'repeatToken',
      colField: 'coreBlock',
      groupBy: 'coreBlock',
      categories: [{ name: '打卡' }],
    });
    expect(normalizeViewConfigDomain({ categories: [], themePaths: [] })).toEqual({});
  });

  it('resolves derived taskStatus for filters and view grouping', () => {
    const item = {
      id: 'item-1',
      type: 'task',
      title: 'done task',
      content: '- [x] done task',
      tags: [],
      categoryKey: '完成任务',
      recurrence: 'none',
      created: 0,
      modified: 0,
      extra: {},
    } as Item;
    expect(readFieldValue(item, 'taskStatus')).toBe('done');
  });
});
