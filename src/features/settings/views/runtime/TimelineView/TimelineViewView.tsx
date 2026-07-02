/** @jsxImportSource preact */
// src/features/settings/views/runtime/timeline/TimelineViewView.tsx
import type { TaskBlock } from '@core/types/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import type { UpdateTaskTimeHandler } from '@shared/types/public';

import { TimelineSummaryTable } from '../timeline/components/TimelineSummaryTable';
import { TimelineDailyView } from './TimelineDailyView';

type ZoomHandlers = Record<string, any>;

export interface DailyViewData {
  dateRangeDays: any[]; // dayjs objects
  blocksByDay: Record<string, TaskBlock[]>;
}

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
    onOpenRecord,
    onNotice,
    onColumnClick,
  } = props;

  if (timelineTasksCount === 0) {
    return <div class="timeline-empty-state">当前范围内没有数据。</div>;
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
    return <div class="timeline-empty-state">当前范围内没有数据。</div>;
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
      onOpenRecord={onOpenRecord}
      onNotice={onNotice}
      onColumnClick={onColumnClick}
    />
  );
}
