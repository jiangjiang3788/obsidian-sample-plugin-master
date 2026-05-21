import { buildTaskExecutionViewModel } from '@features/settings/viewModels/taskExecutionViewModel';
import type { Item, ViewInstance } from '@core/public';

function item(partial: Partial<Item>): Item {
  return {
    id: partial.id || 'item',
    title: partial.title || '',
    content: partial.content || '',
    type: partial.type || 'task',
    tags: partial.tags || [],
    categoryKey: partial.categoryKey || '任务/todo',
    recurrence: partial.recurrence || 'daily',
    created: partial.created || 0,
    modified: partial.modified || 0,
    extra: {},
    ...partial,
  } as Item;
}

function view(partial: Partial<ViewInstance> = {}): ViewInstance {
  return {
    id: 'task-execution',
    title: '任务执行',
    viewType: 'TaskExecutionView',
    fields: [],
    filters: [],
    sort: [],
    viewConfig: { onlyRecurring: true },
    ...partial,
  } as ViewInstance;
}

describe('buildTaskExecutionViewModel', () => {
  test('应用 layoutFilters / viewFilters / keyword，但不再重复执行旧主题分类筛选', () => {
    const model = buildTaskExecutionViewModel({
      items: [
        item({ id: 'a', title: 'Alpha 设计', content: '- [ ] Alpha 设计', themePath: '工作/项目A', theme: '工作/项目A', categoryKey: '任务/todo' }),
        item({ id: 'b', title: 'Beta 设计', content: '- [ ] Beta 设计', themePath: '生活/项目B', theme: '生活/项目B', categoryKey: '习惯/todo' }),
        item({ id: 'c', title: 'Gamma', content: '- [ ] Gamma', themePath: '工作/项目A', theme: '工作/项目A', categoryKey: '任务/todo' }),
      ],
      dateRange: [new Date('2026-05-01'), new Date('2026-05-31')],
      viewInstance: view({ filters: [{ field: 'title', op: 'includes', value: '设计' }] }),
      keyword: 'Alpha',
      layoutFilters: [
        { field: 'themePath', op: '=', value: '工作/项目A' },
        { field: 'baseCategory', op: '=', value: '任务' },
      ],
    });

    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].groups[0].tasks.map(task => task.itemId)).toEqual(['a']);
  });

  test('open recurring task 不受当前日期范围裁剪，completed records 只按 doneDate 进入本期', () => {
    const model = buildTaskExecutionViewModel({
      items: [
        item({
          id: 'open',
          title: 'Daily Review',
          content: '- [ ] Daily Review',
          file: { path: 'daily.md', basename: 'daily', name: 'daily.md', folder: '' } as any,
          theme: '工作/复盘',
          themePath: '工作/复盘',
          date: '2026-04-01',
          categoryKey: '任务/todo',
        }),
        item({
          id: 'done-in-range',
          title: 'Daily Review',
          content: '- [x] Daily Review',
          file: { path: 'daily.md', basename: 'daily', name: 'daily.md', folder: '' } as any,
          theme: '工作/复盘',
          themePath: '工作/复盘',
          doneDate: '2026-05-12',
          categoryKey: '任务/done',
        }),
        item({
          id: 'done-out-range',
          title: 'Daily Review',
          content: '- [x] Daily Review',
          file: { path: 'daily.md', basename: 'daily', name: 'daily.md', folder: '' } as any,
          theme: '工作/复盘',
          themePath: '工作/复盘',
          doneDate: '2026-06-01',
          categoryKey: '任务/done',
        }),
      ],
      dateRange: [new Date('2026-05-01'), new Date('2026-05-31')],
      viewInstance: view(),
      keyword: '',
      layoutFilters: [{ field: 'themePath', op: '=', value: '工作/复盘' }],
    });

    const task = model.sections[0].groups[0].tasks[0];
    expect(task.itemId).toBe('open');
    expect(task.records.map(record => record.id)).toEqual(['done-in-range']);
  });
});
