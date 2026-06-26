import { applyTaskTimePolicy } from '@core/public';
import type {
  RecordSubmitIssue,
  SubmitCompleteRecordParams,
  SubmitUpdateRecordTimeParams,
} from '@core/public';
import { issue } from './issues';

export interface TimeUpdatePayload {
  time?: string;
  endTime?: string;
  duration?: number;
}

export type CompletionOptionsForItemService = { duration?: number; startTime?: string; endTime?: string };

export function normalizeCompletionOptions(options?: SubmitCompleteRecordParams['options']): CompletionOptionsForItemService | undefined {
  if (!options) return undefined;

  const normalized = {
    duration: typeof options.duration === 'number' ? options.duration : undefined,
    startTime: options.startTime ?? undefined,
    endTime: options.endTime ?? undefined,
  };

  if (normalized.duration == null && !normalized.startTime && !normalized.endTime) {
    return undefined;
  }

  if (normalized.duration != null) {
    const normalizedTriple = applyTaskTimePolicy({
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      duration: normalized.duration,
      mode: 'finalize',
      direction: 'forward',
    });

    return {
      duration: normalizedTriple.duration ?? normalized.duration,
      startTime: normalizedTriple.startTime,
      endTime: normalizedTriple.endTime ?? normalized.endTime,
    };
  }

  return normalized;
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
