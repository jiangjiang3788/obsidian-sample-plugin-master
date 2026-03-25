import type { RecordSubmitResult } from '@/core/types/recordInput';

export function isRecordSubmitCancelled(result: Pick<RecordSubmitResult, 'status'>): boolean {
  return result.status === 'cancelled';
}

export function isRecordSubmitConflict(result: Pick<RecordSubmitResult, 'status'>): boolean {
  return result.status === 'conflict';
}

export function isRecordSubmitSuccess(
  result: Pick<RecordSubmitResult, 'status'>,
  options: { treatCancelledAsSuccess?: boolean } = {},
): boolean {
  if (result.status === 'success') return true;
  if (options.treatCancelledAsSuccess && result.status === 'cancelled') return true;
  return false;
}

export function readRecordSubmitMessage(
  result: Pick<RecordSubmitResult, 'status' | 'errors' | 'feedback'>,
  fallback: string,
): string {
  const message = result.errors?.[0]?.message || result.feedback?.notice || fallback;
  if (result.status === 'conflict') {
    return `记录冲突：${message}`;
  }
  return message;
}
