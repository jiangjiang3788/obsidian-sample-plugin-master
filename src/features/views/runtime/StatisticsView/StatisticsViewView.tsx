/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { CategoryConfig } from '@core/view/public';
import type { PeriodData } from '@core/utils/public';
import type { StatisticsCurrentView, StatisticsCellClickHandler } from './types';
import type { OpenRecordOriginHandler } from '@shared/types/public';
import type { StatisticsGoalThemeSummary } from './StatisticsGoalThemeSummaryStrip';
import { DayStatisticsView } from './views/DayStatisticsView';
import { WeekStatisticsView } from './views/WeekStatisticsView';
import { MonthStatisticsView, QuarterStatisticsView, YearStatisticsView } from './views/PeriodStatisticsView';

interface StatisticsViewViewProps {
  items: RecordViewItem[];
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
  bucketAccessor?: (item: RecordViewItem) => string;
  goalThemeSummaries?: StatisticsGoalThemeSummary[];
  onOpenRecordOrigin?: OpenRecordOriginHandler;
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
  onOpenRecordOrigin,
}: StatisticsViewViewProps) {
  if (!categories || categories.length === 0) {
    return <div class="statistics-view-placeholder think-viz-empty">暂无目标统计数据。</div>;
  }

  void goalThemeSummaries;
  const sharedProps = { categories, onCellClick, displayMode, minVisibleHeight, bucketAccessor, onOpenRecordOrigin };

  switch (currentView) {
    case '天':
      return <DayStatisticsView items={items} selectedDate={startDate} {...sharedProps} />;
    case '周':
      return <WeekStatisticsView items={items} weekDate={startDate} {...sharedProps} />;
    case '月':
      return <MonthStatisticsView items={items} monthDate={startDate} usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} {...sharedProps} />;
    case '季':
      return <QuarterStatisticsView items={items} quarterDate={startDate} usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} {...sharedProps} />;
    case '年':
    default:
      return (
        <YearStatisticsView
          year={year}
          processedData={processedData}
          yearlyWeekStructure={yearlyWeekStructure}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          {...sharedProps}
        />
      );
  }
}
