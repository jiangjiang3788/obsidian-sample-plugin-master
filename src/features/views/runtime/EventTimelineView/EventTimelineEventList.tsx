/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import { readField } from '@core/types/public';
import type { MarkDoneHandler, OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';

import { TaskRow } from '../components/items/TaskRow';
import { BlockItem } from '../components/items/BlockItem';
import { getEventTimelineTaskDisplayTitle } from './EventTimelineViewModel';

interface EventTimelineEventListProps {
  items: RecordViewItem[];
  displayFields: string[];
  getItemTime: (item: RecordViewItem) => any | null;
  titleField: string;
  contentField: string;
  maxContentLength: number;
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  messageRenderPort?: MessageRenderPort;
  onMarkDone?: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  onOpenRecord?: OpenRecordHandler;
}

export function EventTimelineEventList(props: EventTimelineEventListProps) {
  const {
    items,
    displayFields,
    getItemTime,
    titleField,
    contentField,
    maxContentLength,
    resolveResourcePath,
    onOpenRecordOrigin,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    onOpenRecord,
  } = props;

  let lastDate = '';

  return (
    <>
      {items.map((item, index) => {
        const t = getItemTime(item);
        const dateLabel = t ? t.format('YYYY-MM-DD') : '';
        const timeLabel = t ? t.format('HH:mm') : '';
        const showDate = dateLabel !== lastDate;
        if (showDate) lastDate = dateLabel;

        const titleForKey = (readField(item, titleField) as string) || (readField(item, 'title') as string) || '';
        const taskDisplayTitle = item.coreBlock === 'task'
          ? getEventTimelineTaskDisplayTitle({ item, titleField, contentField, maxContentLength })
          : '';

        return (
          <div class={`et-event ${index === 0 ? 'et-event--first' : ''} ${index === items.length - 1 ? 'et-event--last' : ''}`} key={`${dateLabel}-${timeLabel}-${titleForKey}-${index}`}>
            <div class="et-event-date">
              {showDate && t && <div class="et-date-label">{dateLabel}</div>}
              {item.coreBlock === 'task' && <div class="et-time-label">{timeLabel}</div>}
            </div>

            <div class="et-line">
              <div class="et-dot" />
            </div>

            <div class="et-event-card">
              {item.coreBlock === 'task' ? (
                <TaskRow
                  item={item}
                  onMarkDone={(id: string) => onMarkDone?.(id)}
                  resolveResourcePath={resolveResourcePath}
                  onOpenRecordOrigin={onOpenRecordOrigin}
                  timerService={timerService}
                  timer={timers.find((timer) => timer.taskId === item.id)}
                  allThemes={allThemes}
                  displayTitle={taskDisplayTitle}
                  showFields={[]}
                  onOpenRecord={onOpenRecord}
                />
              ) : (
                <BlockItem
                  item={item}
                  fields={displayFields}
                  isNarrow={false}
                  resolveResourcePath={resolveResourcePath}
                  onOpenRecordOrigin={onOpenRecordOrigin}
                  messageRenderPort={messageRenderPort}
                  allThemes={allThemes}
                  onOpenRecord={onOpenRecord}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
