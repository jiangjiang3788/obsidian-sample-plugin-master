/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByWeek } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';

export function WeekStatisticsView({
  items,
  categories,
  weekDate,
  onCellClick,
  displayMode,
  minVisibleHeight,
}: {
  items: Item[];
  categories: CategoryConfig[];
  weekDate: any;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
}) {
  // 周视图：显示选定周的整体统计数据
  const weekStart = weekDate.startOf('isoWeek');
  const weekEnd = weekDate.endOf('isoWeek');
  const data = aggregateByWeek(items, categories, weekStart);

  return (
    <div class="statistics-view">
      <div class="sv-timeline">
        <div class="sv-row">
          <ChartBlock
            data={data}
            label={`${weekStart.format('YYYY年MM月DD日')} ~ ${weekEnd.format('MM月DD日')} (第${weekStart.isoWeek()}周)`}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(cat: string) => ({
              type: 'week',
              week: weekStart.isoWeek(),
              year: weekStart.isoWeekYear(),
              category: cat,
            })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
          />
        </div>
      </div>
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
