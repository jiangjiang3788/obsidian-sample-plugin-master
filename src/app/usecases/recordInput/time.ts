import { applyTaskTimePolicy } from '@core/utils/public';
import type { RecordSubmitIssue, SubmitUpdateRecordTimeParams } from '@core/recordInput/public';
import { issue } from './issues';

export interface TimeUpdatePayload {
  time?: string;
  endTime?: string;
  duration?: number;
}

export function normalizeTimeUpdates(
  updates: SubmitUpdateRecordTimeParams['updates'],
): TimeUpdatePayload | { error: RecordSubmitIssue } {
  const time = updates.time ?? updates.start ?? undefined;
  const endTime = updates.endTime ?? updates.end ?? undefined;
  const direction = updates.direction === 'backward' ? 'backward' : 'forward';

  let duration: number | undefined;
  if (updates.duration !== undefined && updates.duration !== null && updates.duration !== '') {
    const numericDuration = Number(updates.duration);
    if (Number.isNaN(numericDuration)) {
      return { error: issue('record_time_duration_invalid', '任务时长必须是数字。', 'duration') };
    }
    duration = numericDuration;
  }

  if (time === undefined && endTime === undefined && duration === undefined) {
    return { error: issue('record_time_update_empty', '至少需要提供一个时间更新字段。') };
  }

  if (duration !== undefined) {
    const normalized = applyTaskTimePolicy({
      startTime: time,
      endTime,
      duration,
      mode: 'finalize',
      direction,
    });

    return {
      time: normalized.startTime ?? time,
      endTime: normalized.endTime ?? endTime,
      duration: normalized.duration ?? duration,
    };
  }

  return {
    time,
    endTime,
    duration,
  };
}
