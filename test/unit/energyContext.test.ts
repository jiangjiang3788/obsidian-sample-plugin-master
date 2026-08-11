import { resolveEnergyContext } from '@core/energy/public';

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

describe('Energy context resolver', () => {
  it('finds an active task as high-confidence context', () => {
    const task = makeItem({
      id: 'task-active',
      coreBlock: 'task',
      type: 'task',
      goalId: 'goal.self',
      title: '写 Think OS 代码',
      doneDate: '2026-08-10',
      startTime: '14:00',
      endTime: '16:00',
      duration: 120,
    });
    const context = resolveEnergyContext(energy(), [task]);
    expect(context?.primaryActivity).toMatchObject({
      itemId: 'task-active',
      relation: 'active',
      confidence: 'high',
      gapMinutes: 0,
      durationMinutes: 120,
    });
  });

  it('finds a recently ended task and reports the gap', () => {
    const task = makeItem({
      id: 'task-recent',
      coreBlock: 'task',
      goalId: 'goal.self',
      title: '写代码',
      date: '2026-08-10',
      startTime: '14:00',
      endTime: '15:30',
      duration: 90,
    });
    const context = resolveEnergyContext(energy(), [task]);
    expect(context?.primaryActivity).toMatchObject({
      itemId: 'task-recent',
      relation: 'recent',
      confidence: 'high',
      gapMinutes: 8,
      durationMinutes: 90,
    });
  });

  it('does not present a low-confidence two-hour-old task as primary activity', () => {
    const task = makeItem({
      id: 'task-old',
      coreBlock: 'task',
      goalId: 'goal.self',
      title: '上午任务',
      date: '2026-08-10',
      startTime: '12:30',
      endTime: '13:40',
      duration: 70,
    });
    const context = resolveEnergyContext(energy(), [task]);
    expect(context?.nearbyActivities[0]).toMatchObject({ itemId: 'task-old', confidence: 'low', gapMinutes: 118 });
    expect(context?.primaryActivity).toBeUndefined();
  });

  it('prefers same-goal activities and ignores another goal', () => {
    const sameGoal = makeItem({
      id: 'same-goal', coreBlock: 'task', goalId: 'goal.self', title: '自己的任务', date: '2026-08-10', startTime: '15:00', endTime: '15:20', duration: 20,
    });
    const otherGoal = makeItem({
      id: 'other-goal', coreBlock: 'task', goalId: 'goal.work', title: '别的目标', date: '2026-08-10', startTime: '15:20', endTime: '15:37', duration: 17,
    });
    const context = resolveEnergyContext(energy(), [sameGoal, otherGoal]);
    expect(context?.primaryActivity?.itemId).toBe('same-goal');
    expect(context?.nearbyActivities.some((row) => row.itemId === 'other-goal')).toBe(false);
  });

  it('adds same-day sleep/body/exercise check-ins as background signals', () => {
    const sleep = makeItem({
      id: 'sleep', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '睡眠', rating: 40,
    });
    const body = makeItem({
      id: 'body', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '身体状态', rating: 60,
    });
    const exercise = makeItem({
      id: 'exercise', coreBlock: 'habit', categoryKey: '打卡', goalId: 'goal.self', date: '2026-08-10', title: '八段锦', rating: 1,
    });
    const context = resolveEnergyContext(energy(), [sleep, body, exercise]);
    expect(context?.dailySignals.map((signal) => [signal.kind, signal.value])).toEqual([
      ['sleep', 40],
      ['body', 60],
      ['exercise', 1],
    ]);
  });
});
