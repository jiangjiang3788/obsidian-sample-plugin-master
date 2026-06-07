import { resolveDerivedPeriod } from '@/core/goal/period';

describe('resolveDerivedPeriod', () => {
  it('derives ISO week period from date', () => {
    const period = resolveDerivedPeriod('2026-06-06', 'week');
    expect(period.id).toBe('2026-W23');
    expect(period.label).toBe('2026 第 23 周');
    expect(period.startDate).toBe('2026-06-01');
    expect(period.endDate).toBe('2026-06-07');
  });

  it('derives quarter period from date', () => {
    const period = resolveDerivedPeriod('2026-06-06', 'quarter');
    expect(period.id).toBe('2026-Q2');
    expect(period.startDate).toBe('2026-04-01');
    expect(period.endDate).toBe('2026-06-30');
  });

  it('defaults invalid granularity to week', () => {
    const period = resolveDerivedPeriod('2026-06-06', 'custom');
    expect(period.granularity).toBe('week');
  });
});
