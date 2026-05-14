import {
  buildCancelledResult,
  buildConflictResult,
  buildErrorResult,
  isRecordConflictError,
} from '@core/public';
import type { RecordSubmitResult } from '@core/public';
import { toArray } from './issues';

export function mapSubmitError(
  operation: 'create' | 'update' | 'delete' | 'complete' | 'time_update',
  error: unknown,
  warnings: RecordSubmitResult['warnings'] = [],
): RecordSubmitResult {
  const name = (error as any)?.name;
  const message = error instanceof Error ? error.message : String(error);

  if (name === 'AbortError' || name === 'CancelledError') {
    return buildCancelledResult(operation, toArray(warnings));
  }

  if (isRecordConflictError(error)) {
    return buildConflictResult(operation, error.message, toArray(warnings), error.conflictCode);
  }

  const errorCode = typeof (error as any)?.conflictCode === 'string'
    ? (error as any).conflictCode
    : (typeof (error as any)?.code === 'string' ? (error as any).code : undefined);
  if (errorCode && /^record_/.test(errorCode)) {
    return buildConflictResult(operation, message, toArray(warnings), errorCode);
  }

  if (/Unable to locate|无法定位原始记录|找不到文件|找不到条目文件|无效的条目ID格式|无效的条目行号|原始任务位置已变化|原始块位置已变化|原始块边界已损坏|条目已不存在/.test(message)) {
    return buildConflictResult(operation, message, toArray(warnings));
  }

  return buildErrorResult(operation, message || 'Unknown record submit error.', toArray(warnings));
}
