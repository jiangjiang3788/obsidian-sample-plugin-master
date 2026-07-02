import type { QuickInputConfig } from '@core/services/public';
import { minutesToTime } from '@core/utils/public';

import { openCreateModal } from './openCreateModal';
import type { QuickInputBlockLike, TimelineCreateParams } from './types';

function findTaskBlock(inputBlocks: QuickInputBlockLike[]): QuickInputBlockLike | null {
  if (!Array.isArray(inputBlocks) || inputBlocks.length === 0) return null;
  return inputBlocks.find((block) => block.name === 'Task' || block.name === '任务') || inputBlocks[0] || null;
}

function getEventClientY(event: MouseEvent | TouchEvent): number {
  if ('touches' in event && event.touches?.length) {
    return event.touches[0].clientY;
  }
  if ('changedTouches' in event && event.changedTouches?.length) {
    return event.changedTouches[0].clientY;
  }
  return (event as MouseEvent).clientY;
}

function buildTimelineCreateConfig(params: TimelineCreateParams): QuickInputConfig | null {
  const taskBlock = findTaskBlock(params.inputBlocks);
  if (!taskBlock) {
    params.uiPort.notice('没有可用的 Block 模板，请先在设置中创建一个。');
    return null;
  }

  const targetEl = params.event.currentTarget as HTMLElement | null;
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const clientY = getEventClientY(params.event);
  const y = clientY - rect.top;
  const clickedMinute = Math.max(0, Math.floor((y / params.hourHeight) * 60));

  const prevBlock = params.dayBlocks.filter((block) => block.blockEndMinute <= clickedMinute).pop();
  const nextBlock = params.dayBlocks.find((block) => block.blockStartMinute >= clickedMinute);

  const context: Record<string, unknown> = {
    日期: params.day,
    __recordUiContext: {
      kind: 'timeline_create',
      timeContext: {
        date: params.day,
        clickedMinute,
      },
    },
  };

  context['时间'] = prevBlock
    ? minutesToTime(prevBlock.blockEndMinute)
    : minutesToTime(clickedMinute);

  if (nextBlock) {
    context['结束'] = minutesToTime(nextBlock.blockStartMinute);
  }

  return {
    blockId: taskBlock.id,
    context,
  };
}

export function openCreateFromTimeline(params: TimelineCreateParams): boolean {
  return openCreateModal(params.app, buildTimelineCreateConfig(params), 'view_quick_create');
}
