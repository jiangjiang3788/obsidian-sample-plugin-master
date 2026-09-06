import type { UseCases } from '@/app/usecases';
import type { UiPort } from '@core/ports/public';
import type { RecordInputSource } from '@core/recordInput/public';
import type { TimelineEditTarget, TimelineLogicalRange } from '@core/types/public';
import { runUiRecordAction } from './runUiRecordAction';

export interface CompleteFromViewParams {
  uiPort: UiPort;
  useCases: UseCases;
  itemId: string;
  source?: Extract<RecordInputSource, 'layout_renderer' | 'timer' | 'unknown'>;
  showSuccessNotice?: boolean;
}

export interface UpdateTimelineRangeFromViewParams {
  uiPort: UiPort;
  useCases: UseCases;
  target: TimelineEditTarget;
  range: TimelineLogicalRange;
  showSuccessNotice?: boolean;
  source?: Extract<RecordInputSource, 'layout_renderer' | 'timer' | 'unknown'>;
}

export async function completeFromView(params: CompleteFromViewParams): Promise<boolean> {
  const { ok } = await runUiRecordAction(
    () => params.useCases.taskRuntime.completeTask({
      taskId: params.itemId,
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

export async function updateTimelineRangeFromView(params: UpdateTimelineRangeFromViewParams): Promise<boolean> {
  const { ok } = await runUiRecordAction(
    () => params.useCases.recordInput.submitUpdateTimelineRange({
      target: params.target,
      range: params.range,
      source: params.source ?? 'layout_renderer',
    }),
    {
      uiPort: params.uiPort,
      failureMessage: '更新时间轴区间失败',
      successNotice: params.showSuccessNotice,
    },
  );
  return ok;
}
