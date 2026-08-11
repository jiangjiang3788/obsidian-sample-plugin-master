import type { GoalDefinition } from '@core/goal/public';
import type { Item, ViewInstance } from '@core/types/public';
import { buildEnergyViewModel } from '@/features/settings/views/models/energyViewModel';

function base(overrides: Partial<Item>): Item {
  return { id: 'x', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides } as Item;
}

function energy(id: string, goalPath: string, date: string, time: string, score: number): Item {
  return base({
    id, goalPath, date, coreBlock: 'energy', categoryKey: '精力', startTime: time,
    extra: { 核心Block: 'energy', 精力值: score, 精力档位: Math.round(score / 20) * 20, 时间: time, 日期: date, 评分模式: 'quick', 记录方式: 'realtime' },
  });
}

function task(id: string, goalPath: string): Item {
  return base({ id, goalPath, title: '写代码', content: '写代码', coreBlock: 'task', status: 'open', themePath: '工作/开发' });
}

function session(id: string, taskId: string, date: string, start: string, end: string, duration: number, beforeId?: string, afterId?: string): Item {
  return base({
    id, coreBlock: 'task-session', taskId,
    sessionStartedAt: `${date}T${start}:00`, sessionEndedAt: `${date}T${end}:00`, sessionDurationMinutes: duration,
    sessionResult: 'work-block-ended', sessionSource: 'timer', startEnergyRecordId: beforeId, endEnergyRecordId: afterId,
  });
}

describe('buildEnergyViewModel', () => {
  const goals = [
    { id: 'goal.a', title: 'A', goalPath: 'A', status: 'active' },
    { id: 'goal.b', title: 'B', goalPath: 'B', status: 'active' },
  ] as GoalDefinition[];

  const module = {
    id: 'vi.energy', title: '精力', viewType: 'EnergyView', viewConfig: { windowDays: 7, recentSampleLimit: 5, maxGoals: 0 },
  } as ViewInstance;
  const currentView = '周' as const;
  const dateRange: [Date, Date] = [new Date('2026-08-04T00:00:00'), new Date('2026-08-10T23:59:59')];

  it('groups visible Energy by goal while using internal Session evidence separately', () => {
    const a1 = energy('a-1', 'A', '2026-08-08', '09:00', 80);
    const a2 = energy('a-2', 'A', '2026-08-08', '10:40', 40);
    const t = task('a-task', 'A');
    const visibleItems = [a1, a2, t, energy('b-1', 'B', '2026-08-09', '12:00', 100)];
    const records = [...visibleItems, session('a-session', t.id, '2026-08-08', '09:30', '10:30', 60, a1.id, a2.id)];

    const model = buildEnergyViewModel({ items: visibleItems, records, module, goals, currentView, dateRange });
    expect(model.goalPanels).toHaveLength(2);
    const a = model.goalPanels.find((panel) => panel.goalPath === 'A');
    const b = model.goalPanels.find((panel) => panel.goalPath === 'B');
    expect(a?.summary.count).toBe(2);
    expect(a?.summary.timeline?.coverage.totalSamples).toBe(2);
    expect(b?.summary.count).toBe(1);
    expect(b?.summary.timeline?.coverage.totalSamples).toBe(1);
  });

  it('supports an explicit goalPath without mixing other goals', () => {
    const items = [energy('a-1', 'A', '2026-08-08', '09:00', 80), energy('b-1', 'B', '2026-08-09', '12:00', 100)];
    const model = buildEnergyViewModel({
      items,
      records: items,
      module: { ...module, viewConfig: { ...module.viewConfig, goalPath: 'A' } },
      goals,
      currentView,
      dateRange,
    });
    expect(model.goalPanels.map((panel) => panel.goalPath)).toEqual(['A']);
  });
});
