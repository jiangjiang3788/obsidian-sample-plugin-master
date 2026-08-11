import { applyViewBaseFilters, applyViewQueryPipeline } from '@core/public';
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

describe('viewQueryPipeline', () => {
  const items = [
    item({ id: 'a', title: 'Alpha 设计', coreBlock: 'task', status: 'open', themePath: '工作/项目A', categoryKey: '任务', date: '2026-05-10', dateMs: Date.parse('2026-05-10') }),
    item({ id: 'b', title: 'Beta 复盘', coreBlock: 'habit', themePath: '生活/项目B', categoryKey: '打卡', date: '2026-05-11', dateMs: Date.parse('2026-05-11') }),
    item({ id: 'c', title: 'Gamma 设计', coreBlock: 'task', status: 'done', themePath: '工作/项目A', categoryKey: '任务', date: '2026-06-01', dateMs: Date.parse('2026-06-01') }),
  ];

  test('base filters 统一应用 layoutFilters、viewFilters、keyword', () => {
    const result = applyViewBaseFilters({
      items,
      layoutFilters: [{ field: 'themePath', op: '=', value: '工作/项目A' }],
      viewFilters: [{ field: 'title', op: 'includes', value: '设计' }],
      keyword: 'Alpha',
    });

    expect(result.map(it => it.id)).toEqual(['a']);
  });

  test('完整 pipeline 会在 base filters 后应用日期范围', () => {
    const result = applyViewQueryPipeline({
      items,
      layoutFilters: [{ field: 'themePath', op: '=', value: '工作/项目A' }],
      viewFilters: [],
      dateRange: [new Date('2026-05-01'), new Date('2026-05-31')],
      layoutView: '月',
    });

    expect(result.map(it => it.id)).toEqual(['a']);
  });
});
