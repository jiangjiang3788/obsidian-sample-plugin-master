import type { RecordSubmitIssue, SubmitUpdateTimelineRangeParams } from '@core/recordInput/public';
import type { TimelineLogicalRange } from '@core/types/public';
import { issue } from './issues';

function normalizeDateTime(value: string): string {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
}

const COMPLETE_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function validDateTime(value: string): boolean {
  return COMPLETE_DATE_TIME.test(value) && Number.isFinite(Date.parse(value));
}

export function normalizeTimelineRangeUpdate(
  params: Pick<SubmitUpdateTimelineRangeParams, 'target' | 'range'>,
): TimelineLogicalRange | { error: RecordSubmitIssue } {
  const start = normalizeDateTime(params.range.start);
  const end = params.range.end ? normalizeDateTime(params.range.end) : undefined;
  if (!start || !validDateTime(start)) {
    return { error: issue('timeline_range_start_invalid', '时间轴开始时间无效。', 'start') };
  }
  if (end && !validDateTime(end)) {
    return { error: issue('timeline_range_end_invalid', '时间轴结束时间无效。', 'end') };
  }

  const requiresEnd = params.target.kind === 'task-session' || params.target.kind === 'task-range';
  if (requiresEnd && !end) {
    return { error: issue('timeline_range_end_required', '这个时间段必须包含结束时间。', 'end') };
  }
  if (params.target.kind === 'task-point' && end) {
    return { error: issue('timeline_point_end_forbidden', '时间点不能包含结束时间。', 'end') };
  }
  if (end && Date.parse(end) <= Date.parse(start)) {
    return { error: issue('timeline_range_order_invalid', '结束时间必须晚于开始时间。', 'end') };
  }

  return end ? { start, end } : { start };
}
