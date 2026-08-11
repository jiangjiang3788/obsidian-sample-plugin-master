import { buildEnergyEffects } from '@core/energy/public';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item',
    title: '',
    content: '',
    type: 'block',
    tags: [],
    categoryKey: '',
    recurrence: 'none',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as any;
}

function energy(id: string, date: string, time: string, score: number, extra: Record<string, unknown> = {}, goalId: string = 'goal.self') {
  return makeItem({
    id,
    coreBlock: 'energy',
    categoryKey: '精力',
    goalId,
    date,
    startTime: time,
    extra: {
      精力值: score,
      精力档位: score <= 30 ? 20 : score <= 50 ? 40 : score <= 70 ? 60 : score <= 90 ? 80 : 100,
      时间: time,
      记录方式: 'realtime',
      ...extra,
    },
  });
}

function task(id: string, date: string, startTime: string, endTime: string, duration: number, overrides: Record<string, unknown> = {}) {
  return makeItem({
    id,
    coreBlock: 'task',
    type: 'task',
    categoryKey: '任务',
    goalId: 'goal.self',
    title: '写 Think OS 代码',
    themePath: '工作/开发',
    date,
    startTime,
    endTime,
    duration,
    ...overrides,
  });
}

describe('Energy activity effects', () => {
  it('pairs an exact before/after energy sample around a completed activity', () => {
    const model = buildEnergyEffects([
      energy('before', '2026-08-10', '13:50', 80),
      task('coding', '2026-08-10', '14:00', '15:30', 90),
      energy('after', '2026-08-10', '15:38', 40),
    ]);

    expect(model?.pairedActivityCount).toBe(1);
    expect(model?.samples[0]).toMatchObject({
      activityItemId: 'coding',
      activityLabel: '代码 / 开发',
      themeLabel: '工作/开发',
      durationBucket: '90–119min',
      beforeGapMinutes: 10,
      afterGapMinutes: 8,
      deltaScore: -40,
      confidence: 'high',
    });
  });

  it('preserves brain and physical deltas when both endpoints are detailed', () => {
    const model = buildEnergyEffects([
      energy('before', '2026-08-10', '13:50', 70, { 脑力精力: 80, 体力精力: 60, 评分模式: 'detailed' }),
      task('coding', '2026-08-10', '14:00', '15:00', 60),
      energy('after', '2026-08-10', '15:10', 50, { 脑力精力: 40, 体力精力: 60, 评分模式: 'detailed' }),
    ]);

    expect(model?.samples[0]).toMatchObject({ deltaScore: -20, deltaBrain: -40, deltaPhysical: 0 });
    expect(model?.byActivity[0]).toMatchObject({ meanBrainDelta: -40, meanPhysicalDelta: 0 });
  });

  it('does not call a two-sample aggregate recovery/depletion', () => {
    const rows = [
      ['2026-08-08', 'a'],
      ['2026-08-09', 'b'],
    ].flatMap(([date, suffix]) => [
      energy(`before-${suffix}`, date, '09:00', 80),
      task(`task-${suffix}`, date, '09:10', '10:10', 60),
      energy(`after-${suffix}`, date, '10:20', 40),
    ]);
    const model = buildEnergyEffects(rows);

    expect(model?.byActivity[0]).toMatchObject({ sampleCount: 2, trend: 'insufficient', evidence: 'insufficient' });
  });

  it('marks repeated consistent samples as candidate depletion while keeping causal language out of the model', () => {
    const rows = ['2026-08-06', '2026-08-07', '2026-08-08'].flatMap((date, index) => [
      energy(`before-${index}`, date, '09:00', 80),
      task(`task-${index}`, date, '09:10', '10:10', 60),
      energy(`after-${index}`, date, '10:20', 40 + index),
    ]);
    const model = buildEnergyEffects(rows);

    expect(model?.byActivity[0]).toMatchObject({
      sampleCount: 3,
      trend: 'depletion',
      evidence: 'exploratory',
    });
  });

  it('excludes an attribution when another meaningful task sits between baseline and result sample', () => {
    const model = buildEnergyEffects([
      energy('before', '2026-08-10', '13:50', 80),
      task('coding', '2026-08-10', '14:00', '14:40', 40),
      task('meeting', '2026-08-10', '14:45', '15:15', 30, { title: '开会', themePath: '工作/会议' }),
      energy('after', '2026-08-10', '15:20', 40),
    ]);

    expect(model?.eligibleActivityCount).toBe(2);
    expect(model?.pairedActivityCount).toBe(0);
  });

  it('does not pair an activity with energy samples from another goal', () => {
    const model = buildEnergyEffects([
      energy('before-other', '2026-08-10', '13:50', 80, {}, 'goal.other'),
      task('coding', '2026-08-10', '14:00', '15:00', 60),
      energy('after-other', '2026-08-10', '15:10', 40, {}, 'goal.other'),
    ]);

    expect(model?.pairedActivityCount).toBe(0);
  });
});
