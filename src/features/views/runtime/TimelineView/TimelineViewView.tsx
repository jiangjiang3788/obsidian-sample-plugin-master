/** @jsxImportSource preact */
// src/features/settings/views/runtime/timeline/TimelineViewView.tsx
import type { EditTimelineBlockHandler, OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import type { UpdateTaskTimeHandler } from '@shared/types/public';

import { TimelineSummaryTable } from '../timeline/components/TimelineSummaryTable';
import { TimelineDailyView } from './TimelineDailyView';

type ZoomHandlers = Record<string, any>;

import type { DailyViewData } from './TimelineViewTypes';

interface TimelineViewViewProps {
  timelineTasksCount: number;

  isSummaryView: boolean;

  summaryData: any[];

  colorMap: Record<string, string>;

  progressOrder: string[];

  untrackedLabel: string;

  zoomHandlers: ZoomHandlers;
  timeAxisWidth: number;
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
  dailyViewData: DailyViewData | null;

  categoriesConfig: Record<string, { files?: string[]; color?: string }>;
  hourHeight: number;
  maxHours: number;

  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onUpdateTaskTime?: UpdateTaskTimeHandler;
  onEditTimelineBlock?: EditTimelineBlockHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
}

export function TimelineViewView(props: TimelineViewViewProps) {
  const {
    timelineTasksCount,
    isSummaryView,
    summaryData,
    colorMap,
    progressOrder,
    untrackedLabel,

    zoomHandlers,
    timeAxisWidth,
    summaryCategoryHours,
    totalSummaryHours,
    dailyViewData,

    categoriesConfig,
    hourHeight,
    maxHours,
    onOpenRecordOrigin,
    onUpdateTaskTime,
    onEditTimelineBlock,
    onOpenRecord,
    onNotice,
    onColumnClick,
  } = props;

  // 日/周/月视图即使没有任务也必须保留可点击时间网格，
  // 否则用户无法从空时间轴创建“第一个任务”。
  if (isSummaryView && timelineTasksCount === 0) {
    return <div class="timeline-empty-state think-viz-empty">当前范围内没有数据。</div>;
  }

  if (isSummaryView) {
    return (
      <TimelineSummaryTable
        summaryData={summaryData}
        colorMap={colorMap}
        progressOrder={progressOrder}
        untrackedLabel={untrackedLabel}
      />
    );
  }

  if (!dailyViewData) {
    return <div class="timeline-empty-state think-viz-empty">当前范围内没有数据。</div>;
  }

  return (
    <TimelineDailyView
      zoomHandlers={zoomHandlers}
      timeAxisWidth={timeAxisWidth}
      summaryCategoryHours={summaryCategoryHours}
      totalSummaryHours={totalSummaryHours}
      dailyViewData={dailyViewData}
      categoriesConfig={categoriesConfig}
      hourHeight={hourHeight}
      maxHours={maxHours}
      colorMap={colorMap}
      progressOrder={progressOrder}
      untrackedLabel={untrackedLabel}
      onOpenRecordOrigin={onOpenRecordOrigin}
      onUpdateTaskTime={onUpdateTaskTime}
      onEditTimelineBlock={onEditTimelineBlock}
      onOpenRecord={onOpenRecord}
      onNotice={onNotice}
      onColumnClick={onColumnClick}
    />
  );
}
