/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { CategoryConfig } from '@core/view/public';
import { aggregateByWeek } from '@core/utils/public';
import { ChartBlock } from '../../components/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import type { OpenRecordOriginHandler } from '@shared/types/public';

export function WeekStatisticsView({
  items,
  categories,
  weekDate,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
  onOpenRecordOrigin,
}: {
  items: RecordViewItem[];
  categories: CategoryConfig[];
  weekDate: any;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: RecordViewItem) => string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}) {
  // 周视图：显示选定周的整体统计数据
  const weekStart = weekDate.startOf('isoWeek');
  const weekEnd = weekDate.endOf('isoWeek');
  const data = aggregateByWeek(items, categories, weekStart, false, bucketAccessor);


  return (
    <div class="statistics-view think-viz-surface">
      <div class="sv-timeline">
        <div class="sv-row">
          <ChartBlock
            data={data}
            label={`${weekStart.format('YYYY年MM月DD日')} ~ ${weekEnd.format('MM月DD日')} (第${weekStart.isoWeek()}周)`}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(goal: string) => ({
              type: 'week',
              week: weekStart.isoWeek(),
              year: weekStart.isoWeekYear(),
              goal,
            })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
            onOpenRecordOrigin={onOpenRecordOrigin}
          />
        </div>
      </div>
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
