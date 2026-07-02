import {
  buildRecordSubmitRecoveryPresentation,
  getRecordRecoveryPaths,
} from '@/core/recordInput/recovery';
import type { RecordSubmitResult } from '@core/public';

function conflictResult(overrides: Partial<RecordSubmitResult> = {}): RecordSubmitResult {
  return {
    status: 'conflict',
    operation: 'update',
    affectedPath: 'Daily.md',
    refresh: { scanPaths: ['Daily.md', 'Archive.md'], notify: true },
    errors: [{ code: 'record_line_stale', message: '原始任务位置已变化或记录已不存在。' }],
    ...overrides,
  };
}

describe('recordSubmitRecovery', () => {
  it('builds an actionable recovery presentation for conflicts', () => {
    const presentation = buildRecordSubmitRecoveryPresentation(conflictResult(), {
      fallbackPath: 'Fallback.md',
      canOpenOriginal: true,
    });

    expect(presentation.shouldShow).toBe(true);
    expect(presentation.title).toContain('保存遇到记录冲突');
    expect(presentation.message).toContain('原始任务位置已变化');
    expect(presentation.advice).toContain('重新扫描');
    expect(presentation.paths).toEqual(['Daily.md', 'Archive.md', 'Fallback.md']);
    expect(presentation.canOpenOriginal).toBe(true);
    expect(presentation.canRescan).toBe(true);
    expect(presentation.canRetry).toBe(true);
  });

  it('deduplicates refresh and fallback paths', () => {
    expect(getRecordRecoveryPaths(conflictResult({ refresh: { scanPaths: ['Daily.md', 'Daily.md'], notify: true } }), 'Daily.md')).toEqual(['Daily.md']);
  });

  it('does not show the panel for non-conflict results', () => {
    const presentation = buildRecordSubmitRecoveryPresentation({
      status: 'success',
      operation: 'update',
      refresh: { scanPaths: [], notify: false },
    });

    expect(presentation.shouldShow).toBe(false);
    expect(presentation.canRetry).toBe(false);
  });
});
