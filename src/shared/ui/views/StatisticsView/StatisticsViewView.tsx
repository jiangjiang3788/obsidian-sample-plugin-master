/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/types/public';
import type { CategoryConfig } from '@core/view/public';
import type { PeriodData } from '@core/utils/public';
import type { StatisticsCurrentView, StatisticsCellClickHandler } from './types';
import { StatisticsGoalThemeSummaryStrip, type StatisticsGoalThemeSummary } from './StatisticsGoalThemeSummaryStrip';
import { DayStatisticsView } from './views/DayStatisticsView';
import { WeekStatisticsView } from './views/WeekStatisticsView';
import { MonthStatisticsView } from './views/MonthStatisticsView';
import { QuarterStatisticsView } from './views/QuarterStatisticsView';
import { YearStatisticsView } from './views/YearStatisticsView';

interface StatisticsViewViewProps {
  items: Item[];
  currentView: StatisticsCurrentView;
  categories: CategoryConfig[];
  startDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  year: number;
  yearlyWeekStructure: { month: number; weeks: number[] }[];
  processedData: {
    yearData: PeriodData;
    quartersData: PeriodData[];
    monthsData: PeriodData[];
    weeksData: PeriodData[];
  };
  bucketAccessor?: (item: Item) => string;
  goalThemeSummaries?: StatisticsGoalThemeSummary[];
}

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
  bucketAccessor,
  goalThemeSummaries = [],
}: StatisticsViewViewProps) {
  if (!categories || categories.length === 0) {
    return <div class="statistics-view-placeholder">暂无目标统计数据。</div>;
  }

  const themeStrip = <StatisticsGoalThemeSummaryStrip summaries={goalThemeSummaries} />;
  const sharedProps = { categories, onCellClick, displayMode, minVisibleHeight, bucketAccessor };

  switch (currentView) {
    case '天':
      return <>{themeStrip}<DayStatisticsView items={items} selectedDate={startDate} {...sharedProps} /></>;
    case '周':
      return <>{themeStrip}<WeekStatisticsView items={items} weekDate={startDate} {...sharedProps} /></>;
    case '月':
      return (
        <>
          {themeStrip}
          <MonthStatisticsView items={items} monthDate={startDate} usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} {...sharedProps} />
        </>
      );
    case '季':
      return (
        <>
          {themeStrip}
          <QuarterStatisticsView items={items} quarterDate={startDate} usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} {...sharedProps} />
        </>
      );
    case '年':
    default:
      return (
        <>
          {themeStrip}
          <YearStatisticsView
            year={year}
            processedData={processedData}
            yearlyWeekStructure={yearlyWeekStructure}
            usePeriod={usePeriod}
            onToggleUsePeriod={onToggleUsePeriod}
            {...sharedProps}
          />
        </>
      );
  }
}
