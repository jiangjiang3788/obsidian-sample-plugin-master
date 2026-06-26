/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { buildQuarterStatisticsRenderModel } from './QuarterStatisticsViewModel';

export function QuarterStatisticsView({
  items,
  categories,
  quarterDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
}: {
  items: Item[];
  categories: CategoryConfig[];
  quarterDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
}) {
  const model = buildQuarterStatisticsRenderModel({ items, categories, quarterDate, usePeriod, bucketAccessor });

  return (
    <div class="statistics-view">
      <div class="sv-quarter-grid">
        <div class="sv-quarter-grid-summary">
          <ChartBlock
            data={model.quarterData}
            label={model.quarterLabel}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={model.quarterIdentifier}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
          />
        </div>

        {model.months.map((month) => (
          <div key={month.key} class="sv-quarter-grid-month" style={{ gridColumn: month.gridColumn }}>
            <ChartBlock
              data={month.data}
              label={month.label}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={month.identifier}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
              bucketAccessor={bucketAccessor}
            />
          </div>
        ))}

        {model.months.map((month) => (
          <div key={`w-col-${month.key}`} class="sv-quarter-grid-week-col" style={{ gridColumn: month.gridColumn }}>
            {month.weeks.map((week) => (
              <ChartBlock
                key={week.key}
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
            ))}
            {Array.from({ length: month.placeholderCount }, (_, index) => (
              <div key={`pad-${index}`} class="sv-week-placeholder" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
