import { assertFieldSystemHealthy, runFieldSystemHealthChecks } from '@/core/fields';

describe('field system health checks', () => {
  it('passes all field-system invariants', () => {
    const report = runFieldSystemHealthChecks();
    expect(report.version).toBe('v2.3');
    expect(report.ok).toBe(true);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.checks.length);
  });

  it('throws a useful error if any invariant fails', () => {
    expect(() => assertFieldSystemHealthy()).not.toThrow();
  });
});
