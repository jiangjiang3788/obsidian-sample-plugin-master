import type { Item } from '@core/types/public';
import { buildEnergyExperimentComparison } from '@core/energy/public';

function energy(id: string, date: string, score: number, brain = score, physical = score): Item {
  return {
    id, goalId: 'goal.demo', goalPath: 'Demo', date, startTime: '12:00', coreBlock: 'energy', categoryKey: '精力', type: 'block', title: '', content: '', tags: [], recurrence: 'none', created: 0, modified: 0,
    extra: { 核心Block: 'energy', 日期: date, 时间: '12:00', 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), 脑力精力: brain, 体力精力: physical, 评分模式: 'detailed', 记录方式: 'realtime' },
  } as Item;
}

describe('buildEnergyExperimentComparison', () => {
  it('compares the seven days before and after an intervention date', () => {
    const items: Item[] = [];
    for (let day = 1; day <= 7; day += 1) items.push(energy(`b-${day}`, `2026-08-${String(day).padStart(2, '0')}`, 40, 35, 45));
    for (let day = 8; day <= 14; day += 1) items.push(energy(`i-${day}`, `2026-08-${String(day).padStart(2, '0')}`, 60, 55, 65));
    const result = buildEnergyExperimentComparison(items, { name: '强制休息', hypothesis: '休息后精力更高', interventionDate: '2026-08-08', windowDays: 7 });
    expect(result?.readiness).toBe('ready');
    expect(result?.deltaMeanScore).toBe(20);
    expect(result?.deltaMeanBrainScore).toBe(20);
    expect(result?.deltaMeanPhysicalScore).toBe(20);
    expect(result?.trend).toBe('up');
  });

  it('does not judge an experiment when either side lacks enough sparse samples', () => {
    const result = buildEnergyExperimentComparison([
      energy('b1', '2026-08-07', 40),
      energy('i1', '2026-08-08', 60),
    ], { name: '测试', interventionDate: '2026-08-08', windowDays: 7 });
    expect(result?.readiness).toBe('collecting');
    expect(result?.trend).toBe('insufficient');
  });
});
