// src/core/utils/timelineInteraction.ts
//
// Timeline pure interaction/model logic. UI components provide pointer coordinates and render
// previews; this module owns the natural-day coordinate system, snapping and logical-range math.

import type { TimelineLogicalRange, TimelineTask, TaskBlock } from '@core/types/timeline';
import { dayjs } from '@core/utils/date';
import { splitTaskIntoDayBlocks } from '@core/utils/timelineBlocks';
import {
  clampTimelineBoundaryMinute,
  clampTimelineMinute,
  timelineBoundaryMinuteToLocalDateTime,
  timelineVisibleEndMinute,
} from '@core/utils/timelineClock';

export const TIMELINE_SNAP_MINUTES = 5;
export const TIMELINE_MIN_RANGE_MINUTES = 5;

export interface TimelineDragSelectionModel {
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
}

export type TimelineBlockGestureMode = 'move' | 'resize-start' | 'resize-end';

export interface TimelineBlockGesturePreview {
  range: TimelineLogicalRange;
  blockStartMinute: number;
  blockEndMinute: number;
  durationMinutes: number;
}

function normalizedStep(snapMinutes = TIMELINE_SNAP_MINUTES): number {
  return Math.max(1, Math.round(snapMinutes));
}

function normalizeDateTime(value: string): string {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
}

function dateTimeMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(normalizeDateTime(value));
  return Number.isFinite(ms) ? ms : null;
}

function formatLocalDateTime(value: dayjs.Dayjs): string {
  return value.format('YYYY-MM-DDTHH:mm');
}

function shiftDateTime(value: string, minutes: number): string | null {
  const parsed = dayjs(normalizeDateTime(value));
  if (!parsed.isValid()) return null;
  return formatLocalDateTime(parsed.add(minutes, 'minute'));
}

function roundedDurationMinutes(range: TimelineLogicalRange): number {
  const startMs = dateTimeMs(range.start);
  const endMs = dateTimeMs(range.end);
  if (startMs == null || endMs == null || endMs < startMs) return 0;
  return Math.round(((endMs - startMs) / 60_000) * 100) / 100;
}

export function snapTimelineBoundaryMinute(
  minute: number,
  maxHours = 24,
  snapMinutes = TIMELINE_SNAP_MINUTES,
): number {
  const step = normalizedStep(snapMinutes);
  const snapped = Math.round(minute / step) * step;
  return clampTimelineBoundaryMinute(snapped, maxHours);
}

/** Snap a desktop drag-created range to the same five-minute grid used by direct editing. */
export function buildTimelineDragSelection(
  anchorMinute: number,
  currentMinute: number,
  maxHours: number,
  snapMinutes = TIMELINE_SNAP_MINUTES,
): TimelineDragSelectionModel | null {
  const step = normalizedStep(snapMinutes);
  const lower = clampTimelineMinute(Math.min(anchorMinute, currentMinute), maxHours);
  const upper = clampTimelineMinute(Math.max(anchorMinute, currentMinute), maxHours);
  let startMinute = clampTimelineBoundaryMinute(Math.floor(lower / step) * step, maxHours);
  let endMinute = clampTimelineBoundaryMinute(Math.ceil(upper / step) * step, maxHours);

  if (endMinute <= startMinute) endMinute = clampTimelineBoundaryMinute(startMinute + step, maxHours);
  if (endMinute <= startMinute) startMinute = clampTimelineBoundaryMinute(endMinute - step, maxHours);
  if (endMinute <= startMinute) return null;

  return { startMinute, endMinute, durationMinutes: endMinute - startMinute };
}

/** Shift a full logical Timeline fact. Moving never changes duration. */
export function shiftTimelineLogicalRange(range: TimelineLogicalRange, minutes: number): TimelineLogicalRange | null {
  const start = shiftDateTime(range.start, minutes);
  if (!start) return null;
  if (!range.end) return { start };
  const end = shiftDateTime(range.end, minutes);
  if (!end) return null;
  return { start, end };
}

/**
 * Resize one logical boundary from a natural-day minute coordinate.
 * The opposite boundary is held fixed and the minimum range duration is enforced centrally.
 */
export function resizeTimelineLogicalRange(
  range: TimelineLogicalRange,
  boundary: 'start' | 'end',
  day: string,
  minute: number,
  maxHours = 24,
  minDurationMinutes = TIMELINE_MIN_RANGE_MINUTES,
): TimelineLogicalRange | null {
  if (!range.end) return null;
  const startMs = dateTimeMs(range.start);
  const endMs = dateTimeMs(range.end);
  if (startMs == null || endMs == null || endMs <= startMs) return null;

  const boundaryDateTime = timelineBoundaryMinuteToLocalDateTime(day, minute, maxHours);
  const boundaryMs = dateTimeMs(boundaryDateTime);
  if (boundaryMs == null) return null;
  const minDurationMs = Math.max(1, minDurationMinutes) * 60_000;

  if (boundary === 'start') {
    if (boundaryMs > endMs - minDurationMs) return null;
    return { start: boundaryDateTime, end: range.end };
  }

  if (boundaryMs < startMs + minDurationMs) return null;
  return { start: range.start, end: boundaryDateTime };
}

