/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F030/unit
 */
import { assertCanonicalGoalSettings, normalizeGoalPath, requireGoalPath } from '@/core/goal/public';

describe('Goal canonical domain', () => {
  it('uses one canonical slash path as Goal identity', () => {
    expect(normalizeGoalPath('照顾好自己 / 睡眠')).toBe('照顾好自己/睡眠');
    expect(normalizeGoalPath('#照顾好自己')).toBeNull();
    expect(() => requireGoalPath('＃照顾好自己')).toThrow(/without #/);
  });

  it('rejects invalid Goal identity and Goal context persisted inside templates', () => {
    expect(() => assertCanonicalGoalSettings({
      goals: [{ path: '#照顾好自己', status: 'active' } as any],
      goalTemplates: [],
    })).toThrow(/canonical slash path|required|must not contain #/);

    expect(() => assertCanonicalGoalSettings({
      goals: [{ path: '照顾好自己', status: 'active' } as any],
      goalTemplates: [{ goalPath: '照顾好自己', recordTypeId: 'core.task', enabled: true, defaultValues: { 目标: '照顾好自己' } } as any],
    })).toThrow(/must not persist Goal|system context/i);
  });

  it('rejects duplicate Goal x CoreBlock templates', () => {
    expect(() => assertCanonicalGoalSettings({
      goals: [{ path: '照顾好自己', status: 'active' } as any],
      goalTemplates: [
        { goalPath: '照顾好自己', recordTypeId: 'core.task', enabled: true },
        { goalPath: '照顾好自己', recordTypeId: 'core.task', enabled: true },
      ] as any,
    })).toThrow(/duplicate/i);
  });
});
