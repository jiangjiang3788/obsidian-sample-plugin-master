import type { Item } from '@core/types/public';
import { buildEnergyManagement } from '@core/energy/public';

function base(overrides: Partial<Item>): Item {
  return {
    id: 'item', title: '', content: '', type: 'block', tags: [], categoryKey: '', recurrence: 'none', created: 0, modified: 0, extra: {}, ...overrides,
  } as Item;
}

function energy(id: string, date: string, time: string, score: number, brain?: number, physical?: number): Item {
  return base({
    id, goalId: 'goal.demo', goalPath: '精力研究示例', date, startTime: time, coreBlock: 'energy', categoryKey: '精力',
    extra: { 核心Block: 'energy', 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), 时间: time, 日期: date, 评分模式: brain != null || physical != null ? 'detailed' : 'quick', ...(brain != null ? { 脑力精力: brain } : {}), ...(physical != null ? { 体力精力: physical } : {}) },
  });
}

function task(id: string, date: string, startTime: string, endTime: string, duration: number, title: string): Item {
  return base({ id, goalId: 'goal.demo', goalPath: '精力研究示例', date, startTime, endTime, duration, title, content: title, coreBlock: 'task', categoryKey: '任务', type: 'task', themePath: /散步|午睡/.test(title) ? '生活/恢复' : '工作/开发' });
}

function activityDay(date: string, kind: 'code' | 'walk', index: number): Item[] {
  if (kind === 'code') return [
    energy(`code-before-${index}`, date, '08:00', 80, 85, 75),
    task(`code-${index}`, date, '08:10', '10:20', 130, '写 Think OS 代码'),
    energy(`code-after-${index}`, date, '10:30', 42, 35, 49),
  ];
  return [
    energy(`walk-before-${index}`, date, '15:00', 38, 28, 48),
    task(`walk-${index}`, date, '15:10', '15:40', 30, '散步恢复'),
    energy(`walk-after-${index}`, date, '15:50', 58, 48, 68),
  ];
}

describe('Energy management cues', () => {
  it('turns repeated personal evidence into recovery/caution candidates and high-energy guardrails', () => {
    const items: Item[] = [
      ...activityDay('2026-08-01', 'code', 1), ...activityDay('2026-08-01', 'walk', 1),
      ...activityDay('2026-08-02', 'code', 2), ...activityDay('2026-08-02', 'walk', 2),
      ...activityDay('2026-08-03', 'code', 3), ...activityDay('2026-08-03', 'walk', 3),
      energy('latest', '2026-08-10', '22:00', 80, 72, 88),
    ];
    const model = buildEnergyManagement(items, { analysisWindowDays: 30 });
    expect(model).not.toBeNull();
    expect(model?.recoveryCandidates.some((row) => row.label === '运动 / 活动')).toBe(true);
    expect(model?.cautionCandidates.some((row) => row.label === '代码 / 开发')).toBe(true);
    expect(model?.guardrails.some((row) => row.key === 'preserve-capacity')).toBe(true);
    expect(model?.guardrails.some((row) => row.key === 'long-session')).toBe(true);
  });

  it('keeps suggestions empty when personal evidence is below the minimum sample floor', () => {
    const items = [
      energy('before', '2026-08-10', '09:00', 40),
      task('walk', '2026-08-10', '09:10', '09:40', 30, '散步恢复'),
      energy('after', '2026-08-10', '09:50', 60),
    ];
    const model = buildEnergyManagement(items);
    expect(model?.recoveryCandidates).toHaveLength(0);
    expect(model?.cautionCandidates).toHaveLength(0);
    expect(model?.readiness.sufficientForPersonalSuggestions).toBe(false);
  });
});
