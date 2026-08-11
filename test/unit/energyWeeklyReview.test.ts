import type { Item } from '@core/types/public';
import { buildEnergyWeeklyReview } from '@core/energy/public';

function base(overrides: Partial<Item>): Item {
  return { id: 'x', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides } as Item;
}

function energy(id: string, date: string, time: string, score: number, brain = score, physical = score): Item {
  return base({ id, goalId: 'goal.demo', goalPath: 'Demo', date, startTime: time, coreBlock: 'energy', categoryKey: '精力', extra: { 核心Block: 'energy', 日期: date, 时间: time, 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), 脑力精力: brain, 体力精力: physical, 评分模式: 'detailed', 记录方式: 'realtime' } });
}

function task(id: string, title: string): Item {
  return base({ id, goalId: 'goal.demo', goalPath: 'Demo', title, content: title, coreBlock: 'task', status: 'open', themePath: /散步/.test(title) ? '健康/恢复' : '工作/开发' });
}

function session(id: string, taskId: string, date: string, start: string, end: string, duration: number, beforeId: string, afterId: string): Item {
  return base({ id, coreBlock: 'task-session', taskId, goalId: 'goal.demo', goalPath: 'Demo', sessionStartedAt: `${date}T${start}:00`, sessionEndedAt: `${date}T${end}:00`, sessionDurationMinutes: duration, sessionResult: 'work-block-ended', sessionSource: 'timer', startEnergyRecordId: beforeId, endEnergyRecordId: afterId });
}

describe('buildEnergyWeeklyReview', () => {
  it('summarizes sparse coverage and conservative weekly findings from Session evidence', () => {
    const evidence: Item[] = [];
    const visible: Item[] = [];
    const days = ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-08', '2026-08-09', '2026-08-10'];
    days.forEach((date, index) => {
      const codeBefore = energy(`before-${index}`, date, '08:00', 80, 85, 75);
      const codeAfter = energy(`after-${index}`, date, '10:30', 40, 30, 50);
      const codeTask = task(`code-${index}`, '写代码');
      const codeSession = session(`code-session-${index}`, codeTask.id, date, '08:10', '10:20', 130, codeBefore.id, codeAfter.id);
      const walkBefore = energy(`walk-before-${index}`, date, '14:00', 40, 30, 50);
      const walkAfter = energy(`walk-after-${index}`, date, '14:50', 60, 55, 65);
      const walkTask = task(`walk-${index}`, '散步恢复');
      const walkSession = session(`walk-session-${index}`, walkTask.id, date, '14:10', '14:40', 30, walkBefore.id, walkAfter.id);
      visible.push(codeBefore, codeAfter, walkBefore, walkAfter);
      evidence.push(codeBefore, codeTask, codeSession, codeAfter, walkBefore, walkTask, walkSession, walkAfter);
    });
    const review = buildEnergyWeeklyReview(visible, { evidenceRecords: evidence, windowDays: 7, endDate: '2026-08-10' });
    expect(review?.coverage.sampledDays).toBe(6);
    expect(review?.coverage.missingDays).toBe(1);
    expect(review?.topRecovery?.label).toBe('运动 / 活动');
    expect(review?.topDepletion?.label).toBe('代码 / 开发');
    expect(review?.longWork?.pairedSessionCount).toBeGreaterThanOrEqual(3);
    expect(review?.readiness.sufficientCoverage).toBe(true);
  });
});
