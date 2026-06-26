/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByDay } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';

export function DayStatisticsView({
  items,
  categories,
  selectedDate,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
}: {
  items: Item[];
  categories: CategoryConfig[];
  selectedDate: any;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
}) {
  // 天视图：显示选定日期的统计数据
  const data = aggregateByDay(items, categories, selectedDate, bucketAccessor);

  return (
    <div class="statistics-view">
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
          />
        </div>
      </div>
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
