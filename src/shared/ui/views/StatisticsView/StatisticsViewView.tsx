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


function GoalThemeSummaryStrip({ summaries }: { summaries: Array<{ goalPath: string; themes: Array<{ themePath: string; label: string; count: number }> }> }) {
  const visible = (summaries || []).filter((row) => row.themes.length > 0).slice(0, 6);
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
      {visible.map((row) => (
        <div key={row.goalPath} style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '999px', padding: '5px 9px', fontSize: '12px', color: 'var(--text-muted)' }} title={`${row.goalPath}: ${row.themes.map((theme) => `${theme.themePath} ${theme.count}`).join(' / ')}`}>
          <span style={{ color: 'var(--text-normal)', fontWeight: 600 }}>{row.goalPath.split('/').filter(Boolean).pop() || row.goalPath}</span>
          <span> · </span>
          <span>{row.themes.map((theme) => `${theme.label}${theme.count}`).join(' / ')}</span>
        </div>
      ))}
    </div>
  );
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
  bucketAccessor?: (item: Item) => string;
  goalThemeSummaries?: Array<{ goalPath: string; themes: Array<{ themePath: string; label: string; count: number }> }>;
}) {
  if (!categories || categories.length === 0) {
    return <div class="statistics-view-placeholder">暂无目标统计数据。</div>;
  }

  const themeStrip = <GoalThemeSummaryStrip summaries={goalThemeSummaries} />;

  switch (currentView) {
    case '天':
      return (
        <>
          {themeStrip}
          <DayStatisticsView
          items={items}
          categories={categories}
          selectedDate={startDate}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
          bucketAccessor={bucketAccessor}
        />
        </>
      );

    case '周':
      return (
        <>
          {themeStrip}
          <WeekStatisticsView
          items={items}
          categories={categories}
          weekDate={startDate}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
          bucketAccessor={bucketAccessor}
        />
        </>
      );

    case '月':
      return (
        <>
          {themeStrip}
          <MonthStatisticsView
          items={items}
          categories={categories}
          monthDate={startDate}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
          bucketAccessor={bucketAccessor}
        />
        </>
      );

    case '季':
      return (
        <>
          {themeStrip}
          <QuarterStatisticsView
          items={items}
          categories={categories}
          quarterDate={startDate}
          usePeriod={usePeriod}
          onToggleUsePeriod={onToggleUsePeriod}
          onCellClick={onCellClick}
          displayMode={displayMode}
          minVisibleHeight={minVisibleHeight}
          bucketAccessor={bucketAccessor}
        />
        </>
      );

    case '年':
    default:
      return (
        <>
          {themeStrip}
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
          bucketAccessor={bucketAccessor}
        />
        </>
      );
  }
}
