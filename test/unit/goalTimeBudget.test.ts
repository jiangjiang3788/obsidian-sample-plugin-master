import {
  NATURAL_WEEK_MINUTES,
  TIME_BALANCE_TOLERANCE_RATIO,
  getGoalTimePresetInfo,
  getGoalWeeklyTargetMinutes,
  getRootTimePresetTotals,
  resolveGoalTargetForRange,
} from '@core/goal/public';
import type { GoalDefinition, GoalTimePresetRevision } from '@core/goal/public';

function goal(path: string, patch: Partial<GoalDefinition> = {}): GoalDefinition {
  return { path, status: 'active', createdAt: '', updatedAt: '', ...patch };
}

describe('Goal 时间预设', () => {
  it('顶层百分比基于自然一周 168h，允许保留未预设时间', () => {
    const goals = [
      goal('休息', { timePresetPercent: 40 }),
      goal('工作', { timePresetPercent: 30 }),
      goal('爱好', { timePresetPercent: 20 }),
    ];
    expect(getGoalWeeklyTargetMinutes('休息', goals)).toBe(NATURAL_WEEK_MINUTES * 0.4);
    expect(getRootTimePresetTotals(goals)).toMatchObject({ configuredPercent: 90, reservePercent: 10 });
    expect(TIME_BALANCE_TOLERANCE_RATIO).toBe(0.10);
  });

  it('子目标直接使用周目标时间，剩余自动成为未分配且总计闭合', () => {
    const goals = [
      goal('休息', { timePresetPercent: 42 }),
      goal('休息/睡眠', { weeklyTargetMinutes: 56 * 60 }),
      goal('休息/吃饭', { weeklyTargetMinutes: 7 * 60 }),
      goal('休息/运动', { weeklyTargetMinutes: 4 * 60 }),
      goal('休息/体检'),
    ];
    const info = getGoalTimePresetInfo('休息', goals)!;
    expect(info.weeklyTargetMinutes).toBeCloseTo(70.56 * 60, 1);
    expect(info.directChildrenTargetMinutes).toBe(67 * 60);
    expect(info.unallocatedMinutes).toBeCloseTo(3.56 * 60, 1);
    expect(info.directChildrenTargetMinutes + info.unallocatedMinutes).toBeCloseTo(info.weeklyTargetMinutes!, 1);
    expect(getGoalWeeklyTargetMinutes('休息/体检', goals)).toBeNull();
  });
});


describe('Goal 时间预设历史', () => {
  it('有当时预设时按当时额度计算；当时没设则按当前预设回算', () => {
    const goals = [
      goal('休息', { timePresetPercent: 50 }),
      goal('休息/睡眠', { weeklyTargetMinutes: 56 * 60 }),
      goal('工作', { timePresetPercent: 20 }),
    ];
    const revisions: GoalTimePresetRevision[] = [{
      effectiveWeekStart: '2026-08-03',
      presets: {
        '休息': { timePresetPercent: 40 },
        '休息/睡眠': { weeklyTargetMinutes: 49 * 60 },
      },
    }];
    const historical = resolveGoalTargetForRange(
      '休息', goals, revisions,
      new Date('2026-08-03T00:00:00'), new Date('2026-08-09T23:59:59.999'),
    );
    expect(historical.minutes).toBeCloseTo(NATURAL_WEEK_MINUTES * 0.4, 1);
    expect(historical.source).toBe('historical');

    const fallback = resolveGoalTargetForRange(
      '工作', goals, revisions,
      new Date('2026-08-03T00:00:00'), new Date('2026-08-09T23:59:59.999'),
    );
    expect(fallback.minutes).toBeCloseTo(NATURAL_WEEK_MINUTES * 0.2, 1);
    expect(fallback.source).toBe('current-fallback');
  });
});
