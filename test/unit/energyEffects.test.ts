import { buildEnergyEffects } from '@core/energy/public';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides,
  } as any;
}

function energy(id: string, date: string, time: string, score: number, extra: Record<string, unknown> = {}, goalId = 'goal.self') {
  return makeItem({
    id, coreBlock: 'energy', categoryKey: '精力', goalId, date, startTime: time,
    extra: {
      精力值: score,
      精力档位: score <= 30 ? 20 : score <= 50 ? 40 : score <= 70 ? 60 : score <= 90 ? 80 : 100,
      时间: time,
      记录方式: 'realtime',
      ...extra,
    },
  });
}

function task(id: string, overrides: Record<string, unknown> = {}) {
  return makeItem({
    id, coreBlock: 'task', status: 'open', goalId: 'goal.self', title: '写 Think OS 代码', content: '写 Think OS 代码', themePath: '工作/开发', ...overrides,
  });
}

function session(id: string, taskId: string, date: string, startTime: string, endTime: string, duration: number, beforeId?: string, afterId?: string, overrides: Record<string, unknown> = {}) {
  return makeItem({
    id,
    coreBlock: 'task-session',
    taskId,
    sessionStartedAt: `${date}T${startTime}:00`,
    sessionEndedAt: `${date}T${endTime}:00`,
    sessionDurationMinutes: duration,
    sessionResult: 'work-block-ended',
    sessionSource: 'timer',
    startEnergyRecordId: beforeId,
    endEnergyRecordId: afterId,
    ...overrides,
  });
}

function linkedActivity(args: { id: string; date: string; start: string; end: string; duration: number; beforeScore: number; afterScore: number; task?: Record<string, unknown>; beforeExtra?: Record<string, unknown>; afterExtra?: Record<string, unknown>; beforeGoal?: string; afterGoal?: string }) {
  const beforeId = `before-${args.id}`;
  const afterId = `after-${args.id}`;
  const taskId = `task-${args.id}`;
  return [
    energy(beforeId, args.date, offsetTime(args.start, -10), args.beforeScore, args.beforeExtra, args.beforeGoal),
    task(taskId, args.task),
    session(`session-${args.id}`, taskId, args.date, args.start, args.end, args.duration, beforeId, afterId),
    energy(afterId, args.date, offsetTime(args.end, 10), args.afterScore, args.afterExtra, args.afterGoal),
  ];
}

function offsetTime(value: string, deltaMinutes: number): string {
  const [h, m] = value.split(':').map(Number);
  const total = h * 60 + m + deltaMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

describe('Energy activity effects', () => {
  it('uses explicit TaskSession Energy links for before/after evidence', () => {
    const model = buildEnergyEffects(linkedActivity({ id: 'coding', date: '2026-08-10', start: '14:00', end: '15:30', duration: 90, beforeScore: 80, afterScore: 40 }));

    expect(model?.pairedActivityCount).toBe(1);
    expect(model?.samples[0]).toMatchObject({
      activityItemId: 'session-coding',
      activityLabel: '代码 / 开发',
      themeLabel: '工作/开发',
      durationBucket: '90–119min',
      beforeGapMinutes: 10,
      afterGapMinutes: 10,
      deltaScore: -40,
      confidence: 'high',
    });
  });

  it('preserves brain and physical deltas from linked detailed snapshots', () => {
    const model = buildEnergyEffects(linkedActivity({
      id: 'coding', date: '2026-08-10', start: '14:00', end: '15:00', duration: 60, beforeScore: 70, afterScore: 50,
      beforeExtra: { 脑力精力: 80, 体力精力: 60, 评分模式: 'detailed' },
      afterExtra: { 脑力精力: 40, 体力精力: 60, 评分模式: 'detailed' },
    }));
    expect(model?.samples[0]).toMatchObject({ deltaScore: -20, deltaBrain: -40, deltaPhysical: 0 });
    expect(model?.byActivity[0]).toMatchObject({ meanBrainDelta: -40, meanPhysicalDelta: 0 });
  });

  it('does not call a two-sample aggregate recovery/depletion', () => {
    const rows = [
      ...linkedActivity({ id: 'a', date: '2026-08-08', start: '09:10', end: '10:10', duration: 60, beforeScore: 80, afterScore: 40 }),
      ...linkedActivity({ id: 'b', date: '2026-08-09', start: '09:10', end: '10:10', duration: 60, beforeScore: 80, afterScore: 40 }),
    ];
    const model = buildEnergyEffects(rows);
    expect(model?.byActivity[0]).toMatchObject({ sampleCount: 2, trend: 'insufficient', evidence: 'insufficient' });
  });

  it('marks repeated consistent Session evidence as candidate depletion', () => {
    const rows = ['2026-08-06', '2026-08-07', '2026-08-08'].flatMap((date, index) => linkedActivity({
      id: String(index), date, start: '09:10', end: '10:10', duration: 60, beforeScore: 80, afterScore: 40 + index,
    }));
    const model = buildEnergyEffects(rows);
    expect(model?.byActivity[0]).toMatchObject({ sampleCount: 3, trend: 'depletion', evidence: 'exploratory' });
  });

  it('ignores unlinked Sessions instead of guessing Energy endpoints by time proximity', () => {
    const rows = [
      energy('before', '2026-08-10', '13:50', 80),
      task('coding'),
      session('session-coding', 'coding', '2026-08-10', '14:00', '14:40', 40),
      energy('after', '2026-08-10', '14:50', 40),
    ];
    const model = buildEnergyEffects(rows);
    expect(model?.eligibleActivityCount).toBe(1);
    expect(model?.pairedActivityCount).toBe(0);
  });

  it('keeps person-level Session feedback valid even when Energy Goal differs from Task Goal', () => {
    const model = buildEnergyEffects(linkedActivity({
      id: 'coding', date: '2026-08-10', start: '14:00', end: '15:00', duration: 60, beforeScore: 80, afterScore: 40,
      beforeGoal: 'goal.other', afterGoal: 'goal.other',
    }));
    expect(model?.pairedActivityCount).toBe(1);
  });
});
