import { buildCancelledResult, buildConflictResult, buildErrorResult, isRecordConflictError } from '@core/recordInput/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import { toArray } from './issues';

export interface MapSubmitErrorOptions {
  refreshPaths?: Array<string | null | undefined>;
}

function applyRecoveryRefresh(
  result: RecordSubmitResult,
  options: MapSubmitErrorOptions = {},
): RecordSubmitResult {
  const scanPaths = toArray(options.refreshPaths).filter((path): path is string => Boolean(String(path || '').trim()));
  if (result.status !== 'conflict' || scanPaths.length === 0) return result;
  return {
    ...result,
    refresh: {
      scanPaths: Array.from(new Set(scanPaths)),
      notify: true,
    },
  };
}

export function mapSubmitError(
  operation: 'create' | 'update' | 'delete' | 'complete' | 'time_update',
  error: unknown,
  warnings: RecordSubmitResult['warnings'] = [],
  options: MapSubmitErrorOptions = {},
): RecordSubmitResult {
  const name = (error as any)?.name;
  const message = error instanceof Error ? error.message : String(error);

  if (name === 'AbortError' || name === 'CancelledError') {
    return buildCancelledResult(operation, toArray(warnings));
  }

  if (isRecordConflictError(error)) {
    return applyRecoveryRefresh(
      buildConflictResult(operation, error.message, toArray(warnings), error.conflictCode),
      options,
    );
  }

  const errorCode = typeof (error as any)?.conflictCode === 'string'
    ? (error as any).conflictCode
    : (typeof (error as any)?.code === 'string' ? (error as any).code : undefined);
  if (errorCode && /^record_/.test(errorCode)) {
    return applyRecoveryRefresh(
      buildConflictResult(operation, message, toArray(warnings), errorCode),
      options,
    );
  }

  if (/Unable to locate|无法定位原始记录|找不到文件|找不到条目文件|无效的条目ID格式|无效的条目行号|原始任务位置已变化|原始块位置已变化|原始块边界已损坏|条目已不存在/.test(message)) {
    return applyRecoveryRefresh(
      buildConflictResult(operation, message, toArray(warnings)),
      options,
    );
  }

  return buildErrorResult(operation, message || 'Unknown record submit error.', toArray(warnings));
}
