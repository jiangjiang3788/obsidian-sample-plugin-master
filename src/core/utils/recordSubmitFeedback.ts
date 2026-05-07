import type { RecordSubmitResult } from '@/core/types/recordInput';

export function isRecordSubmitCancelled(result: Pick<RecordSubmitResult, 'status'>): boolean {
  return result.status === 'cancelled';
}

export function isRecordSubmitConflict(result: Pick<RecordSubmitResult, 'status'>): boolean {
  return result.status === 'conflict';
}

export function isRecordSubmitSuccess(
  result: Pick<RecordSubmitResult, 'status'>,
  options: { treatCancelledAsSuccess?: boolean; treatPartialSuccessAsSuccess?: boolean } = {},
): boolean {
  if (result.status === 'success') return true;
  if (options.treatPartialSuccessAsSuccess && result.status === 'partial_success') return true;
  if (options.treatCancelledAsSuccess && result.status === 'cancelled') return true;
  return false;
}

export function isRecordSubmitPartialSuccess(result: Pick<RecordSubmitResult, 'status'>): boolean {
  return result.status === 'partial_success';
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


export type RecordSubmitFeedbackTone = 'success' | 'warning' | 'error';

export interface RecordSubmitFeedbackPresentation {
  tone: RecordSubmitFeedbackTone;
  message: string;
  shouldCloseModal: boolean;
}

/**
 * 统一把记录提交结果转换成 UI 提示。
 * partial_success 表示“新记录已写入，但旧记录删除失败”等带警告成功，
 * 因此应关闭面板，避免用户重复点击保存造成重复记录。
 */
export function buildRecordSubmitFeedbackPresentation(
  result: RecordSubmitResult,
  fallbackErrorMessage: string = '操作失败',
): RecordSubmitFeedbackPresentation {
  if (result.status === 'success') {
    return {
      tone: 'success',
      message: result.feedback?.notice || '已保存',
      shouldCloseModal: true,
    };
  }

  if (result.status === 'partial_success') {
    return {
      tone: 'warning',
      message: result.feedback?.notice || result.errors?.[0]?.message || '已写入新位置，但旧记录可能需要手动清理',
      shouldCloseModal: true,
    };
  }

  if (result.status === 'cancelled') {
    return {
      tone: 'error',
      message: '',
      shouldCloseModal: false,
    };
  }

  return {
    tone: 'error',
    message: readRecordSubmitMessage(result, fallbackErrorMessage),
    shouldCloseModal: false,
  };
}
