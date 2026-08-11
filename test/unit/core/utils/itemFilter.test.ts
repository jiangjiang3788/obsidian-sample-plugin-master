import { filterByRules } from '@/core/utils/itemFilter';
import type { Item } from '@core/public';

function item(partial: Partial<Item>): Item {
  return {
    id: partial.id || 'item',
    title: partial.title || '',
    content: partial.content || '',
    coreBlock: partial.coreBlock || 'note',
    tags: partial.tags || [],
    categoryKey: partial.categoryKey || '记录/默认',
    created: partial.created || 0,
    modified: partial.modified || 0,
    extra: {},
    ...partial,
  } as Item;
}

describe('itemFilter extended operators', () => {
  const items = [
    item({ id: 'a', title: 'Alpha', tags: ['work', 'urgent'], date: '2026-05-10', extra: { score: 3, project: 'A' } }),
    item({ id: 'b', title: 'Beta', tags: ['life'], date: '2026-05-18', extra: { score: 5, project: 'B' } }),
    item({ id: 'c', title: 'Gamma', tags: [], date: '', extra: { score: 8, project: '' } }),
  ];

  test('in / notIn 支持多值筛选', () => {
    expect(filterByRules(items, [{ field: 'title', op: 'in', value: 'Alpha, Beta' }]).map(it => it.id)).toEqual(['a', 'b']);
    expect(filterByRules(items, [{ field: 'title', op: 'notIn', value: ['Alpha', 'Beta'] }]).map(it => it.id)).toEqual(['c']);
  });

  test('between 支持数字和日期区间', () => {
    expect(filterByRules(items, [{ field: 'extra.score', op: 'between', value: '4~8' }]).map(it => it.id)).toEqual(['b', 'c']);
    expect(filterByRules(items, [{ field: 'date', op: 'between', value: '2026-05-01~2026-05-15' }]).map(it => it.id)).toEqual(['a']);
  });

  test('empty / notEmpty 不依赖 value', () => {
    expect(filterByRules(items, [{ field: 'date', op: 'empty', value: 'ignored' }]).map(it => it.id)).toEqual(['c']);
    expect(filterByRules(items, [{ field: 'extra.project', op: 'notEmpty', value: '' }]).map(it => it.id)).toEqual(['a', 'b']);
  });

  test('tags 的 in / notIn 按标签成员匹配', () => {
    expect(filterByRules(items, [{ field: 'tags', op: 'in', value: 'urgent, later' }]).map(it => it.id)).toEqual(['a']);
    expect(filterByRules(items, [{ field: 'tags', op: 'notIn', value: 'urgent' }]).map(it => it.id)).toEqual(['b', 'c']);
  });
});
