import { buildProgressViewModel } from '@/features/settings/viewModels/progressViewModel';

const items: any[] = [
  { id: '1', title: 'A', type: 'task', categoryKey: '任务', coreBlock: 'task', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', extra: {}, tags: [], content: '', recurrence: '', created: 0, modified: 0 },
  { id: '2', title: 'B', type: 'block', categoryKey: '打卡', coreBlock: 'habit', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', extra: {}, tags: [], content: '', recurrence: '', created: 0, modified: 0 },
  { id: '3', title: 'C', type: 'block', categoryKey: '事件', coreBlock: 'evidence', goalPaths: ['项目/目标B'], goalPath: '项目/目标B', extra: {}, tags: [], content: '', recurrence: '', created: 0, modified: 0 },
];

describe('ProgressView goal mode', () => {
  it('builds collapsible goal progress cards by default', () => {
    const model = buildProgressViewModel({ items: items as any, module: { viewConfig: {} }, goals: [] });
    expect(model.mode).toBe('goal');
    expect(model.goalCards).toHaveLength(2);
    expect(model.goalCards[0]?.goalPath).toBe('项目/目标A');
    expect(model.goalCards[0]?.blockCounts.task).toBe(1);
    expect(model.goalCards[0]?.blockCounts.habit).toBe(1);
    expect(model.summary.goalCount).toBe(2);
  });

  it('honors topN without introducing internal filters', () => {
    const model = buildProgressViewModel({ items: items as any, module: { viewConfig: { topN: 1 } }, goals: [] });
    expect(model.goalCards).toHaveLength(1);
  });
});
