// src/features/views/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import { useTimelineZoom } from '@core/view/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, OpenTimelineCreateHandler } from '@shared/types/public';
import type { UpdateTaskTimeHandler } from '@shared/types/public';
import { TimelineViewView } from './TimelineViewView';
import { buildTimelineRenderModel, type TimelineCurrentView } from './TimelineViewModel';

interface TimelineViewProps {
  items: RecordViewItem[];
  dateRange: [Date, Date];
  module: any;
  currentView: TimelineCurrentView;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  /** 由 feature 层注入：用于“对齐/精确编辑”等需要写回的操作 */
  onUpdateTaskTime?: UpdateTaskTimeHandler;
  /** 由 feature/app 层注入：Timeline 点击创建记录。 */
  onCreateFromTimeline?: OpenTimelineCreateHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  inputSettings: any;
  records?: RecordViewItem[];
}

const TIME_AXIS_WIDTH = 90;

export function TimelineView({
  items,
  dateRange,
  module,
  currentView,
  onOpenRecordOrigin,
  onUpdateTaskTime,
  onCreateFromTimeline,
  onOpenRecord,
  onNotice,
  inputSettings,
  records,
}: TimelineViewProps) {
  const inputBlocks = inputSettings?.blocks || [];
  const renderModel = useMemo(
    () => buildTimelineRenderModel({ items, records, dateRange, module, currentView }),
    [items, records, dateRange, module, currentView]
  );

  const { hourHeight, zoomHandlers } = useTimelineZoom({
    defaultHeight: renderModel.config.defaultHourHeight,
  });

  const handleColumnClick = useCallback(
    (day: string, e: MouseEvent | TouchEvent) => {
      onCreateFromTimeline?.({
        day,
        event: e,
        inputBlocks,
        hourHeight,
        dayBlocks: renderModel.dailyViewData?.blocksByDay[day] || [],
      });
    },
    [onCreateFromTimeline, inputBlocks, hourHeight, renderModel.dailyViewData]
  );

  return (
    <TimelineViewView
      timelineTasksCount={renderModel.timelineTasks.length}
      isSummaryView={renderModel.isSummaryView}
      summaryData={renderModel.summaryData}
      colorMap={renderModel.colorMap}
      progressOrder={renderModel.config.progressOrder}
      untrackedLabel={renderModel.config.UNTRACKED_LABEL}
      zoomHandlers={zoomHandlers}
      timeAxisWidth={TIME_AXIS_WIDTH}
      summaryCategoryHours={renderModel.summaryCategoryHours}
      totalSummaryHours={renderModel.totalSummaryHours}
      dailyViewData={renderModel.dailyViewData}
      categoriesConfig={renderModel.config.categories}
      hourHeight={hourHeight}
      maxHours={renderModel.config.MAX_HOURS_PER_DAY}
      onOpenRecordOrigin={onOpenRecordOrigin}
      onUpdateTaskTime={onUpdateTaskTime}
      onOpenRecord={onOpenRecord}
      onNotice={onNotice}
      onColumnClick={handleColumnClick}
    />
  );
}
