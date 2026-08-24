import { Notice } from 'obsidian';
import type { RecordSubmitResult } from '@core/recordInput/public';
import { buildRecordSubmitFeedbackPresentation, devError, devLog } from '@core/utils/public';

function traceLabel(traceId?: string): string {
  return traceId || 'no-trace';
}

export function logAiBatchSubmit(
  traceId: string | undefined,
  step: string,
  details: Record<string, unknown>,
): void {
  devLog(`[AiInput][${traceLabel(traceId)}] ${step}`, details);
}

export function showAiBatchSaveFailure(result: RecordSubmitResult, index: number): void {
  const presentation = buildRecordSubmitFeedbackPresentation(result, '保存失败');
  if (result.status === 'cancelled') {
    new Notice(`第 ${index + 1} 条保存已取消`, 4000);
    return;
  }
  new Notice(`❌ 第 ${index + 1} 条保存失败: ${presentation.message || '保存失败'}`, 10000);
}

export function showAiBatchUnexpectedSaveError(
  traceId: string | undefined,
  scope: 'single' | 'batch',
  error: unknown,
): void {
  const label = scope === 'single' ? '保存当前记录失败' : '批量保存失败';
  const noticePrefix = scope === 'single' ? '❌ 保存失败' : '❌ 批量保存中断';
  devError(`[AiInput][${traceLabel(traceId)}] ${label}`, error);
  new Notice(`${noticePrefix}: ${error instanceof Error ? error.message : String(error)}`, 10000);
}
