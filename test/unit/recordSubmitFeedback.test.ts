import {
  buildRecordSubmitFeedbackPresentation,
  getRecordConflictRecoveryAdvice,
  readRecordSubmitMessage,
} from '@/core/utils/recordSubmitFeedback';
import type { RecordSubmitResult } from '@core/public';

function conflictResult(code: string, message: string): RecordSubmitResult {
  return {
    status: 'conflict',
    operation: 'update',
    refresh: { scanPaths: [], notify: false },
    errors: [{ code, message }],
  };
}

describe('recordSubmitFeedback', () => {
  it('adds actionable recovery advice for stale line conflicts', () => {
    const message = readRecordSubmitMessage(
      conflictResult('record_line_stale', '原始任务位置已变化或记录已不存在。'),
      '保存失败',
    );

    expect(message).toContain('记录冲突');
    expect(message).toContain('重新扫描');
    expect(message).toContain('重新编辑');
  });

  it('keeps conflict modals open so users can recover manually', () => {
    const presentation = buildRecordSubmitFeedbackPresentation(
      conflictResult('record_path_missing', '找不到文件: Daily.md'),
      '保存失败',
    );

    expect(presentation.tone).toBe('error');
    expect(presentation.shouldCloseModal).toBe(false);
    expect(presentation.message).toContain('原文件可能已被移动或删除');
  });

  it('has a fallback recovery message for unknown conflict codes', () => {
    expect(getRecordConflictRecoveryAdvice('unknown_record_conflict')).toContain('重新扫描 Vault');
  });
});
