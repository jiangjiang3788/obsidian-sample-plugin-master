import { resolveEnergyContext } from '@core/energy/public';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item',
    title: '',
    content: '',
    tags: [],
    categoryKey: '',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as any;
}

function energy(overrides: Record<string, unknown> = {}) {
  return makeItem({
    id: 'energy-1',
    coreBlock: 'energy',
    categoryKey: '精力',
    goalId: 'goal.self',
    date: '2026-08-10',
    startTime: '15:38',
    extra: { 精力值: 20, 精力档位: 20, 时间: '15:38' },
    ...overrides,
  });
}

function task(id: string, goalId = 'goal.self', title = '写 Think OS 代码') {
  return makeItem({ id, coreBlock: 'task', status: 'open', goalId, title, content: title });
}

function session(id: string, taskId: string, start: string, end: string, duration: number, extra: Record<string, unknown> = {}) {
  return makeItem({
    id,
    coreBlock: 'task-session',
    taskId,
    sessionStartedAt: `2026-08-10T${start}:00`,
    sessionEndedAt: `2026-08-10T${end}:00`,
    sessionDurationMinutes: duration,
    sessionResult: 'work-block-ended',
    sessionSource: 'timer',
    ...extra,
  });
}

describe('Energy context resolver', () => {
  it('finds a TaskSession spanning the snapshot as high-confidence context', () => {
    const rows = [task('task-active'), session('session-active', 'task-active', '14:00', '16:00', 120)];
    const context = resolveEnergyContext(energy(), rows);
    expect(context?.primaryActivity).toMatchObject({
      itemId: 'session-active',
      relation: 'active',
      confidence: 'high',
      gapMinutes: 0,
      durationMinutes: 120,
    });
  });

  it('finds a recently ended Session and reports the gap', () => {
    const rows = [task('task-recent'), session('session-recent', 'task-recent', '14:00', '15:30', 90)];
    const context = resolveEnergyContext(energy(), rows);
    expect(context?.primaryActivity).toMatchObject({
      itemId: 'session-recent',
      relation: 'recent',
      confidence: 'high',
      gapMinutes: 8,
      durationMinutes: 90,
    });
  });

  it('does not present a low-confidence two-hour-old Session as primary activity', () => {
    const rows = [task('task-old'), session('session-old', 'task-old', '12:30', '13:40', 70)];
    const context = resolveEnergyContext(energy(), rows);
    expect(context?.nearbyActivities[0]).toMatchObject({ itemId: 'session-old', confidence: 'low', gapMinutes: 118 });
    expect(context?.primaryActivity).toBeUndefined();
  });

  it('does not suppress TaskSession context when Task Goal differs from Energy Goal', () => {
    const rows = [
      task('same-goal', 'goal.self', '自己的任务'),
      session('session-same', 'same-goal', '15:00', '15:20', 20),
      task('other-goal', 'goal.work', '别的目标'),
      session('session-other', 'other-goal', '15:20', '15:37', 17),
    ];
    const context = resolveEnergyContext(energy(), rows);
    expect(context?.primaryActivity?.itemId).toBe('session-other');
    expect(context?.primaryActivity?.item.title).toBe('别的目标');
  });

  it('adds same-day sleep/body/exercise check-ins as background signals', () => {
    const sleep = makeItem({ id: 'sleep', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '睡眠', rating: 40 });
    const body = makeItem({ id: 'body', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '身体状态', rating: 60 });
    const exercise = makeItem({ id: 'exercise', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '八段锦', rating: 1 });
    const context = resolveEnergyContext(energy(), [sleep, body, exercise]);
    expect(context?.dailySignals.map((signal) => [signal.kind, signal.value])).toEqual([
      ['sleep', 40],
      ['body', 60],
      ['exercise', 1],
    ]);
  });
});
