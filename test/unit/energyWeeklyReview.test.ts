import type { Item } from '@core/types/public';
import { buildEnergyWeeklyReview } from '@core/energy/public';

function base(overrides: Partial<Item>): Item {
  return { id: 'x', title: '', content: '', type: 'block', tags: [], categoryKey: '', recurrence: 'none', created: 0, modified: 0, extra: {}, ...overrides } as Item;
}

function energy(id: string, date: string, time: string, score: number, brain = score, physical = score): Item {
  return base({ id, goalId: 'goal.demo', goalPath: 'Demo', date, startTime: time, coreBlock: 'energy', categoryKey: '精力', extra: { 核心Block: 'energy', 日期: date, 时间: time, 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), 脑力精力: brain, 体力精力: physical, 评分模式: 'detailed', 记录方式: 'realtime' } });
}

function task(id: string, date: string, startTime: string, endTime: string, duration: number, title: string): Item {
  return base({ id, goalId: 'goal.demo', goalPath: 'Demo', date, startTime, endTime, duration, title, content: title, coreBlock: 'task', categoryKey: '任务', type: 'task', themePath: /散步/.test(title) ? '健康/恢复' : '工作/开发' });
}

describe('buildEnergyWeeklyReview', () => {
  it('summarizes sparse coverage and conservative weekly findings', () => {
    const items: Item[] = [];
    const days = ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-08', '2026-08-09', '2026-08-10'];
    days.forEach((date, index) => {
      items.push(energy(`before-${index}`, date, '08:00', 80, 85, 75));
      items.push(task(`code-${index}`, date, '08:10', '10:20', 130, '写代码'));
      items.push(energy(`after-${index}`, date, '10:30', 40, 30, 50));
      items.push(energy(`walk-before-${index}`, date, '14:00', 40, 30, 50));
      items.push(task(`walk-${index}`, date, '14:10', '14:40', 30, '散步恢复'));
      items.push(energy(`walk-after-${index}`, date, '14:50', 60, 55, 65));
    });
    const review = buildEnergyWeeklyReview(items, { windowDays: 7, endDate: '2026-08-10' });
    expect(review?.coverage.sampledDays).toBe(6);
    expect(review?.coverage.missingDays).toBe(1);
    expect(review?.topRecovery?.label).toBe('运动 / 活动');
    expect(review?.topDepletion?.label).toBe('代码 / 开发');
    expect(review?.longWork?.pairedSessionCount).toBeGreaterThanOrEqual(3);
    expect(review?.readiness.sufficientCoverage).toBe(true);
  });
});
