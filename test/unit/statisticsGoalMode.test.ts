import { buildStatisticsViewModel } from '@/features/settings/viewModels/statisticsViewModel';

const items: any[] = [
  { id: '1', title: 'A', type: 'task', categoryKey: '任务', coreBlock: 'task', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-01-05', extra: {}, tags: [], content: '', recurrence: '', created: 0, modified: 0 },
  { id: '2', title: 'B', type: 'block', categoryKey: '事件', coreBlock: 'evidence', goalPaths: ['项目/目标B'], goalPath: '项目/目标B', date: '2026-01-06', extra: {}, tags: [], content: '', recurrence: '', created: 0, modified: 0 },
];

describe('StatisticsView goal grouping', () => {
  it('builds goal buckets as the only statistics dimension', () => {
    const model = buildStatisticsViewModel({
      items: items as any,
      dateRange: [new Date('2026-01-01'), new Date('2026-12-31')],
      module: { viewConfig: {} },
      currentView: '年',
      goals: [],
    });
    expect(model.viewConfig.groupBy).toBe('goal');
    expect(model.filteredCategories.map((bucket: any) => bucket.name).sort()).toEqual(['项目/目标A', '项目/目标B']);
    expect(model.bucketAccessor(items[0] as any)).toBe('项目/目标A');
  });

  it('uses external pipeline items and does not apply selected category filtering', () => {
    const model = buildStatisticsViewModel({
      items: items as any,
      dateRange: [new Date('2026-01-01'), new Date('2026-01-31')],
      module: { viewConfig: { topN: 10 } },
      currentView: '月',
      selectedCategories: ['任务'],
      goals: [],
    });
    expect(model.filteredCategories.map((bucket: any) => bucket.name).sort()).toEqual(['项目/目标A', '项目/目标B']);
  });
});
