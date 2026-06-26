/** @jsxImportSource preact */
import { h } from 'preact';
import type { CategoryConfig, Item, PeriodData } from '@core/public';
import { createPeriodData } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';

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
  // 计算最大周数（用于统一周行的行数）
  const maxWeeksInMonth = Math.max(
    ...yearlyWeekStructure.map(({ weeks }) => weeks.length),
    1
  );

  return (
    <div class="statistics-view">

      <div class="sv-year-grid">
        {/* 第1行：年度汇总 - 跨全部12列 */}
        <div class="sv-year-grid-year">
          <ChartBlock
            data={processedData.yearData}
            label={`${year}年`}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(goal: string) => ({ type: 'year', year, goal })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
          />
        </div>

        {/* 第2行：4个季度 - 每个跨3列 */}
        {processedData.quartersData.map((data, i) => (
          <div
            key={`q${i}`}
            class="sv-year-grid-quarter"
            style={{ gridColumn: `${i * 3 + 1} / ${i * 3 + 4}` }}
          >
            <ChartBlock
              data={data}
              label={`Q${i + 1}`}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={(goal: string) => ({ type: 'quarter', year, quarter: i + 1, goal })}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
              bucketAccessor={bucketAccessor}
            />
          </div>
        ))}

        {/* 第3行：12个月 - 每个占1列 */}
        {processedData.monthsData.map((data, i) => (
          <div
            key={`m${i}`}
            class={`sv-year-grid-month${(i % 3 === 2 && i < 11) ? ' sv-quarter-end' : ''}`}
            style={{ gridColumn: `${i + 1}` }}
          >
            <ChartBlock
              data={data}
              label={`${i + 1}月`}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={(goal: string) => ({ type: 'month', year, month: i + 1, goal })}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
              bucketAccessor={bucketAccessor}
            />
          </div>
        ))}

        {/* 第4+行：每月的周 - 每月占1列，周在列内竖排 */}
        {yearlyWeekStructure.map(({ month, weeks }) => {
          const gridCol = month; // month is 1-based (1=Jan), grid columns are 1-12
          const isQuarterEnd = (month % 3 === 0) && month < 12;

          return (
            <div
              key={`w-col-${month}`}
              class={`sv-year-grid-week-col${isQuarterEnd ? ' sv-quarter-end' : ''}`}
              style={{ gridColumn: `${gridCol}` }}
            >
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
                    cellIdentifier={(goal: string) => ({ type: 'week', year, week, goal })}
                    isCompact={true}
                    displayMode={displayMode}
                    minVisibleHeight={minVisibleHeight}
                    bucketAccessor={bucketAccessor}
                  />
                );
              })}
              {/* 用空白占位，确保每列高度一致 */}
              {Array.from({ length: maxWeeksInMonth - weeks.length }, (_, i) => (
                <div key={`pad-${i}`} class="sv-week-placeholder" />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
