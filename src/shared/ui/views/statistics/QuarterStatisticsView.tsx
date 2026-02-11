/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByQuarter, aggregateByMonth, getMonthWeeksData, isSameIsoWeek } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from './types';
import { TopControls } from './TopControls';

export function QuarterStatisticsView({
  items,
  categories,
  quarterDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
}: {
  items: Item[];
  categories: CategoryConfig[];
  quarterDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
}) {
  // 季度视图：显示季度汇总、3个月及其下属周
  const quarterStart = quarterDate.startOf('quarter');
  const quarterData = aggregateByQuarter(items, categories, quarterDate, usePeriod);

  const monthsData = Array.from({ length: 3 }, (_, i) => {
    const month = quarterStart.add(i, 'month');
    const monthData = aggregateByMonth(items, categories, month, usePeriod);
    const weeksData = getMonthWeeksData(items, categories, month, usePeriod);

    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');

    const weeksMeta: { weekStart: any }[] = [];
    let weekCursor = monthStart.startOf('isoWeek');
    while (weekCursor.isBefore(monthEnd) || isSameIsoWeek(weekCursor, monthEnd)) {
      const weekStart = weekCursor;
      weeksMeta.push({ weekStart });
      weekCursor = weekCursor.add(1, 'week');
    }

    return { month, data: monthData, weeksData, weeksMeta };
  });

  return (
    <div class="statistics-view">
      <TopControls currentView="季" usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} />
      <div class="sv-timeline">
        {/* 季度汇总 */}
        <div class="sv-row">
          <ChartBlock
            data={quarterData}
            label={`${quarterDate.format('YYYY年')} 第${quarterDate.quarter()}季度`}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(cat: string) => ({
              type: 'quarter',
              quarter: quarterDate.quarter(),
              year: quarterDate.year(),
              category: cat,
            })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
          />
        </div>

        {/* 季度月份总览 */}
        <div class="sv-row sv-row-quarter-months">
          {monthsData.map(({ month, data }) => (
            <ChartBlock
              key={month.format('YYYY-MM')}
              data={data}
              label={month.format('MM月')}
              categories={categories}
              onCellClick={onCellClick}
              cellIdentifier={(cat: string) => ({
                type: 'month',
                month: month.month() + 1,
                year: month.year(),
                category: cat,
              })}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
            />
          ))}
        </div>

        {/* 每月的周视图 */}
        {monthsData.map(({ month, weeksData, weeksMeta }) => (
          <div key={month.format('YYYY-MM')} class="sv-month-weeks-section">
            <div class="sv-month-header">{month.format('YYYY年MM月')} 周视图</div>
            <div class="sv-row sv-row-month-weeks">
              {weeksData.map((data, index) => {
                const meta = weeksMeta[index];
                if (!meta) return null;
                const { weekStart } = meta;
                return (
                  <ChartBlock
                    key={weekStart.format('YYYY-MM-DD')}
                    data={data}
                    label={`${weekStart.isoWeek()}W`}
                    categories={categories}
                    onCellClick={onCellClick}
                    cellIdentifier={(cat: string) => ({
                      type: 'week',
                      week: weekStart.isoWeek(),
                      year: weekStart.isoWeekYear(),
                      category: cat,
                    })}
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
      {/* Popover is rendered via FloatingWidget in container */}
    </div>
  );
}