/** Project a full logical range back onto one day for direct-manipulation preview geometry. */
export function projectTimelineLogicalRangeToDay(
  range: TimelineLogicalRange,
  day: string,
): { blockStartMinute: number; blockEndMinute: number; durationMinutes: number } | null {
  const dayStart = dayjs(day).startOf('day');
  const dayEnd = dayStart.add(1, 'day');
  const start = dayjs(normalizeDateTime(range.start));
  if (!start.isValid()) return null;

  if (!range.end) {
    if (!start.isSame(dayStart, 'day')) return null;
    const minute = start.diff(dayStart, 'minute', true);
    return { blockStartMinute: minute, blockEndMinute: minute, durationMinutes: 0 };
  }

  const end = dayjs(normalizeDateTime(range.end));
  if (!end.isValid() || !end.isAfter(start)) return null;
  if (!end.isAfter(dayStart) || !start.isBefore(dayEnd)) return null;

  const visibleStart = start.isAfter(dayStart) ? start : dayStart;
  const visibleEnd = end.isBefore(dayEnd) ? end : dayEnd;
  const blockStartMinute = Math.max(0, visibleStart.diff(dayStart, 'minute', true));
  const blockEndMinute = Math.min(24 * 60, visibleEnd.diff(dayStart, 'minute', true));
  if (blockEndMinute <= blockStartMinute) return null;

  return {
    blockStartMinute,
    blockEndMinute,
    durationMinutes: roundedDurationMinutes(range),
  };
}

/**
 * Build the preview for a task-block gesture. The visible slice is only a projection; the returned
 * `range` always represents the whole plan/session/legacy fact, including cross-midnight ranges.
 */
export function buildTimelineBlockGesturePreview(args: {
  block: TaskBlock;
  mode: TimelineBlockGestureMode;
  anchorMinute: number;
  currentMinute: number;
  maxHours: number;
  snapMinutes?: number;
  minDurationMinutes?: number;
}): TimelineBlockGesturePreview | null {
  const {
    block,
    mode,
    anchorMinute,
    currentMinute,
    maxHours,
    snapMinutes = TIMELINE_SNAP_MINUTES,
    minDurationMinutes = TIMELINE_MIN_RANGE_MINUTES,
  } = args;
  const visibleEnd = timelineVisibleEndMinute(maxHours);
  if (visibleEnd <= 0) return null;

  let range: TimelineLogicalRange | null = null;
  if (mode === 'move') {
    const rawDelta = currentMinute - anchorMinute;
    const snappedSliceStart = snapTimelineBoundaryMinute(block.blockStartMinute + rawDelta, maxHours, snapMinutes);
    const deltaMinutes = snappedSliceStart - block.blockStartMinute;
    range = shiftTimelineLogicalRange(block.timelineRange, deltaMinutes);
  } else {
    if (!block.timelineRange.end) return null;
    const boundaryMinute = snapTimelineBoundaryMinute(currentMinute, maxHours, snapMinutes);
    range = resizeTimelineLogicalRange(
      block.timelineRange,
      mode === 'resize-start' ? 'start' : 'end',
      block.day,
      boundaryMinute,
      maxHours,
      minDurationMinutes,
    );
  }
  if (!range) return null;

  const projected = projectTimelineLogicalRangeToDay(range, block.day);
  if (!projected) return null;
  return { range, ...projected };
}

/**
 * 构建每日视图数据。
 * 输入 TimelineTask 的完整逻辑范围；输出按自然日切片并排序的 TaskBlock。
 */
export function buildDailyViewData(timelineTasks: TimelineTask[], dateRange: [Date, Date]) {
  const start = dayjs(dateRange[0]).startOf('day');
  const end = dayjs(dateRange[1]).startOf('day');
  const diff = Math.max(0, end.diff(start, 'day'));
  const dateRangeDays = Array.from({ length: diff + 1 }, (_, i) => start.add(i, 'day'));
  const map: Record<string, TaskBlock[]> = {};
  const range: [dayjs.Dayjs, dayjs.Dayjs] = [start, end];

  dateRangeDays.forEach((d) => {
    map[d.format('YYYY-MM-DD')] = [];
  });

  for (const task of timelineTasks) {
    const blocks = splitTaskIntoDayBlocks(task, range);
    for (const block of blocks) {
      if (map[block.day]) map[block.day].push(block);
    }
  }

  Object.values(map).forEach((dayBlocks) => {
    dayBlocks.sort((a, b) => a.blockStartMinute - b.blockStartMinute);
  });

  return { dateRangeDays, blocksByDay: map };
}
