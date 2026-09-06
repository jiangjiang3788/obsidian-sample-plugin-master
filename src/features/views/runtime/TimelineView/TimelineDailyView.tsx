/** @jsxImportSource preact */
import type { JSX } from 'preact';
import type { OpenRecordHandler, OpenRecordOriginHandler, UpdateTimelineRangeHandler } from '@shared/types/public';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import { DayColumnHeader, DayColumnBody, TimelineOverallSummary, TimelineTimeAxis } from '../components/timeline';
import type { DailyViewData } from './TimelineViewTypes';
import { buildTimelineDayColumns, buildTimelineTimeAxisRows } from './TimelineDailyViewModel';
import type { TimelineCurrentView } from './TimelineViewModel';
type ZoomHandlers = Record<string, any>;
interface TimelineDailyViewProps {
  zoomHandlers: ZoomHandlers;
  onZoomToMax?: () => void;
  maxHourHeight?: number;
  timeAxisWidth: number;
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
  goalAllocationSummary?: GoalTimeAllocationSummary | null;
  goalAllocationByDay?: Record<string, GoalTimeAllocationSummary>;
  currentView?: TimelineCurrentView;
  dailyViewData: DailyViewData;
  categoriesConfig: Record<string, { files?: string[]; color?: string }>;
  hourHeight: number;
  maxHours: number;
  colorMap: Record<string, string>;
  progressOrder: string[];
  untrackedLabel: string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent, selectedRange?: { startMinute: number; endMinute: number } | null) => void;
}

export function TimelineDailyView({
  zoomHandlers,
  onZoomToMax,
  maxHourHeight,
  timeAxisWidth,
  summaryCategoryHours,
  totalSummaryHours,
  goalAllocationSummary = null,
  goalAllocationByDay = {},
  currentView = '天',
  dailyViewData,
  categoriesConfig,
  hourHeight,
  maxHours,
  colorMap,
  progressOrder,
  untrackedLabel,
  onOpenRecordOrigin,
  onUpdateTimelineRange,
  onOpenRecord,
  onNotice,
  onColumnClick,
}: TimelineDailyViewProps) {
  const dayColumns = buildTimelineDayColumns(dailyViewData);
  const timeAxisRows = buildTimelineTimeAxisRows(maxHours, hourHeight);
  return (
    <div
      class="timeline-view-wrapper think-viz-surface"
      style={{ '--timeline-hour-height': `${hourHeight}px`, '--timeline-quarter-hour-height': `${hourHeight / 4}px`, '--timeline-five-minute-height': `${hourHeight / 12}px` } as JSX.CSSProperties}
      {...zoomHandlers}
    >
      <div class="timeline-sticky-header">
        <TimelineOverallSummary
          width={timeAxisWidth}
          goalSummary={goalAllocationSummary}
          currentView={currentView}
          categoryHours={summaryCategoryHours}
          totalHours={totalSummaryHours}
          progressOrder={progressOrder}
          colorMap={colorMap}
          untrackedLabel={untrackedLabel}
        />

        {dayColumns.map(({ day, blocks }) => (
          <DayColumnHeader
            key={day}
            day={day}
            blocks={blocks.filter((block) => block.timelineSource !== 'task-plan')}
            categoriesConfig={categoriesConfig}
            colorMap={colorMap}
            untrackedLabel={untrackedLabel}
            progressOrder={progressOrder}
            goalAllocationSummary={goalAllocationByDay[day]}
            currentView={currentView}
          />
        ))}
      </div>

      <div class="timeline-scrollable-body">
        <TimelineTimeAxis
          rows={timeAxisRows}
          width={timeAxisWidth}
          hourHeight={hourHeight}
          maxHours={maxHours}
          maxHourHeight={maxHourHeight}
          onZoomToMax={onZoomToMax}
        />

        {dayColumns.map(({ day, blocks }) => (
          <DayColumnBody
            key={day}
            onOpenRecordOrigin={onOpenRecordOrigin}
            day={day}
            blocks={blocks}
            hourHeight={hourHeight}
            categoriesConfig={categoriesConfig}
            colorMap={colorMap}
            maxHours={maxHours}
            onUpdateTimelineRange={onUpdateTimelineRange}
            onOpenRecord={onOpenRecord}
            onNotice={onNotice}
            onColumnClick={onColumnClick}
          />
        ))}
      </div>
    </div>
  );
}
