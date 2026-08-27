/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F032/integration
 * @covers F032/regression
 */
import {
  isPeriodAwareRecordType,
  resolveDerivedPeriod,
  resolveTemplatePeriodPolicy,
} from '@/core/goal/period';

describe('Goal 周期策略组合链路', () => {
  it('计划与总结默认按周生成周期，普通记录类型不产生周期', () => {
    const planPolicy = resolveTemplatePeriodPolicy({ recordTypeId: 'core.plan' });
    const reviewPolicy = resolveTemplatePeriodPolicy({ recordTypeId: 'core.review' });
    const taskPolicy = resolveTemplatePeriodPolicy({ recordTypeId: 'core.task' });

    expect(planPolicy).toEqual({ enabled: true, granularity: 'week' });
    expect(reviewPolicy).toEqual({ enabled: true, granularity: 'week' });
    expect(taskPolicy).toBeNull();
    expect(isPeriodAwareRecordType('core.task')).toBe(false);

    const period = resolveDerivedPeriod('2026-12-31', planPolicy?.granularity);
    expect(period.id).toBe('2026-W53');
    expect(period.startDate).toBe('2026-12-28');
    expect(period.endDate).toBe('2027-01-03');
  });

  it('显式季度策略贯穿模板策略与派生周期，并继续拒绝非法粒度', () => {
    const policy = resolveTemplatePeriodPolicy({
      recordTypeId: 'core.plan',
      periodPolicy: { enabled: true, granularity: 'quarter' },
    });
    expect(policy).toEqual({ enabled: true, granularity: 'quarter' });
    expect(resolveDerivedPeriod('2026-08-24', policy?.granularity)).toMatchObject({
      id: '2026-Q3', startDate: '2026-07-01', endDate: '2026-09-30',
    });

    const legacyInvalid = resolveTemplatePeriodPolicy({
      recordTypeId: 'core.review',
      periodPolicy: { enabled: true, granularity: 'invalid' as any },
    });
    expect(legacyInvalid).toEqual({ enabled: true, granularity: 'week' });
  });
});
