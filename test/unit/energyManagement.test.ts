import type { Item } from '@core/types/public';
import { buildEnergyManagement } from '@core/energy/public';

function base(overrides: Partial<Item>): Item {
  return { id: 'item', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides } as Item;
}

function energy(id: string, date: string, time: string, score: number, brain?: number, physical?: number): Item {
  return base({
    id, goalId: 'goal.demo', goalPath: '精力研究示例', date, startTime: time, coreBlock: 'energy', categoryKey: '精力',
    extra: { 核心Block: 'energy', 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), 时间: time, 日期: date, 评分模式: brain != null || physical != null ? 'detailed' : 'quick', ...(brain != null ? { 脑力精力: brain } : {}), ...(physical != null ? { 体力精力: physical } : {}) },
  });
}

function task(id: string, title: string): Item {
  return base({ id, goalId: 'goal.demo', goalPath: '精力研究示例', title, content: title, coreBlock: 'task', status: 'open', themePath: /散步|午睡/.test(title) ? '生活/恢复' : '工作/开发' });
}

function session(id: string, taskId: string, date: string, startTime: string, endTime: string, duration: number, beforeId: string, afterId: string): Item {
  return base({
    id, coreBlock: 'task-session', taskId,
    sessionStartedAt: `${date}T${startTime}:00`, sessionEndedAt: `${date}T${endTime}:00`, sessionDurationMinutes: duration,
    sessionResult: 'work-block-ended', sessionSource: 'timer', startEnergyRecordId: beforeId, endEnergyRecordId: afterId,
  });
}

function activityDay(date: string, kind: 'code' | 'walk', index: number): Item[] {
  if (kind === 'code') {
    const beforeId = `code-before-${index}`;
    const afterId = `code-after-${index}`;
    const taskId = `code-${index}`;
    return [
      energy(beforeId, date, '08:00', 80, 85, 75),
      task(taskId, '写 Think OS 代码'),
      session(`code-session-${index}`, taskId, date, '08:10', '10:20', 130, beforeId, afterId),
      energy(afterId, date, '10:30', 42, 35, 49),
    ];
  }
  const beforeId = `walk-before-${index}`;
  const afterId = `walk-after-${index}`;
  const taskId = `walk-${index}`;
  return [
    energy(beforeId, date, '15:00', 38, 28, 48),
    task(taskId, '散步恢复'),
    session(`walk-session-${index}`, taskId, date, '15:10', '15:40', 30, beforeId, afterId),
    energy(afterId, date, '15:50', 58, 48, 68),
  ];
}

describe('Energy management cues', () => {
  it('turns repeated persistent Session evidence into recovery/caution candidates and guardrails', () => {
    const evidence: Item[] = [
      ...activityDay('2026-08-01', 'code', 1), ...activityDay('2026-08-01', 'walk', 1),
      ...activityDay('2026-08-02', 'code', 2), ...activityDay('2026-08-02', 'walk', 2),
      ...activityDay('2026-08-03', 'code', 3), ...activityDay('2026-08-03', 'walk', 3),
      energy('latest', '2026-08-10', '22:00', 80, 72, 88),
    ];
    const visibleEnergy = evidence.filter((item) => item.coreBlock === 'energy');
    const model = buildEnergyManagement(visibleEnergy, { evidenceRecords: evidence, analysisWindowDays: 30 });
    expect(model).not.toBeNull();
    expect(model?.recoveryCandidates.some((row) => row.label === '运动 / 活动')).toBe(true);
    expect(model?.cautionCandidates.some((row) => row.label === '代码 / 开发')).toBe(true);
    expect(model?.guardrails.some((row) => row.key === 'preserve-capacity')).toBe(true);
    expect(model?.guardrails.some((row) => row.key === 'long-session')).toBe(true);
  });

  it('keeps suggestions empty when persistent evidence is below the minimum sample floor', () => {
    const before = energy('before', '2026-08-10', '09:00', 40);
    const after = energy('after', '2026-08-10', '09:50', 60);
    const t = task('walk', '散步恢复');
    const evidence = [before, t, session('walk-session', t.id, '2026-08-10', '09:10', '09:40', 30, before.id, after.id), after];
    const model = buildEnergyManagement([before, after], { evidenceRecords: evidence });
    expect(model?.recoveryCandidates).toHaveLength(0);
    expect(model?.cautionCandidates).toHaveLength(0);
    expect(model?.readiness.sufficientForPersonalSuggestions).toBe(false);
  });
});
