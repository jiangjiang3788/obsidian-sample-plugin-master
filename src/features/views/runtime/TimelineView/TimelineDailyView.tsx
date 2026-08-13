/** @jsxImportSource preact */
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import type { UpdateTaskTimeHandler } from '@shared/types/public';
import { ProgressBlock, DayColumnHeader, DayColumnBody } from '../components/timeline';
import type { DailyViewData } from './TimelineViewTypes';
import { buildTimelineDayColumns, buildTimelineTimeAxisRows } from './TimelineDailyViewModel';

type ZoomHandlers = Record<string, any>;

interface TimelineDailyViewProps {
  zoomHandlers: ZoomHandlers;
  timeAxisWidth: number;
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
  dailyViewData: DailyViewData;
  categoriesConfig: Record<string, { files?: string[]; color?: string }>;
  hourHeight: number;
  maxHours: number;
  colorMap: Record<string, string>;
  progressOrder: string[];
  untrackedLabel: string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onUpdateTaskTime?: UpdateTaskTimeHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
}

export function TimelineDailyView({
  zoomHandlers,
  timeAxisWidth,
  summaryCategoryHours,
  totalSummaryHours,
  dailyViewData,
  categoriesConfig,
  hourHeight,
  maxHours,
  colorMap,
  progressOrder,
  untrackedLabel,
  onOpenRecordOrigin,
  onUpdateTaskTime,
  onOpenRecord,
  onNotice,
  onColumnClick,
}: TimelineDailyViewProps) {
  const dayColumns = buildTimelineDayColumns(dailyViewData);
  const timeAxisRows = buildTimelineTimeAxisRows(maxHours, hourHeight);

  return (
    <div class="timeline-view-wrapper think-viz-surface" {...zoomHandlers}>
      <div class="timeline-sticky-header">
        <div class="summary-progress-container" style={{ flex: `0 0 ${timeAxisWidth}px` }}>
          <div class="summary-title">总结</div>
          <div class="summary-content">
            {totalSummaryHours > 0 && (
              <ProgressBlock
                categoryHours={summaryCategoryHours}
                order={progressOrder}
                totalHours={totalSummaryHours}
                colorMap={colorMap}
                untrackedLabel={untrackedLabel}
              />
            )}
          </div>
        </div>

        {dayColumns.map(({ day, blocks }) => (
          <DayColumnHeader
            key={day}
            day={day}
            blocks={blocks}
            categoriesConfig={categoriesConfig}
            colorMap={colorMap}
            untrackedLabel={untrackedLabel}
            progressOrder={progressOrder}
          />
        ))}
      </div>

      <div class="timeline-scrollable-body">
        <div class="time-axis" style={{ flex: `0 0 ${timeAxisWidth}px` }}>
          {timeAxisRows.map((row) => (
            <div key={row.hour} class="time-axis-hour" style={{ height: row.height }}>
              {row.label}
            </div>
          ))}
        </div>

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
            onUpdateTaskTime={onUpdateTaskTime}
            onOpenRecord={onOpenRecord}
            onNotice={onNotice}
            onColumnClick={onColumnClick}
          />
        ))}
      </div>
    </div>
  );
}
