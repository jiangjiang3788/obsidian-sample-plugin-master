/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { buildMonthStatisticsRenderModel } from './MonthStatisticsViewModel';

export function MonthStatisticsView({
  items,
  categories,
  monthDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
}: {
  items: Item[];
  categories: CategoryConfig[];
  monthDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
}) {
  const model = buildMonthStatisticsRenderModel({ items, categories, monthDate, usePeriod, bucketAccessor });

  return (
    <div class="statistics-view">
      <div class="sv-month-grid" style={{ gridTemplateColumns: model.gridTemplateColumns }}>
        <div class="sv-month-grid-summary">
          <ChartBlock
            data={model.monthData}
            label={model.monthLabel}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={model.monthIdentifier}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
          />
        </div>

        {model.weeks.map((week) => (
          <div key={week.key} class="sv-month-grid-week" style={{ gridColumn: week.gridColumn }}>
            <ChartBlock
              data={week.data}
              label={week.label}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={week.identifier}
              isCompact={true}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
              bucketAccessor={bucketAccessor}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
