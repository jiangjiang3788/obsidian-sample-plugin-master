import { buildGoalOverviewModel } from '@/core/goal/overview';

describe('buildGoalOverviewModel empty value hardening', () => {
  it('skips empty goal path records without throwing', () => {
    const model = buildGoalOverviewModel({
      goals: [],
      items: [
        { id: 'a', title: 'empty goal', content: 'x', goalPaths: [undefined], date: '2026-06-06' } as any,
        { id: 'b', title: 'valid goal', content: 'x', goalPaths: ['产品/目标'], date: '2026-06-06' } as any,
      ],
    });
    expect(model.rows.length).toBe(1);
    expect(model.rows[0].goalPath).toBe('产品/目标');
  });
});

describe('buildGoalOverviewModel Energy integration', () => {
  it('keeps Energy Goal-bound but outside ordinary record progress counts', () => {
    const model = buildGoalOverviewModel({
      goals: [{ id: 'goal.life', title: '生活', goalPath: '生活', status: 'active' } as any],
      items: [
        { id: 'task', title: '散步', type: 'task', content: '散步', categoryKey: '任务', coreBlock: 'task', goalId: 'goal.life', goalPaths: ['生活'], date: '2026-08-09', extra: {} } as any,
        { id: 'energy-1', title: '', type: 'block', content: '', categoryKey: '精力', coreBlock: 'energy', goalId: 'goal.life', goalPaths: ['生活'], date: '2026-08-10', extra: { '时间': '09:10', '精力值': 40, '精力档位': 40, '评分模式': 'quick' } } as any,
        { id: 'energy-2', title: '', type: 'block', content: '', categoryKey: '精力', coreBlock: 'energy', goalId: 'goal.life', goalPaths: ['生活'], date: '2026-08-10', extra: { '时间': '15:20', '精力值': 57, '精力档位': 60, '脑力精力': 73, '体力精力': 41, '评分模式': 'detailed' } } as any,
      ],
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      totalCount: 1,
      taskCount: 1,
      energyCount: 2,
      latestEnergyScore: 57,
      latestBrainEnergy: 73,
      latestPhysicalEnergy: 41,
      latestEnergyDate: '2026-08-10',
      latestEnergyTime: '15:20',
      latestDate: '2026-08-09',
    });
    expect(model.rows[0].coreBlockCounts.energy).toBe(2);
  });
});
