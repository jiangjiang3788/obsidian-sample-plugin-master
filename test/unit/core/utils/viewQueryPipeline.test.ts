import { applyViewBaseFilters, applyViewQueryPipeline } from '@core/public';
import type { Item } from '@core/public';

function item(partial: Partial<Item>): Item {
  return {
    id: partial.id || 'item',
    title: partial.title || '',
    content: partial.content || '',
    type: partial.type || 'block',
    tags: partial.tags || [],
    categoryKey: partial.categoryKey || '记录/默认',
    recurrence: partial.recurrence || '',
    created: partial.created || 0,
    modified: partial.modified || 0,
    extra: {},
    ...partial,
  } as Item;
}

describe('viewQueryPipeline', () => {
  const items = [
    item({ id: 'a', title: 'Alpha 设计', themePath: '工作/项目A', categoryKey: '任务/todo', date: '2026-05-10', dateMs: Date.parse('2026-05-10') }),
    item({ id: 'b', title: 'Beta 复盘', themePath: '生活/项目B', categoryKey: '习惯/check', date: '2026-05-11', dateMs: Date.parse('2026-05-11') }),
    item({ id: 'c', title: 'Gamma 设计', themePath: '工作/项目A', categoryKey: '任务/done', date: '2026-06-01', dateMs: Date.parse('2026-06-01') }),
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

  test('有新版 layoutFilters 时，不再重复应用 legacy 主题/分类', () => {
    const result = applyViewBaseFilters({
      items,
      layoutFilters: [{ field: 'themePath', op: '=', value: '工作/项目A' }],
      legacySelectedThemes: ['生活/项目B'],
    });

    expect(result.map(it => it.id)).toEqual(['a', 'c']);
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
