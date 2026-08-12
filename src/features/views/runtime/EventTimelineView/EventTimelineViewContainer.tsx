/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { RecordViewItem, ViewInstance } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { GoalDefinition } from '@core/goal/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import type { MarkDoneHandler } from '@shared/types/public';

import { EventTimelineViewView } from './EventTimelineViewView';
import { buildEventTimelineRenderModel, getEventTimelineItemTime } from './EventTimelineViewModel';

interface EventTimelineViewProps {
  items: RecordViewItem[];
  resolveResourcePath?: ResolveResourcePathHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  dateRange: [Date, Date];
  module: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  onMarkDone?: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  goals?: GoalDefinition[];
  messageRenderPort?: MessageRenderPort;
  onOpenRecord?: OpenRecordHandler;
}

/**
 * 事件时间线视图：
 * - 纵向线性展示「这段时间发生了哪些事件」
 * - 按配置字段进行多级分组（如有）
 * - 日期/时间仍然在左侧作为时间线主轴
 */
export function EventTimelineView(props: EventTimelineViewProps) {
  const {
    items,
    resolveResourcePath,
    onOpenRecordOrigin,
    dateRange,
    module,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    goals = [],
    messageRenderPort,
    onOpenRecord,
  } = props;

  const renderModel = useMemo(
    () => buildEventTimelineRenderModel({
      items,
      dateRange,
      module,
      goals,
    }),
    [items, dateRange, module, goals]
  );

  const readItemTime = useMemo(
    () => (item: RecordViewItem) => getEventTimelineItemTime(item, renderModel.viewConfig.timeField),
    [renderModel.viewConfig.timeField]
  );

  return (
    <EventTimelineViewView
      filteredItems={renderModel.filteredItems}
      groupedTree={renderModel.groupedTree}
      resolveResourcePath={resolveResourcePath}
      onOpenRecordOrigin={onOpenRecordOrigin}
      displayFields={renderModel.displayFields}
      getItemTime={readItemTime}
      titleField={renderModel.viewConfig.titleField}
      contentField={renderModel.viewConfig.contentField}
      maxContentLength={renderModel.viewConfig.maxContentLength}
      messageRenderPort={messageRenderPort}
      onMarkDone={onMarkDone}
      timerService={timerService}
      timers={timers}
      allThemes={allThemes}
      onOpenRecord={onOpenRecord}
    />
  );
}
