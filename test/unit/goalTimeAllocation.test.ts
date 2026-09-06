import { buildGoalTimeAllocationSummary } from '@core/goal/public';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem } from '@core/types/public';

function goal(path: string, patch: Partial<GoalDefinition> = {}): GoalDefinition {
  return { path, status: 'active', createdAt: '', updatedAt: '', ...patch };
}

function task(id: string, goalPath?: string): RecordViewItem {
  return {
    id, coreBlock: 'task', title: id, content: id, tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
    ...(goalPath ? { goalPath } : null),
  } as RecordViewItem;
}

function session(id: string, taskId: string, start: string, end: string, minutes: number): RecordViewItem {
  return {
    id, coreBlock: 'task-session', taskId,
    sessionStartedAt: start, sessionEndedAt: end, sessionDurationMinutes: minutes,
    sessionResult: 'task-completed', sessionSource: 'timer',
    title: '', content: '', tags: [], categoryKey: '任务工作块', created: 0, modified: 0, extra: {},
  } as RecordViewItem;
}

describe('Goal TaskSession 实际时间聚合', () => {
  const goals = [
    goal('照顾好自己', { timePresetPercent: 40 }),
    goal('工作', { timePresetPercent: 30 }),
    goal('照顾好自己/身体健康', { weeklyTargetMinutes: 4 * 60 }),
    goal('照顾好自己/体检'),
  ];

  it('只认 TaskSession，子目标 roll-up 到父 Goal；无 Goal Session 进入未归属', () => {
    const records: RecordViewItem[] = [
      { ...task('t-health', '照顾好自己/身体健康'), startAt: '2026-08-25T08:00:00', endAt: '2026-08-25T18:00:00' },
      task('t-work', '工作'),
      task('t-none'),
      session('s-health', 't-health', '2026-08-25T09:00:00', '2026-08-25T09:30:00', 30),
      session('s-work', 't-work', '2026-08-25T10:00:00', '2026-08-25T10:30:00', 30),
      session('s-none', 't-none', '2026-08-25T11:00:00', '2026-08-25T11:30:00', 30),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });

    expect(summary.naturalMinutes).toBe(24 * 60);
    expect(summary.trackedMinutes).toBe(90);
    expect(summary.unallocatedMinutes).toBe(30);
    expect(summary.unallocatedPercentOfNaturalTime).toBeCloseTo(2.08, 1);
    expect(summary.rows.find((row) => row.path === '照顾好自己')).toMatchObject({ minutes: 30, directMinutes: 0, targetMinutes: 576 });
    expect(summary.rows.find((row) => row.path === '照顾好自己/身体健康')).toMatchObject({ minutes: 30, directMinutes: 30 });
    expect(summary.rows.find((row) => row.path === '工作')?.actualPercentOfNaturalTime).toBeCloseTo(2.08, 1);
    expect(summary.trackedMinutes).not.toBeGreaterThan(90);
  });

  it('跨周 Session 只把落入所选范围的部分计入 actual', () => {
    const records = [
      task('t-work', '工作'),
      session('s-cross', 't-work', '2026-08-30T23:30:00', '2026-08-31T00:30:00', 60),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-31T00:00:00'),
      rangeEnd: new Date('2026-09-06T23:59:59.999'),
    });
    expect(summary.trackedMinutes).toBe(30);
    expect(summary.rows.find((row) => row.path === '工作')?.minutes).toBe(30);
  });

  it('优先使用 TaskSession 保存的历史 Goal 快照，不跟随 Task 后续改目标漂移', () => {
    const snapshotGoals = [...goals, goal('工作能力/通勤')];
    const records = [
      task('t-moved', '工作'),
      {
        ...session('s-before-move', 't-moved', '2026-08-25T09:00:00', '2026-08-25T09:30:00', 30),
        goalPath: '工作能力/通勤',
      },
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals: snapshotGoals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });

    expect(summary.rows.find((row) => row.path === '工作能力/通勤')?.minutes).toBe(30);
    expect(summary.rows.find((row) => row.path === '工作')?.minutes).toBe(0);
    expect(summary.unallocatedMinutes).toBe(0);
  });

  it('兼容旧 TaskSession：没有 goalPath 时回退到当前 Task.goalPath', () => {
    const records = [
      task('t-legacy-goal', '工作'),
      session('s-legacy-goal', 't-legacy-goal', '2026-08-25T09:00:00', '2026-08-25T09:30:00', 30),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });

    expect(summary.rows.find((row) => row.path === '工作')?.minutes).toBe(30);
    expect(summary.unallocatedMinutes).toBe(0);
  });

  it('Task 指向不存在的 Goal 时不会偷偷塞进其它 Goal', () => {
    const records = [
      task('t-missing', '不存在/目标'),
      session('s-missing', 't-missing', '2026-08-25T09:00:00', '2026-08-25T10:00:00', 60),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });
    expect(summary.unallocatedMinutes).toBe(60);
    expect(summary.rootRows.every((row) => row.minutes === 0)).toBe(true);
  });
});

describe('Goal 时间观测可信度', () => {
  it('没有记录不等于没有发生：稀疏记录不能直接判偏低', () => {
    const goals = [goal('休息', { timePresetPercent: 40 })];
    const records = [
      task('t-rest', '休息'),
      session('s-rest', 't-rest', '2026-08-25T09:00:00', '2026-08-25T10:00:00', 60),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });
    expect(summary.observationCoverageMinutes).toBe(60);
    expect(summary.unknownMinutes).toBe(23 * 60);
    expect(summary.rows.find((row) => row.path === '休息')?.balanceState).toBe('insufficient');
  });

  it('TaskSession 覆盖时间用区间并集，重叠记录不重复制造覆盖率', () => {
    const goals = [goal('工作', { timePresetPercent: 30 })];
    const records = [
      task('t-a', '工作'), task('t-b', '工作'),
      session('s-a', 't-a', '2026-08-25T09:00:00', '2026-08-25T10:00:00', 60),
      session('s-b', 't-b', '2026-08-25T09:30:00', '2026-08-25T10:30:00', 60),
    ];
    const summary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: new Date('2026-08-25T00:00:00'),
      rangeEnd: new Date('2026-08-25T23:59:59.999'),
    });
    expect(summary.trackedMinutes).toBe(120);
    expect(summary.observationCoverageMinutes).toBe(90);
  });
});
