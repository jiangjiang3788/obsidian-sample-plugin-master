import type { UseCases } from '@/app/public';
import type { UiPort } from '@core/public';
import type { RecordInputSource } from '@core/public';
import { runUiRecordAction } from './runUiRecordAction';

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

export async function completeFromView(params: CompleteFromViewParams): Promise<boolean> {
  const { ok } = await runUiRecordAction(
    () => params.useCases.recordInput.submitCompleteRecord({
      itemId: params.itemId,
      options: params.options,
      source: params.source ?? 'layout_renderer',
    }),
    {
      uiPort: params.uiPort,
      failureMessage: '更新任务完成状态失败',
      successNotice: params.showSuccessNotice,
    },
  );
  return ok;
}

export async function updateTimeFromView(params: UpdateTimeFromViewParams): Promise<boolean> {
  const { ok } = await runUiRecordAction(
    () => params.useCases.recordInput.submitUpdateRecordTime({
      itemId: params.itemId,
      updates: params.updates,
      source: params.source ?? 'layout_renderer',
    }),
    {
      uiPort: params.uiPort,
      failureMessage: '更新任务时间失败',
      successNotice: params.showSuccessNotice,
    },
  );
  return ok;
}
