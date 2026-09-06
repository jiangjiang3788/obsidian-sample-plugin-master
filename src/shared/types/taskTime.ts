// src/shared/types/taskTime.ts

import type { TimelineEditTarget, TimelineLogicalRange } from '@core/types/public';

/**
 * UI-safe Timeline direct-manipulation intent.
 *
 * The request contains an explicit persistence target plus the final logical range. UI code never
 * sends projection IDs or partially-related time/duration fields and never decides storage fields.
 */
export interface TimelineRangeChange {
  target: TimelineEditTarget;
  range: TimelineLogicalRange;
}

/** Single write boundary for move / resize / align interactions on Timeline blocks. */
export type UpdateTimelineRangeHandler = (change: TimelineRangeChange) => Promise<void> | void;
