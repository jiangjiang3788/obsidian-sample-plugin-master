import { attachEnergyRecommendationEvidence, buildEnergyActionCandidateResult, buildEnergyActionCandidates } from '@core/energy/public';
import type { EnergyManagementModel } from '@core/energy/public';
import type { Item } from '@core/types/public';

function item(overrides: Partial<Item>): Item {
  return {
    id: 'item', title: '事项', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides,
  } as Item;
}

function task(id: string, title: string, overrides: Partial<Item> = {}): Item {
  return item({ id, title, content: title, coreBlock: 'task', status: 'open', ...overrides });
}

function session(id: string, taskId: string, duration: number, startedAt: string): Item {
  const start = new Date(startedAt);
  const end = new Date(start.getTime() + duration * 60_000);
  return item({
    id, coreBlock: 'task-session', taskId,
    sessionStartedAt: start.toISOString(), sessionEndedAt: end.toISOString(), sessionDurationMinutes: duration,
    sessionResult: 'task-completed', sessionSource: 'timer',
  });
}

describe('Energy recommendation candidate adapter', () => {
  it('uses canonical open Task status and explicit metadata without category/type guessing', () => {
    const rows = buildEnergyActionCandidates([
      task('task-1', '核心代码', { priority: 'highest', dueDate: '2026-08-10', expectedDurationMinutes: 90, extra: { 精力要求: 'high' } }),
      task('done', '已经完成', { status: 'done', completedAt: '2026-08-09T10:00:00Z' }),
    ], { today: '2026-08-10' });

    expect(rows.map((row) => row.id)).toEqual(['task-1']);
    expect(rows[0].durationMinutes).toBe(90);
    expect(rows[0].brainLoad).toBe('high');
    expect(rows[0].physicalLoad).toBe('high');
    expect(rows[0].recoveryIntent).toBe(false);
  });

  it('does not recommend Habit check-ins or recurring Task instances by default', () => {
    const rows = buildEnergyActionCandidates([
      item({ id: 'habit-repeat', title: '身体状态', coreBlock: 'habit' }),
      task('task-repeat', '每天习惯', { seriesId: 'taskseries.daily', recurrenceInfo: { unit: 'day', interval: 1, anchor: 'scheduled' } }),
      task('task-real', '整理代码'),
    ], { today: '2026-08-10' });
    expect(rows.map((row) => row.id)).toEqual(['task-real']);
  });

  it('allows explicit opt-in for special Plan/Habit/recurring actions', () => {
    const rows = buildEnergyActionCandidates([
      item({ id: 'habit', title: '散步', coreBlock: 'habit', extra: { 可推荐: true, 恢复意图: true } }),
      item({ id: 'plan', title: '恢复计划', coreBlock: 'plan', extra: { 可推荐: true } }),
      task('repeat', '瑜伽', { seriesId: 'taskseries.yoga', recurrenceInfo: { unit: 'day', interval: 1, anchor: 'scheduled' }, extra: { 可推荐: true } }),
    ], { today: '2026-08-10', includeHabits: true, includePlans: true });
    expect(rows.map((row) => row.id).sort()).toEqual(['habit', 'plan', 'repeat']);
  });

  it('keeps old open backlog actionable while blocking tasks whose start date is still in the future', () => {
    const rows = buildEnergyActionCandidates([
      task('backlog', '旧任务', { startDate: '2025-08-01' }),
      task('undated', '当前待办'),
      task('future', '未来任务', { startDate: '2026-08-11' }),
    ], { today: '2026-08-10' });
    expect(rows.map((row) => row.id).sort()).toEqual(['backlog', 'undated']);
    expect(rows.every((row) => row.valueScore === 50)).toBe(true);
  });

  it('uses seriesId as recurring identity and exposes candidate diagnostics', () => {
    const result = buildEnergyActionCandidateResult([
      task('real-open', '统一设计字体'),
      task('repeat', '每日习惯', { seriesId: 'taskseries.daily', recurrenceInfo: { unit: 'day', interval: 1, anchor: 'scheduled' } }),
    ], { today: '2026-08-10' });
    expect(result.candidates.map((row) => row.id)).toEqual(['real-open']);
    expect(result.diagnostics.openTasks).toBe(2);
    expect(result.diagnostics.recurringOpenTasks).toBe(1);
    expect(result.diagnostics.eligibleTasks).toBe(1);
    expect(result.diagnostics.candidateCount).toBe(1);
  });

  it('infers a typical duration from TaskSession history in the same goal/theme when N>=3', () => {
    const base = { goalId: 'goal.a', themePath: '电脑/记录系统' };
    const open = task('open', '新任务', base);
    const h1 = task('h1', '历史1', { ...base, status: 'done' });
    const h2 = task('h2', '历史2', { ...base, status: 'done' });
    const h3 = task('h3', '历史3', { ...base, status: 'done' });
    const history = [
      open, h1, h2, h3,
      session('s1', h1.id, 30, '2026-08-01T09:00:00.000Z'),
      session('s2', h2.id, 45, '2026-08-02T09:00:00.000Z'),
      session('s3', h3.id, 60, '2026-08-03T09:00:00.000Z'),
    ];
    const rows = buildEnergyActionCandidates([open], { today: '2026-08-10', historyRecords: history });
    expect(rows).toHaveLength(1);
    expect(rows[0].durationMinutes).toBe(45);
  });

  it('attaches only exact personal evidence with enough samples', () => {
    const candidates = buildEnergyActionCandidates([task('walk', '散步')], { today: '2026-08-10' });
    const management = {
      recoveryCandidates: [{ label: '散步', key: '散步', sampleCount: 6, meanDelta: 14, medianDelta: 12, evidence: 'supported', reason: 'N=6' }],
      cautionCandidates: [],
    } as unknown as EnergyManagementModel;
    const attached = attachEnergyRecommendationEvidence(candidates, management);
    expect(attached[0].historicalEffect).toEqual(expect.objectContaining({ meanDelta: 14, sampleCount: 6 }));
  });
});
