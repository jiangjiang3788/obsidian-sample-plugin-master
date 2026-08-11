import { attachEnergyRecommendationEvidence, buildEnergyActionCandidateResult, buildEnergyActionCandidates } from '@core/energy/public';
import type { EnergyManagementModel } from '@core/energy/public';
import type { Item } from '@core/types/public';

function item(overrides: Partial<Item>): Item {
  return {
    id: 'item',
    title: '事项',
    content: '',
    type: 'block',
    tags: [],
    categoryKey: '',
    recurrence: '',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as Item;
}

describe('Energy recommendation candidate adapter', () => {
  it('uses open tasks and explicit metadata without guessing from titles', () => {
    const rows = buildEnergyActionCandidates([
      item({
        id: 'task-1',
        title: '核心代码',
        type: 'task',
        coreBlock: 'task',
        categoryKey: '未完成任务',
        priority: 'highest',
        dueDate: '2026-08-10',
        extra: { 预计时长: 90, 精力要求: '高' },
      }),
      item({
        id: 'done',
        title: '已经完成',
        type: 'task',
        coreBlock: 'task',
        categoryKey: '完成任务',
        doneDate: '2026-08-09',
      }),
    ], { today: '2026-08-10' });

    expect(rows.map((row) => row.id)).toEqual(['task-1']);
    expect(rows[0].durationMinutes).toBe(90);
    expect(rows[0].brainLoad).toBe('high');
    expect(rows[0].physicalLoad).toBe('high');
    expect(rows[0].recoveryIntent).toBe(false);
  });

  it('does not recommend Habit check-ins or recurring task routines by default', () => {
    const rows = buildEnergyActionCandidates([
      item({ id: 'habit-repeat', title: '身体状态', coreBlock: 'habit', recurrence: 'daily' }),
      item({ id: 'task-repeat', title: '每天习惯', type: 'task', coreBlock: 'task', categoryKey: '未完成任务', recurrence: 'daily' }),
      item({ id: 'task-real', title: '整理代码', type: 'task', coreBlock: 'task', categoryKey: '未完成任务' }),
    ], { today: '2026-08-10' });
    expect(rows.map((row) => row.id)).toEqual(['task-real']);
  });

  it('allows explicit opt-in for special Plan/Habit/repeating actions', () => {
    const rows = buildEnergyActionCandidates([
      item({ id: 'habit', title: '散步', coreBlock: 'habit', extra: { 可推荐: true, 恢复意图: true } }),
      item({ id: 'plan', title: '恢复计划', coreBlock: 'plan', extra: { 可推荐: true } }),
      item({ id: 'repeat', title: '瑜伽', type: 'task', coreBlock: 'task', categoryKey: '未完成任务', recurrence: 'daily', extra: { 可推荐: true } }),
    ], { today: '2026-08-10', includeHabits: true, includePlans: true });
    expect(rows.map((row) => row.id).sort()).toEqual(['habit', 'plan', 'repeat']);
  });

  it('keeps old open backlog actionable while blocking tasks whose start date is still in the future', () => {
    const rows = buildEnergyActionCandidates([
      item({ id: 'backlog', title: '\u65e7\u4efb\u52a1', type: 'task', coreBlock: 'task', categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1', recurrence: 'none', startDate: '2025-08-01' }),
      item({ id: 'undated', title: '\u5f53\u524d\u5f85\u529e', type: 'task', coreBlock: 'task', categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1', recurrence: 'none', date: '2025-08-01' }),
      item({ id: 'future', title: '\u672a\u6765\u4efb\u52a1', type: 'task', coreBlock: 'task', categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1', recurrence: 'none', startDate: '2026-08-11' }),
    ], { today: '2026-08-10' });
    expect(rows.map((row) => row.id).sort()).toEqual(['backlog', 'undated']);
    expect(rows.every((row) => row.valueScore === 50)).toBe(true);
  });

  it('treats normalized recurrence=none as non-recurring and exposes candidate diagnostics', () => {
    const result = buildEnergyActionCandidateResult([
      item({ id: 'real-open', title: '\u7edf\u4e00\u8bbe\u8ba1\u5b57\u4f53', type: 'task', coreBlock: 'task', categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1', recurrence: 'none' }),
      item({ id: 'repeat', title: '\u6bcf\u65e5\u4e60\u60ef', type: 'task', coreBlock: 'task', categoryKey: '\u672a\u5b8c\u6210\u4efb\u52a1', recurrence: 'every day' }),
    ], { today: '2026-08-10' });
    expect(result.candidates.map((row) => row.id)).toEqual(['real-open']);
    expect(result.diagnostics.openTasks).toBe(2);
    expect(result.diagnostics.recurringOpenTasks).toBe(1);
    expect(result.diagnostics.eligibleTasks).toBe(1);
    expect(result.diagnostics.candidateCount).toBe(1);
  });

  it('infers a typical duration from completed tasks in the same goal/theme when N>=3', () => {
    const base = { type: 'task' as const, coreBlock: 'task', goalId: 'goal.a', themePath: '电脑/记录系统' };
    const rows = buildEnergyActionCandidates([
      item({ ...base, id: 'open', title: '新任务', categoryKey: '未完成任务' }),
      item({ ...base, id: 'd1', title: '历史1', categoryKey: '完成任务', doneDate: '2026-08-01', duration: 30 }),
      item({ ...base, id: 'd2', title: '历史2', categoryKey: '完成任务', doneDate: '2026-08-02', duration: 45 }),
      item({ ...base, id: 'd3', title: '历史3', categoryKey: '完成任务', doneDate: '2026-08-03', duration: 60 }),
    ], { today: '2026-08-10' });
    expect(rows).toHaveLength(1);
    expect(rows[0].durationMinutes).toBe(45);
  });

  it('attaches only exact personal evidence with enough samples', () => {
    const candidates = buildEnergyActionCandidates([
      item({ id: 'walk', title: '散步', type: 'task', coreBlock: 'task', categoryKey: '未完成任务' }),
    ], { today: '2026-08-10' });
    const management = {
      recoveryCandidates: [{ label: '散步', key: '散步', sampleCount: 6, meanDelta: 14, medianDelta: 12, evidence: 'supported', reason: 'N=6' }],
      cautionCandidates: [],
    } as unknown as EnergyManagementModel;
    const attached = attachEnergyRecommendationEvidence(candidates, management);
    expect(attached[0].historicalEffect).toEqual(expect.objectContaining({ meanDelta: 14, sampleCount: 6 }));
  });
});
