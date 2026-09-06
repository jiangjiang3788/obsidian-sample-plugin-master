// src/features/views/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { GoalSettings } from '@core/goal/public';
import { useTimelineZoom } from '@core/view/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, OpenTimelineCreateHandler } from '@shared/types/public';
import type { UpdateTimelineRangeHandler } from '@shared/types/public';
import { TimelineViewView } from './TimelineViewView';
import { buildTimelineRenderModel, type TimelineCurrentView } from './TimelineViewModel';

interface TimelineViewProps {
  items: RecordViewItem[];
  dateRange: [Date, Date];
  module: any;
  currentView: TimelineCurrentView;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  /** 由 app 层注入：所有 Timeline move / resize / align 统一写回完整逻辑区间。 */
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  /** 由 feature/app 层注入：Timeline 点击创建记录。 */
  onCreateFromTimeline?: OpenTimelineCreateHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  records?: RecordViewItem[];
  goalSettings?: GoalSettings;
}

const TIME_AXIS_WIDTH = 90;

export function TimelineView({
  items,
  dateRange,
  module,
  currentView,
  onOpenRecordOrigin,
  onUpdateTimelineRange,
  onCreateFromTimeline,
  onOpenRecord,
  onNotice,
  records,
  goalSettings,
}: TimelineViewProps) {
  const renderModel = useMemo(
    () => buildTimelineRenderModel({ items, records, dateRange, module, currentView, goalSettings }),
    [items, records, dateRange, module, currentView, goalSettings]
  );

  const { hourHeight, maxHourHeight, zoomToMax, zoomHandlers } = useTimelineZoom({
    defaultHeight: renderModel.config.defaultHourHeight,
  });

  const handleColumnClick = useCallback(
    (day: string, e: MouseEvent | TouchEvent, selectedRange?: { startMinute: number; endMinute: number } | null) => {
      onCreateFromTimeline?.({
        day,
        event: e,
        selectedRange,
        hourHeight,
        maxHours: renderModel.config.MAX_HOURS_PER_DAY,
        // Retrospective creation resolves gaps from actual execution only. Planned
        // slots are guidance and must not become hard boundaries for what really happened.
        dayBlocks: (renderModel.dailyViewData?.blocksByDay[day] || []).filter((block) => block.timelineSource !== 'task-plan'),
      });
    },
    [onCreateFromTimeline, hourHeight, renderModel.config.MAX_HOURS_PER_DAY, renderModel.dailyViewData]
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
      onZoomToMax={zoomToMax}
      maxHourHeight={maxHourHeight}
      timeAxisWidth={TIME_AXIS_WIDTH}
      summaryCategoryHours={renderModel.summaryCategoryHours}
      totalSummaryHours={renderModel.totalSummaryHours}
      goalAllocationSummary={renderModel.goalAllocationSummary}
      goalAllocationByDay={renderModel.goalAllocationByDay}
      hasGoalAllocation={renderModel.hasGoalAllocation}
      currentView={currentView}
      dailyViewData={renderModel.dailyViewData}
      categoriesConfig={renderModel.config.categories}
      hourHeight={hourHeight}
      maxHours={renderModel.config.MAX_HOURS_PER_DAY}
      onOpenRecordOrigin={onOpenRecordOrigin}
      onUpdateTimelineRange={onUpdateTimelineRange}
      onOpenRecord={onOpenRecord}
      onNotice={onNotice}
      onColumnClick={handleColumnClick}
    />
  );
}
