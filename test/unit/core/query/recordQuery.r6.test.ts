import { executeRecordQuery, queryRecordItems, queryViewRecords } from '@core/view/public';
import type { RecordViewItem } from '@core/types/public';

function record(partial: Partial<RecordViewItem>): RecordViewItem {
  return {
    id: partial.id || 'record',
    title: partial.title || '',
    content: partial.content || '',
    coreBlock: partial.coreBlock || 'thought',
    tags: partial.tags || [],
    categoryKey: partial.categoryKey || '记录/默认',
    created: partial.created || 0,
    modified: partial.modified || 0,
    extra: {},
    ...partial,
  } as RecordViewItem;
}

describe('RecordQuery R6', () => {
  const items = [
    record({ id: 'a', title: 'Alpha', coreBlock: 'task', status: 'open', themePath: '工作/A', date: '2026-08-11', extra: { 清晰度: 4, 发生时间: '2026-08-11T09:30:00' } }),
    record({ id: 'b', title: 'Beta', coreBlock: 'thought', themePath: '工作/A', date: '2026-08-12', extra: { 清晰度: 2, 发生时间: '2026-08-11T08:00:00' } }),
    record({ id: 'c', title: 'Closed undated', coreBlock: 'task', status: 'done', themePath: '生活/B' }),
    record({ id: 'd', title: 'Open undated', coreBlock: 'task', status: 'open', themePath: '生活/B' }),
    record({ id: 'e', title: 'Open backlog', coreBlock: 'task', status: 'open', themePath: '生活/B', date: '2026-03-23', dueDate: '2026-03-23' }),
  ];

  test('filter groups are ANDed while each group preserves FilterRule logic', () => {
    const result = queryRecordItems(items, {
      filterGroups: [
        [{ field: 'themePath', op: '=', value: '工作/A' }],
        [{ field: 'extra.清晰度', op: '>', value: 2 }],
      ],
    });
    expect(result.map(item => item.id)).toEqual(['a']);
  });

  test('standard date keeps open undated tasks but hides closed undated tasks', () => {
    const result = queryRecordItems(items, {
      date: { range: [new Date('2026-08-11'), new Date('2026-08-12')], mode: 'standard' },
    });
    expect(result.map(item => item.id)).toEqual(['a', 'b', 'd', 'e']);
  });


  test('strict task-date queries remain date-bound even though default layout date keeps open backlog', () => {
    const result = queryRecordItems(items, {
      date: { range: [new Date('2026-08-11'), new Date('2026-08-12')], field: 'dueDate', mode: 'strict' },
    });
    expect(result.map(item => item.id)).toEqual([]);
  });

  test('strict custom-field date query excludes missing values and sorts by that field', () => {
    const result = queryRecordItems(items, {
      date: {
        range: [new Date('2026-08-11T00:00:00'), new Date('2026-08-11T23:59:59')],
        field: 'extra.发生时间',
        mode: 'strict',
        precision: 'minute',
      },
      sort: [{ field: 'extra.发生时间', dir: 'asc' }],
    });
    expect(result.map(item => item.id)).toEqual(['b', 'a']);
  });

  test('grouping is part of the same query result', () => {
    const result = executeRecordQuery(items, { groupBy: ['themePath'] });
    expect(result.groupTree?.map(node => node.key)).toEqual(['工作/A', '生活/B']);
  });

  test('view adapter combines layout/view filters, keyword, date and sort', () => {
    const result = queryViewRecords({
      items,
      layoutFilters: [{ field: 'themePath', op: '=', value: '工作/A' }],
      viewFilters: [{ field: 'title', op: 'includes', value: 'a' }],
      keyword: 'Alpha',
      sort: [{ field: 'title', dir: 'asc' }],
      dateRange: [new Date('2026-08-01'), new Date('2026-08-31')],
      layoutView: '月',
    });
    expect(result.map(item => item.id)).toEqual(['a']);
  });
});
