import type { GoalDefinition } from '@core/goal/public';
import type { Item, ViewInstance } from '@core/types/public';
import { buildEnergyViewModel } from '@/features/settings/views/models/energyViewModel';

function energy(id: string, goalPath: string, date: string, time: string, score: number): Item {
  return {
    id,
    goalPath,
    date,
    coreBlock: 'energy',
    categoryKey: '精力',
    extra: {
      核心Block: 'energy',
      精力值: score,
      精力档位: Math.round(score / 20) * 20,
      时间: time,
      日期: date,
      评分模式: 'quick',
      记录方式: 'realtime',
    },
  } as Item;
}

function task(id: string, goalPath: string, date: string, startTime: string, endTime: string): Item {
  return {
    id,
    goalPath,
    date,
    title: '写代码',
    coreBlock: 'task',
    categoryKey: '任务',
    startTime,
    endTime,
    duration: 60,
    extra: {},
  } as Item;
}

describe('buildEnergyViewModel', () => {
  const goals = [
    { id: 'goal.a', title: 'A', goalPath: 'A', status: 'active' },
    { id: 'goal.b', title: 'B', goalPath: 'B', status: 'active' },
  ] as GoalDefinition[];

  const module = {
    id: 'vi.energy',
    title: '精力',
    viewType: 'EnergyView',
    viewConfig: { windowDays: 7, recentSampleLimit: 5, maxGoals: 0 },
  } as ViewInstance;

  it('groups energy by goal and keeps each timeline independent', () => {
    const items = [
      energy('a-1', 'A', '2026-08-08', '09:00', 80),
      task('a-task', 'A', '2026-08-08', '09:30', '10:30'),
      energy('a-2', 'A', '2026-08-08', '10:40', 40),
      energy('b-1', 'B', '2026-08-09', '12:00', 100),
    ];

    const model = buildEnergyViewModel({ items, module, goals });
    expect(model.goalPanels).toHaveLength(2);
    const a = model.goalPanels.find((panel) => panel.goalPath === 'A');
    const b = model.goalPanels.find((panel) => panel.goalPath === 'B');
    expect(a?.summary.count).toBe(2);
    expect(a?.summary.timeline?.coverage.totalSamples).toBe(2);
    expect(b?.summary.count).toBe(1);
    expect(b?.summary.timeline?.coverage.totalSamples).toBe(1);
  });

  it('supports an explicit goalPath without mixing other goals', () => {
    const model = buildEnergyViewModel({
      items: [
        energy('a-1', 'A', '2026-08-08', '09:00', 80),
        energy('b-1', 'B', '2026-08-09', '12:00', 100),
      ],
      module: { ...module, viewConfig: { ...module.viewConfig, goalPath: 'A' } },
      goals,
    });
    expect(model.goalPanels.map((panel) => panel.goalPath)).toEqual(['A']);
  });
});
