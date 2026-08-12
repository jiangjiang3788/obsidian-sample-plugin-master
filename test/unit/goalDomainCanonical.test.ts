import { assertCanonicalGoalSettings, normalizeGoalPath, requireGoalPath } from '@/core/goal/public';

describe('Goal canonical domain', () => {
  it('accepts slash hierarchy and rejects Tag markers', () => {
    expect(normalizeGoalPath('照顾好自己 / 睡眠')).toBe('照顾好自己/睡眠');
    expect(normalizeGoalPath('#照顾好自己')).toBeNull();
    expect(() => requireGoalPath('＃照顾好自己')).toThrow(/without #/);
  });

  it('rejects Goal hash and persisted Goal defaults in GoalTemplate', () => {
    expect(() => assertCanonicalGoalSettings({
      goals: [{ id: 'goal.self', title: '#照顾好自己', goalPath: '#照顾好自己', status: 'active' } as any],
      goalTemplates: [],
    })).toThrow(/Goal title must not contain #/);

    expect(() => assertCanonicalGoalSettings({
      goals: [{ id: 'goal.self', title: '照顾好自己', goalPath: '照顾好自己', status: 'active' } as any],
      goalTemplates: [{
        id: 'goal-template.goal.self.core.task', goalId: 'goal.self', coreBlockId: 'core.task', enabled: true,
        defaultValues: { 目标: '照顾好自己' },
      } as any],
    })).toThrow(/must not persist Goal defaults/);
  });
});
