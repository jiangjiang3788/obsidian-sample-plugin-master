/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig, PeriodData } from '@core/public';
import type { StatisticsCurrentView, StatisticsCellClickHandler } from './types';
import { DayStatisticsView } from './views/DayStatisticsView';
import { WeekStatisticsView } from './views/WeekStatisticsView';
import { MonthStatisticsView } from './views/MonthStatisticsView';
import { QuarterStatisticsView } from './views/QuarterStatisticsView';
import { YearStatisticsView } from './views/YearStatisticsView';

export function StatisticsViewView({
  items,
  currentView,
  categories,
  startDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
  year,
  yearlyWeekStructure,
  processedData,
}: {
  items: Item[];
  currentView: StatisticsCurrentView;
  categories: CategoryConfig[];
  startDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;

  // 年视图专用（其他视图可忽略）
  year: number;
  yearlyWeekStructure: { month: number; weeks: number[] }[];
  processedData: {
    yearData: PeriodData;
    quartersData: PeriodData[];
    monthsData: PeriodData[];
    weeksData: PeriodData[];
  };
}) {
  if (!categories || categories.length === 0) {
    return <div class="statistics-view-placeholder">请先在视图设置中配置您想统计的分类。</div>;
  }

  switch (currentView) {
    case '天':
      return (
        <DayStatisticsView
          items={items}
          categories={categories}
          selectedDate={startDate}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
        />
      );

    case '周':
      return (
        <WeekStatisticsView
          items={items}
          categories={categories}
          weekDate={startDate}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
        />
      );

    case '月':
      return (
        <MonthStatisticsView
          items={items}
          categories={categories}
          monthDate={startDate}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
        />
      );

    case '季':
      return (
        <QuarterStatisticsView
          items={items}
          categories={categories}
          quarterDate={startDate}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
        />
      );

    case '年':
    default:
      return (
        <YearStatisticsView
          year={year}
          categories={categories}
          processedData={processedData}
          yearlyWeekStructure={yearlyWeekStructure}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
        />
      );
  }
}
