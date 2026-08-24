import { RECORD_TYPE_IDS } from '@core/recordTypes/public';
import type { QuickInputConfig } from '@core/services/public';
import type { TaskBlock } from '@core/types/public';
import { dayjs, minutesToTime } from '@core/utils/public';

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

function clampDayMinute(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1439, Math.max(0, Math.floor(value)));
}

function blockIdentity(block: TaskBlock | null): string | null {
  if (!block) return null;
  return String(block.taskRecordId || block.id || '').trim() || null;
}

function minuteToLocalDateTime(day: string, minute: number): string {
  return dayjs(day).startOf('day').add(clampDayMinute(minute), 'minute').format('YYYY-MM-DDTHH:mm');
}

export interface TimelineCreateContextResolution {
  clickedMinute: number;
  suggestedStartMinute: number;
  suggestedEndMinute: number | null;
  previousBlock: TaskBlock | null;
  nextBlock: TaskBlock | null;
  context: Record<string, unknown>;
}

/**
 * Resolve the Timeline click into an explicit QuickInput context.
 *
 * Product contract:
 * - before the first block: start at the clicked minute, end at the next block;
 * - between blocks: start at the previous block end, end at the next block start;
 * - after the last block: start at the previous block end and leave end open;
 * - canonical Task datetime fields are the source of truth; legacy clock keys are
 *   retained only so old GoalTemplate field aliases keep receiving the same context.
 */
export function resolveTimelineCreateContext(input: {
  day: string;
  clickedMinute: number;
  dayBlocks: TaskBlock[];
}): TimelineCreateContextResolution {
  const clickedMinute = clampDayMinute(input.clickedMinute);
  const blocks = [...(input.dayBlocks || [])]
    .filter((block) => Number.isFinite(block.blockStartMinute) && Number.isFinite(block.blockEndMinute))
    .sort((a, b) => a.blockStartMinute - b.blockStartMinute || a.blockEndMinute - b.blockEndMinute);

  const previousBlock = blocks
    .filter((block) => block.blockEndMinute <= clickedMinute)
    .sort((a, b) => b.blockEndMinute - a.blockEndMinute || b.blockStartMinute - a.blockStartMinute)[0] || null;
  const nextBlock = blocks
    .filter((block) => block.blockStartMinute >= clickedMinute)
    .sort((a, b) => a.blockStartMinute - b.blockStartMinute || a.blockEndMinute - b.blockEndMinute)[0] || null;

  const suggestedStartMinute = clampDayMinute(previousBlock?.blockEndMinute ?? clickedMinute);
  const nextStartMinute = nextBlock ? clampDayMinute(nextBlock.blockStartMinute) : null;
  const suggestedEndMinute = nextStartMinute !== null && nextStartMinute > suggestedStartMinute
    ? nextStartMinute
    : null;

  const startAt = minuteToLocalDateTime(input.day, suggestedStartMinute);
  const context: Record<string, unknown> = {
    日期: input.day,
    startAt,
    // Legacy aliases remain invocation context only. New Task UI uses startAt/endAt.
    时间: minutesToTime(suggestedStartMinute),
    __recordUiContext: {
      kind: 'timeline_create',
      timeContext: {
        date: input.day,
        clickedMinute,
        suggestedStartMinute,
        suggestedEndMinute,
        startSource: previousBlock ? 'previous_block_end' : 'clicked_slot',
        endSource: suggestedEndMinute !== null ? 'next_block_start' : 'open_end',
        previousBlockId: blockIdentity(previousBlock),
        nextBlockId: blockIdentity(nextBlock),
      },
    },
  };

  if (suggestedEndMinute !== null) {
    context.endAt = minuteToLocalDateTime(input.day, suggestedEndMinute);
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
  const targetEl = params.event.currentTarget as HTMLElement | null;
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const clientY = getEventClientY(params.event);
  const y = clientY - rect.top;
  const clickedMinute = Math.floor((y / params.hourHeight) * 60);
  const resolved = resolveTimelineCreateContext({
    day: params.day,
    clickedMinute,
    dayBlocks: params.dayBlocks,
  });

  return {
    blockId: RECORD_TYPE_IDS.TASK,
    context: resolved.context,
  };
}

export function openCreateFromTimeline(params: TimelineCreateParams): boolean {
  return openCreateModal(params.app, buildTimelineCreateConfig(params), 'view_quick_create', { allowBlockSwitch: false });
}
