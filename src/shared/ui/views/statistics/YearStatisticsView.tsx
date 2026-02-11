/** @jsxImportSource preact */
import { h } from 'preact';
import type { CategoryConfig, PeriodData } from '@core/public';
import { createPeriodData } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from './types';
import { TopControls } from './TopControls';

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
}) {
  return (
    <div class="statistics-view">
      <TopControls currentView="年" usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} />
      <div class="sv-timeline">
        <div class="sv-row">
          <ChartBlock
            data={processedData.yearData}
            label={`${year}年`}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(cat: string) => ({ type: 'year', year, category: cat })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
          />
        </div>

        <div class="sv-row sv-row-quarters">
          {processedData.quartersData.map((data, i) => (
            <ChartBlock
              key={i}
              data={data}
              label={`Q${i + 1}`}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={(cat: string) => ({ type: 'quarter', year, quarter: i + 1, category: cat })}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
            />
          ))}
        </div>

        <div class="sv-row sv-row-months">
          {processedData.monthsData.map((data, i) => (
            <ChartBlock
              key={i}
              data={data}
              label={`${i + 1}月`}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={(cat: string) => ({ type: 'month', year, month: i + 1, category: cat })}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
            />
          ))}
        </div>

        <div class="sv-row-weeks">
          {yearlyWeekStructure.map(({ month, weeks }) => (
            <div class="sv-month-col" key={month}>
              <div class="sv-month-col-header">{month}月</div>
              <div class="sv-month-col-weeks">
                {weeks.map((week) => {
                  const weekIndex = week - 1;
                  const weekData = processedData.weeksData[weekIndex] || createPeriodData(categories);

                  return (
                    <ChartBlock
                      key={week}
                      data={weekData}
                      label={`${week}W`}
                      categories={categories}
                      onCellClick={onCellClick}
                      cellIdentifier={(cat: string) => ({ type: 'week', year, week, category: cat })}
                      isCompact={true}
                      displayMode={displayMode}
                      minVisibleHeight={minVisibleHeight}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
