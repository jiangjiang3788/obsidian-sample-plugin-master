import type { UseCases } from '@/app/public';
import type { UiPort } from '@core/public';
import { isRecordSubmitSuccess, readRecordSubmitMessage, type RecordInputSource } from '@core/public';

export interface CompleteFromViewParams {
  uiPort: UiPort;
  useCases: UseCases;
  itemId: string;
  source?: Extract<RecordInputSource, 'layout_renderer' | 'timer' | 'unknown'>;
  showSuccessNotice?: boolean;
  options?: {
    duration?: number;
    startTime?: string | null;
    endTime?: string | null;
  };
}

export interface UpdateTimeFromViewParams {
  uiPort: UiPort;
  useCases: UseCases;
  itemId: string;
  showSuccessNotice?: boolean;
  updates: {
    time?: string | null;
    endTime?: string | null;
    duration?: number | string | null;
  };
  source?: Extract<RecordInputSource, 'layout_renderer' | 'timer' | 'unknown'>;
}

function readResultMessage(
  result: { status?: string; errors?: Array<{ message: string }>; feedback?: { notice?: string } },
  fallback: string,
): string {
  return readRecordSubmitMessage(result as any, fallback);
}

export async function completeFromView(params: CompleteFromViewParams): Promise<boolean> {
  const result = await params.useCases.recordInput.submitCompleteRecord({
    itemId: params.itemId,
    options: params.options,
    source: params.source ?? 'layout_renderer',
  });

  if (isRecordSubmitSuccess(result, { treatCancelledAsSuccess: true })) {
    if (params.showSuccessNotice && result.feedback?.notice) params.uiPort.notice(result.feedback.notice);
    return true;
  }

  params.uiPort.notice(readResultMessage(result, '更新任务完成状态失败'));
  return false;
}

export async function updateTimeFromView(params: UpdateTimeFromViewParams): Promise<boolean> {
  const result = await params.useCases.recordInput.submitUpdateRecordTime({
    itemId: params.itemId,
    updates: params.updates,
    source: params.source ?? 'layout_renderer',
  });

  if (isRecordSubmitSuccess(result, { treatCancelledAsSuccess: true })) {
    if (params.showSuccessNotice && result.feedback?.notice) params.uiPort.notice(result.feedback.notice);
    return true;
  }

  params.uiPort.notice(readResultMessage(result, '更新任务时间失败'));
  return false;
}
