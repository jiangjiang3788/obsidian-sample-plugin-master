/** @jsxImportSource preact */
// src/features/settings/views/runtime/timeline/TimelineViewView.tsx
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import type { UpdateTimelineRangeHandler } from '@shared/types/public';
import { TimelineSummaryTable } from '../timeline/components/TimelineSummaryTable';
import { TimelineDailyView } from './TimelineDailyView';
import type { TimelineCurrentView } from './TimelineViewModel';
type ZoomHandlers = Record<string, any>;
import type { DailyViewData } from './TimelineViewTypes';
interface TimelineViewViewProps {
  timelineTasksCount: number;
  isSummaryView: boolean;
  summaryData: any[];
  colorMap: Record<string, string>;
  goalOrder: string[];
  untrackedLabel: string;
  zoomHandlers: ZoomHandlers;
  onZoomToMax?: () => void;
  maxHourHeight?: number;
  timeAxisWidth: number;
  summaryGoalHours: Record<string, number>;
  totalSummaryHours: number;
  goalAllocationSummary?: GoalTimeAllocationSummary | null;
  goalAllocationByDay?: Record<string, GoalTimeAllocationSummary>;
  hasGoalAllocation?: boolean;
  currentView?: TimelineCurrentView;
  dailyViewData: DailyViewData | null;
  hourHeight: number;
  maxHours: number;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent, selectedRange?: { startMinute: number; endMinute: number } | null) => void;
}
export function TimelineViewView(props: TimelineViewViewProps) {
  const {
    timelineTasksCount,
    isSummaryView,
    summaryData,
    colorMap,
    goalOrder,
    untrackedLabel,
    zoomHandlers,
    onZoomToMax,
    maxHourHeight,
    timeAxisWidth,
    summaryGoalHours,
    totalSummaryHours,
    goalAllocationSummary = null,
    goalAllocationByDay = {},
    hasGoalAllocation = false,
    currentView = '天',
    dailyViewData,
    hourHeight,
    maxHours,
    onOpenRecordOrigin,
    onUpdateTimelineRange,
    onOpenRecord,
    onNotice,
    onColumnClick,
  } = props;
  // 日/周/月视图即使没有任务也必须保留可点击时间网格，
  // 否则用户无法从空时间轴创建“第一个任务”。
  if (isSummaryView && timelineTasksCount === 0 && !goalAllocationSummary?.hasConfiguredPreset && (goalAllocationSummary?.trackedMinutes || 0) <= 0) {
    return <div class="timeline-empty-state think-viz-empty">当前范围内没有数据。</div>;
  }
  if (isSummaryView) {
    return (
      <TimelineSummaryTable
        summaryData={summaryData}
        colorMap={colorMap}
        goalOrder={goalOrder}
        untrackedLabel={untrackedLabel}
        overallGoalSummary={goalAllocationSummary}
        currentView={currentView === '年' ? '年' : '季'}
      />
    );
  }
  if (!dailyViewData) {
    return <div class="timeline-empty-state think-viz-empty">当前范围内没有数据。</div>;
  }
  return (
    <TimelineDailyView
      zoomHandlers={zoomHandlers}
      onZoomToMax={onZoomToMax}
      maxHourHeight={maxHourHeight}
      timeAxisWidth={timeAxisWidth}
      summaryGoalHours={summaryGoalHours}
      totalSummaryHours={totalSummaryHours}
      goalAllocationSummary={hasGoalAllocation ? goalAllocationSummary : null}
      goalAllocationByDay={hasGoalAllocation ? goalAllocationByDay : {}}
      currentView={currentView}
      dailyViewData={dailyViewData}
      hourHeight={hourHeight}
      maxHours={maxHours}
      colorMap={colorMap}
      goalOrder={goalOrder}
      untrackedLabel={untrackedLabel}
      onOpenRecordOrigin={onOpenRecordOrigin}
      onUpdateTimelineRange={onUpdateTimelineRange}
      onOpenRecord={onOpenRecord}
      onNotice={onNotice}
      onColumnClick={onColumnClick}
    />
  );
}
