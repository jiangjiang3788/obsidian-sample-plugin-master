/** @jsxImportSource preact */
// src/shared/ui/views/timeline/TimelineViewView.tsx
import { h } from 'preact';
import type { TaskBlock } from '@core/public';
import type { UpdateTaskTimeHandler } from '@shared/types/taskTime';

import {
  ProgressBlock,
  DayColumnHeader,
  DayColumnBody,
} from '@shared/ui/timeline';

import { TimelineSummaryTable } from '../timeline/components/TimelineSummaryTable';

type ZoomHandlers = Record<string, any>;

export interface DailyViewData {
  dateRangeDays: any[]; // dayjs objects
  blocksByDay: Record<string, TaskBlock[]>;
}

interface TimelineViewViewProps {
  /** 仅用于空态判断，避免把整份 tasks 传给纯 View */
  timelineTasksCount: number;

  /** 年/季：汇总表；月/周/天：时间轴 */
  isSummaryView: boolean;

  /** 汇总表数据 */
  summaryData: any[];

  /** 颜色映射（分类 -> 颜色） */
  colorMap: Record<string, string>;

  /** 进度条显示顺序 */
  progressOrder: string[];

  /** 未跟踪标签 */
  untrackedLabel: string;

  /** --- 下方为时间轴视图所需 props --- */
  zoomHandlers: ZoomHandlers;
  timeAxisWidth: number;
  summaryCategoryHours: Record<string, number>;
  totalSummaryHours: number;
  dailyViewData: DailyViewData | null;

  categoriesConfig: Record<string, { files?: string[]; color?: string }>;
  hourHeight: number;
  maxHours: number;

  app: any;
  onUpdateTaskTime?: UpdateTaskTimeHandler;
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
    app,
    onUpdateTaskTime,
    onColumnClick,
  } = props;

  // 空数据处理
  if (timelineTasksCount === 0) {
    return <div class="timeline-empty-state">当前范围内没有数据。</div>;
  }

  // 年/季视图：使用汇总表
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

  // 天/周/月视图：使用每日时间轴
  if (!dailyViewData) {
    return <div class="timeline-empty-state">当前范围内没有数据。</div>;
  }

  return (
    <div class="timeline-view-wrapper" {...zoomHandlers}>
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

        {dailyViewData.dateRangeDays.map((day) => {
          const dayStr = day.format('YYYY-MM-DD');
          const blocks = dailyViewData.blocksByDay[dayStr] || [];
          return (
            <DayColumnHeader
              key={dayStr}
              day={dayStr}
              blocks={blocks}
              categoriesConfig={categoriesConfig}
              colorMap={colorMap}
              untrackedLabel={untrackedLabel}
              progressOrder={progressOrder}
            />
          );
        })}
      </div>

      <div class="timeline-scrollable-body">
        <div class="time-axis" style={{ flex: `0 0 ${timeAxisWidth}px` }}>
          {Array.from({ length: maxHours + 1 }, (_, i) => (
            <div key={i} class="time-axis-hour" style={{ height: `${hourHeight}px` }}>
              {i > 0 && i % 2 === 0 ? `${i}:00` : ''}
            </div>
          ))}
        </div>

        {dailyViewData.dateRangeDays.map((day) => {
          const dayStr = day.format('YYYY-MM-DD');
          const blocks = dailyViewData.blocksByDay[dayStr] || [];
          return (
            <DayColumnBody
              key={dayStr}
              app={app}
              day={dayStr}
              blocks={blocks}
              hourHeight={hourHeight}
              categoriesConfig={categoriesConfig}
              colorMap={colorMap}
              maxHours={maxHours}
              onUpdateTaskTime={onUpdateTaskTime}
              onColumnClick={onColumnClick}
            />
          );
        })}
      </div>
    </div>
  );
}
