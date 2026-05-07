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

export interface RecordSubmitFeedbackPresentation {
  message: string;
  tone: 'success' | 'warning' | 'error';
  shouldCloseModal: boolean;
}

/**
 * 将 RecordSubmitResult 收敛成 UI 层可直接使用的展示决策。
 *
 * 设计原因：QuickInputModal 只关心三件事：
 * 1. 显示什么提示；
 * 2. 用成功 / 警告 / 错误哪种语气；
 * 3. 提交后是否关闭面板。
 *
 * partial_success 表示“核心写入已经完成，但后续清理/删除旧记录失败”。
 * 对 QuickInput 来说它应该按“带警告的成功”处理，并关闭面板，避免用户重复点击保存造成重复记录。
 */
export function buildRecordSubmitFeedbackPresentation(
  result: Pick<RecordSubmitResult, 'status' | 'operation' | 'affectedPath' | 'errors' | 'warnings' | 'feedback'>,
  fallbackErrorMessage = '操作失败',
): RecordSubmitFeedbackPresentation {
  if (result.status === 'cancelled') {
    return {
      message: '',
      tone: 'error',
      shouldCloseModal: false,
    };
  }

  if (result.status === 'success') {
    return {
      message: result.feedback?.notice || (result.operation === 'update' ? '修改已保存' : '记录已创建'),
      tone: 'success',
      shouldCloseModal: true,
    };
  }

  if (result.status === 'partial_success') {
    const warning = result.warnings?.[0]?.message || result.feedback?.notice || '记录已写入新位置，但旧记录清理可能未完成，请手动检查。';
    return {
      message: warning,
      tone: 'warning',
      shouldCloseModal: true,
    };
  }

  if (result.status === 'conflict') {
    return {
      message: readRecordSubmitMessage(result, fallbackErrorMessage),
      tone: 'warning',
      shouldCloseModal: false,
    };
  }

  return {
    message: readRecordSubmitMessage(result, fallbackErrorMessage),
    tone: 'error',
    shouldCloseModal: false,
  };
}
