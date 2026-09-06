import { dayjs } from './date';

/**
 * Timeline natural-day clock.
 *
 * All geometry and day-boundary calculations use this module so the renderer,
 * click-to-create flow and tests share one coordinate system:
 *   00:00 => minute 0
 *   24:00 => minute 1440 (exclusive day end)
 */
export const TIMELINE_DAY_START_MINUTE = 0;
export const TIMELINE_MINUTES_PER_DAY = 24 * 60;

export function timelineVisibleEndMinute(maxHours = 24): number {
  const normalizedHours = Number.isFinite(maxHours) ? Math.max(0, Math.min(24, maxHours)) : 24;
  return Math.round(normalizedHours * 60);
}

export function clampTimelineMinute(value: number, maxHours = 24): number {
  const visibleEnd = timelineVisibleEndMinute(maxHours);
  if (visibleEnd <= 0) return TIMELINE_DAY_START_MINUTE;
  if (!Number.isFinite(value)) return TIMELINE_DAY_START_MINUTE;
  return Math.min(visibleEnd - 1, Math.max(TIMELINE_DAY_START_MINUTE, Math.floor(value)));
}

/** Range boundaries are allowed to land on the exclusive visible end (for example 24:00). */
export function clampTimelineBoundaryMinute(value: number, maxHours = 24): number {
  const visibleEnd = timelineVisibleEndMinute(maxHours);
  if (visibleEnd <= 0) return TIMELINE_DAY_START_MINUTE;
  if (!Number.isFinite(value)) return TIMELINE_DAY_START_MINUTE;
  return Math.min(visibleEnd, Math.max(TIMELINE_DAY_START_MINUTE, Math.floor(value)));
}

export function timelineMinuteFromOffset(offsetPx: number, hourHeight: number, maxHours = 24): number {
  if (!Number.isFinite(offsetPx) || !Number.isFinite(hourHeight) || hourHeight <= 0) {
    return TIMELINE_DAY_START_MINUTE;
  }
  return clampTimelineMinute((Math.max(0, offsetPx) / hourHeight) * 60, maxHours);
}

export function timelineOffsetFromMinute(minute: number, hourHeight: number): number {
  if (!Number.isFinite(hourHeight) || hourHeight <= 0) return 0;
  const normalizedMinute = Number.isFinite(minute) ? Math.max(TIMELINE_DAY_START_MINUTE, minute) : TIMELINE_DAY_START_MINUTE;
  return (normalizedMinute / 60) * hourHeight;
}

export function timelineMinuteToLocalDateTime(day: string, minute: number): string {
  const normalizedDay = dayjs(day).startOf('day').format('YYYY-MM-DD');
  const normalizedMinute = clampTimelineMinute(minute);
  const hour = Math.floor(normalizedMinute / 60);
  const minuteOfHour = normalizedMinute % 60;
  // This is a wall-clock coordinate, not elapsed-time arithmetic. Building the local
  // datetime text directly keeps 00:00..23:59 stable even on DST transition days.
  return `${normalizedDay}T${String(hour).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}`;
}

/** Convert a range boundary, preserving the exclusive 24:00 endpoint as next-day 00:00. */
export function timelineBoundaryMinuteToLocalDateTime(day: string, minute: number, maxHours = 24): string {
  const normalizedMinute = clampTimelineBoundaryMinute(minute, maxHours);
  const dayOffset = Math.floor(normalizedMinute / TIMELINE_MINUTES_PER_DAY);
  const minuteOfDay = normalizedMinute % TIMELINE_MINUTES_PER_DAY;
  const targetDay = dayjs(day).startOf('day').add(dayOffset, 'day').format('YYYY-MM-DD');
  const hour = Math.floor(minuteOfDay / 60);
  const minuteOfHour = minuteOfDay % 60;
  return `${targetDay}T${String(hour).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}`;
}
