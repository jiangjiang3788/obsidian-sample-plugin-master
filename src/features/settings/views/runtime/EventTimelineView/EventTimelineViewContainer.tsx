/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { Item, ViewInstance } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { GoalDefinition } from '@core/goal/public';
import type { GroupNode } from '@core/utils/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import type { MarkDoneHandler } from '@shared/types/public';

import { EventTimelineViewView } from './EventTimelineViewView';
import { buildEventTimelineRenderModel, getEventTimelineItemTime } from './EventTimelineViewModel';

interface EventTimelineViewProps {
  items: Item[];
  /**
   * Phase2 渐进：上层（feature/usecase）预先计算好的时间线过滤结果。
   * 如果传入，则视图不再在 shared/ui 内部做过滤/排序。
   */
  filteredItems?: Item[];
  /**
   * Phase2 渐进：上层预先计算好的分组树。
   * - undefined: 未传入，由视图自己计算
   * - null: 明确表示不分组
   */
  groupedTree?: GroupNode[] | null;
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
    filteredItems: injectedFilteredItems,
    groupedTree: injectedGroupedTree,
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
      injectedFilteredItems,
      injectedGroupedTree,
      goals,
    }),
    [items, dateRange, module, injectedFilteredItems, injectedGroupedTree, goals]
  );

  const readItemTime = useMemo(
    () => (item: Item) => getEventTimelineItemTime(item, renderModel.viewConfig.timeField),
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
