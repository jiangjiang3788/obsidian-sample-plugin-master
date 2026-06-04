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

function firstErrorCode(result: Pick<RecordSubmitResult, 'errors'>): string {
  return String(result.errors?.[0]?.code || '');
}

export function getRecordConflictRecoveryAdvice(code: string): string {
  switch (code) {
    case 'record_path_missing':
      return '原文件可能已被移动或删除。请先重新扫描 Vault，再从最新视图重新打开这条记录。';
    case 'record_line_stale':
      return '原记录所在行已变化。请重新扫描或打开原文确认位置，然后从最新记录重新编辑。';
    case 'record_block_boundary_invalid':
      return '块记录的 start/end 边界已损坏。请打开原文修复边界标记后再保存。';
    case 'record_item_missing':
      return '这条记录可能已被删除或内容变化过大。请重新扫描后确认是否仍然存在。';
    case 'record_locator_invalid':
      return '记录定位信息无效。请从列表、时间线或搜索结果中的最新记录重新打开编辑。';
    case 'record_conflict':
    default:
      return '请重新扫描 Vault，并从最新视图重新打开这条记录后再操作。';
  }
}

export function readRecordSubmitMessage(
  result: Pick<RecordSubmitResult, 'status' | 'errors' | 'feedback'>,
  fallback: string,
): string {
  const message = result.errors?.[0]?.message || result.feedback?.notice || fallback;
  if (result.status === 'conflict') {
    const advice = getRecordConflictRecoveryAdvice(firstErrorCode(result));
    return `记录冲突：${message}\n${advice}`;
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
