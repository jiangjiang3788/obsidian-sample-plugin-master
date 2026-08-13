/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { CategoryConfig } from '@core/view/public';
import { aggregateByDay } from '@core/utils/public';
import { ChartBlock } from '../../components/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import type { OpenRecordOriginHandler } from '@shared/types/public';

export function DayStatisticsView({
  items,
  categories,
  selectedDate,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
  onOpenRecordOrigin,
}: {
  items: RecordViewItem[];
  categories: CategoryConfig[];
  selectedDate: any;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: RecordViewItem) => string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}) {
  // 天视图：显示选定日期的统计数据
  const data = aggregateByDay(items, categories, selectedDate, bucketAccessor);


  return (
    <div class="statistics-view think-viz-surface">
      <div class="sv-timeline">
        <div class="sv-row">
          <ChartBlock
            data={data}
            label={selectedDate.format('YYYY年MM月DD日 dddd')}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(goal: string) => ({ type: 'day', date: selectedDate.format('YYYY-MM-DD'), goal })}
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
