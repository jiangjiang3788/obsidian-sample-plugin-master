// src/types/timeline/TimelineRange.ts
// Timeline range model: single source of truth for start/end calculation.
// NOTE: use ISO week for all "周" semantics to avoid cross-year edge cases.

import type { Dayjs } from 'dayjs';

export type TimelineView = '年' | '季' | '月' | '周' | '天';

export interface TimelineRange {
    view: TimelineView;

    /** The anchor date that the user is currently looking at (dayjs instance). */
    anchor: Dayjs;

    /** Inclusive start of the range. */
    start: Dayjs;
    /** Inclusive end of the range. */
    end: Dayjs;

    /** Stable cache key for this range (e.g. 2026-W03). */
    key: string;
}

export interface CalculateTimelineRangeArgs {
    anchor: Dayjs;
    view: TimelineView;
    /** Optional override for key generation. */
    key?: string;
}
