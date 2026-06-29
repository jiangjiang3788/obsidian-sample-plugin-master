import type { RecordSubmitResult, UiPort } from '@core/public';
import { isRecordSubmitSuccess, readRecordSubmitMessage } from '@core/public';

export interface RunUiRecordActionOptions {
  uiPort: UiPort;
  failureMessage: string;
  successNotice?: boolean;
  successFallback?: string;
}

export interface RunUiRecordActionResult {
  ok: boolean;
  message: string;
  result: RecordSubmitResult;
}

export async function runUiRecordAction(
  action: () => Promise<RecordSubmitResult>,
  options: RunUiRecordActionOptions,
): Promise<RunUiRecordActionResult> {
  const result = await action();
  const message = readRecordSubmitMessage(result, options.failureMessage);

  if (isRecordSubmitSuccess(result, { treatCancelledAsSuccess: true })) {
    const successFallback = result.status === 'success' ? options.successFallback : undefined;
    const notice = result.feedback?.notice || successFallback;
    if (options.successNotice && notice) {
      options.uiPort.notice(notice);
    }
    return { ok: true, message, result };
  }

  options.uiPort.notice(message);
  return { ok: false, message, result };
}
