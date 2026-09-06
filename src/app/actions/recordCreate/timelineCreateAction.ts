import { RECORD_TYPE_IDS } from '@core/recordTypes/public';
import type { QuickInputConfig } from '@core/services/public';
import type { TaskBlock } from '@core/types/public';
import {
  clampTimelineBoundaryMinute,
  clampTimelineMinute,
  minutesToTime,
  TIMELINE_DAY_START_MINUTE,
  timelineBoundaryMinuteToLocalDateTime,
  timelineMinuteFromOffset,
  timelineMinuteToLocalDateTime,
} from '@core/utils/public';

import { openCreateModal } from './openCreateModal';
import type { TimelineCreateParams } from './types';

function getEventClientY(event: MouseEvent | TouchEvent): number {
  if ('touches' in event && event.touches?.length) {
    return event.touches[0].clientY;
  }
  if ('changedTouches' in event && event.changedTouches?.length) {
    return event.changedTouches[0].clientY;
  }
  return (event as MouseEvent).clientY;
}

function blockIdentity(block: TaskBlock | null): string | null {
  if (!block) return null;
  return String(block.taskRecordId || block.id || '').trim() || null;
}

export interface TimelineCreateContextResolution {
  clickedMinute: number;
  suggestedStartMinute: number;
  suggestedEndMinute: number | null;
  previousBlock: TaskBlock | null;
  nextBlock: TaskBlock | null;
  context: Record<string, unknown>;
}

export interface TimelineSelectedRangeContextResolution {
  startMinute: number;
  endMinute: number;
  context: Record<string, unknown>;
}

/**
 * Resolve an explicit drag selection. Unlike click capture this does not infer
 * neighbouring block boundaries: the selected interval itself is the user's
 * execution fact.
 */
export function resolveTimelineSelectedRangeContext(input: {
  day: string;
  startMinute: number;
  endMinute: number;
  maxHours?: number;
}): TimelineSelectedRangeContextResolution | null {
  const maxHours = input.maxHours ?? 24;
  const startMinute = clampTimelineBoundaryMinute(Math.min(input.startMinute, input.endMinute), maxHours);
  const endMinute = clampTimelineBoundaryMinute(Math.max(input.startMinute, input.endMinute), maxHours);
  if (endMinute <= startMinute) return null;

  return {
    startMinute,
    endMinute,
    context: {
      日期: input.day,
      status: 'done',
      __timeDirection: 'backward',
      startAt: timelineBoundaryMinuteToLocalDateTime(input.day, startMinute, maxHours),
      endAt: timelineBoundaryMinuteToLocalDateTime(input.day, endMinute, maxHours),
      时间: minutesToTime(startMinute),
      结束: minutesToTime(endMinute),
      __recordUiContext: {
        kind: 'timeline_create',
        captureMode: 'completed_execution',
        timeContext: {
          date: input.day,
          clickedMinute: null,
          suggestedStartMinute: startMinute,
          suggestedEndMinute: endMinute,
          startSource: 'drag_selection',
          endSource: 'drag_selection',
          previousBlockId: null,
          nextBlockId: null,
        },
      },
    },
  };
}

/**
 * Resolve one click into the blank interval that contains it.
 *
 * Timeline is a natural-day execution log:
 * - every day starts at 00:00 (minute 0), never at the first existing Task;
 * - before the first block, the blank interval starts at 00:00;
 * - between blocks, it starts at the previous block end and ends at the next block start;
 * - after the last block (or on an empty day), the click itself becomes the provisional end;
 * - Timeline capture defaults to a completed, backward-linked Task because it represents
 *   recording something that already happened. Ordinary QuickInput keeps its normal open default.
 */
