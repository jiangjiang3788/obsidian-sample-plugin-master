/** @jsxImportSource preact */
// src/shared/ui/views/timeline/EventTimelineViewView.tsx
import { h } from 'preact';
import type { Item, MessageRenderPort } from '@core/public';
import type { GroupNode } from '@core/public';
import type { MarkDoneHandler, OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '../../../types/actions';

import { GroupedContainer } from '../../GroupedContainer';
import { EventTimelineEventList } from './EventTimelineEventList';

interface EventTimelineViewViewProps {
  filteredItems: Item[];
  groupedTree: GroupNode[] | null;
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  displayFields: string[];
  getItemTime: (item: Item) => any | null;
  titleField: string;
  contentField: string;
  maxContentLength: number;
  messageRenderPort?: MessageRenderPort;
  onMarkDone?: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  onOpenRecord?: OpenRecordHandler;
}

export function EventTimelineViewView(props: EventTimelineViewViewProps) {
  const {
    filteredItems,
    groupedTree,
    resolveResourcePath,
    onOpenRecordOrigin,
    displayFields,
    getItemTime,
    titleField,
    contentField,
    maxContentLength,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    onOpenRecord,
  } = props;

  const renderEventList = (items: Item[]) => (
    <EventTimelineEventList
      items={items}
      displayFields={displayFields}
      getItemTime={getItemTime}
      titleField={titleField}
      contentField={contentField}
      maxContentLength={maxContentLength}
      resolveResourcePath={resolveResourcePath}
      onOpenRecordOrigin={onOpenRecordOrigin}
      messageRenderPort={messageRenderPort}
      onMarkDone={onMarkDone}
      timerService={timerService}
      timers={timers}
      allThemes={allThemes}
      onOpenRecord={onOpenRecord}
    />
  );

  if (filteredItems.length === 0) {
    return <div class="event-timeline-empty">当前时间范围内没有事件记录。</div>;
  }

  if (!groupedTree) {
    return (
      <div class="event-timeline-view">
        <div class="et-ungrouped">{renderEventList(filteredItems)}</div>
      </div>
    );
  }

  return (
    <GroupedContainer
      nodes={groupedTree}
      classNames={{
        root: 'event-timeline-view',
        group: 'et-group',
        title: 'et-group-title',
        content: 'et-group-content',
        toggleIcon: 'et-group-toggle-icon',
        label: 'et-group-label',
      }}
      renderLeaf={(leafItems) => renderEventList(leafItems)}
    />
  );
}
