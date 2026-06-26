/** @jsxImportSource preact */
import { h } from 'preact';
import type { CategoryConfig, Item, PeriodData } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { buildYearStatisticsRenderModel } from './YearStatisticsViewModel';

export function YearStatisticsView({
  year,
  categories,
  processedData,
  yearlyWeekStructure,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
}: {
  year: number;
  categories: CategoryConfig[];
  processedData: {
    yearData: PeriodData;
    quartersData: PeriodData[];
    monthsData: PeriodData[];
    weeksData: PeriodData[];
  };
  yearlyWeekStructure: { month: number; weeks: number[] }[];
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
}) {
  const model = buildYearStatisticsRenderModel({ year, categories, processedData, yearlyWeekStructure });

  return (
    <div class="statistics-view">
      <div class="sv-year-grid">
        <div class="sv-year-grid-year">
          <ChartBlock
            data={processedData.yearData}
            label={model.yearLabel}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={model.yearIdentifier}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
          />
        </div>

        {model.quarters.map((quarter) => (
          <div key={quarter.key} class="sv-year-grid-quarter" style={{ gridColumn: quarter.gridColumn }}>
            <ChartBlock
              data={quarter.data}
              label={quarter.label}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={quarter.identifier}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
              bucketAccessor={bucketAccessor}
            />
          </div>
        ))}

        {model.months.map((month) => (
          <div key={month.key} class={month.className} style={{ gridColumn: month.gridColumn }}>
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

        {model.weekColumns.map((column) => (
          <div key={column.key} class={column.className} style={{ gridColumn: column.gridColumn }}>
            {column.weeks.map((week) => (
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
            {Array.from({ length: column.placeholderCount }, (_, index) => (
              <div key={`pad-${index}`} class="sv-week-placeholder" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