export function resolveTimelineCreateContext(input: {
  day: string;
  clickedMinute: number;
  dayBlocks: TaskBlock[];
  maxHours?: number;
}): TimelineCreateContextResolution {
  const maxHours = input.maxHours ?? 24;
  const clickedMinute = clampTimelineMinute(input.clickedMinute, maxHours);
  const blocks = [...(input.dayBlocks || [])]
    .filter((block) => Number.isFinite(block.blockStartMinute) && Number.isFinite(block.blockEndMinute))
    .sort((a, b) => a.blockStartMinute - b.blockStartMinute || a.blockEndMinute - b.blockEndMinute);

  const previousBlock = blocks
    .filter((block) => block.blockEndMinute <= clickedMinute)
    .sort((a, b) => b.blockEndMinute - a.blockEndMinute || b.blockStartMinute - a.blockStartMinute)[0] || null;
  const nextBlock = blocks
    .filter((block) => block.blockStartMinute >= clickedMinute)
    .sort((a, b) => a.blockStartMinute - b.blockStartMinute || a.blockEndMinute - b.blockEndMinute)[0] || null;

  const suggestedStartMinute = clampTimelineMinute(previousBlock?.blockEndMinute ?? TIMELINE_DAY_START_MINUTE, maxHours);
  const nextStartMinute = nextBlock ? clampTimelineMinute(nextBlock.blockStartMinute, maxHours) : null;
  const clickedEndMinute = clickedMinute > suggestedStartMinute ? clickedMinute : null;
  const suggestedEndMinute = nextStartMinute !== null && nextStartMinute > suggestedStartMinute
    ? nextStartMinute
    : clickedEndMinute;

  const startAt = timelineMinuteToLocalDateTime(input.day, suggestedStartMinute);
  const context: Record<string, unknown> = {
    日期: input.day,
    status: 'done',
    __timeDirection: 'backward',
    startAt,
    // Legacy aliases remain invocation context only. New Task UI uses startAt/endAt.
    时间: minutesToTime(suggestedStartMinute),
    __recordUiContext: {
      kind: 'timeline_create',
      captureMode: 'completed_execution',
      timeContext: {
        date: input.day,
        clickedMinute,
        suggestedStartMinute,
        suggestedEndMinute,
        startSource: previousBlock ? 'previous_block_end' : 'day_start',
        endSource: nextStartMinute !== null && nextStartMinute > suggestedStartMinute
          ? 'next_block_start'
          : (suggestedEndMinute !== null ? 'clicked_slot' : 'open_end'),
        previousBlockId: blockIdentity(previousBlock),
        nextBlockId: blockIdentity(nextBlock),
      },
    },
  };

  if (suggestedEndMinute !== null) {
    context.endAt = timelineMinuteToLocalDateTime(input.day, suggestedEndMinute);
    context['结束'] = minutesToTime(suggestedEndMinute);
  }

  return {
    clickedMinute,
    suggestedStartMinute,
    suggestedEndMinute,
    previousBlock,
    nextBlock,
    context,
  };
}

export function buildTimelineCreateConfig(params: TimelineCreateParams): QuickInputConfig | null {
  if (params.selectedRange) {
    const selected = resolveTimelineSelectedRangeContext({
      day: params.day,
      startMinute: params.selectedRange.startMinute,
      endMinute: params.selectedRange.endMinute,
      maxHours: params.maxHours,
    });
    if (selected) {
      return { blockId: RECORD_TYPE_IDS.TASK, context: selected.context };
    }
  }

  const targetEl = params.event.currentTarget as HTMLElement | null;
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const clientY = getEventClientY(params.event);
  const clickedMinute = timelineMinuteFromOffset(clientY - rect.top, params.hourHeight, params.maxHours);
  const resolved = resolveTimelineCreateContext({
    day: params.day,
    clickedMinute,
    dayBlocks: params.dayBlocks,
    maxHours: params.maxHours,
  });

  return {
    blockId: RECORD_TYPE_IDS.TASK,
    context: resolved.context,
  };
}

export function openCreateFromTimeline(params: TimelineCreateParams): boolean {
  return openCreateModal(params.app, buildTimelineCreateConfig(params), 'view_quick_create', { allowBlockSwitch: false });
}
