/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByDay } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';

export function DayStatisticsView({
  items,
  categories,
  selectedDate,
  onCellClick,
  displayMode,
  minVisibleHeight,
}: {
  items: Item[];
  categories: CategoryConfig[];
  selectedDate: any;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
}) {
  // 天视图：显示选定日期的统计数据
  const data = aggregateByDay(items, categories, selectedDate);

  return (
    <div class="statistics-view">
      <div class="sv-timeline">
        <div class="sv-row">
          <ChartBlock
            data={data}
            label={selectedDate.format('YYYY年MM月DD日 dddd')}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(cat: string) => ({ type: 'day', date: selectedDate.format('YYYY-MM-DD'), category: cat })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
          />
        </div>
      </div>
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
