/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByQuarter, aggregateByMonth, getMonthWeeksData, isSameIsoWeek, createPeriodData } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { TopControls } from '../components/TopControls';

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
  const quarterStart = quarterDate.startOf('quarter');
  const quarterData = aggregateByQuarter(items, categories, quarterDate, usePeriod);

  // 准备3个月的数据和周数据
  const monthsInfo = Array.from({ length: 3 }, (_, i) => {
    const month = quarterStart.add(i, 'month');
    const monthData = aggregateByMonth(items, categories, month, usePeriod);
    const weeksData = getMonthWeeksData(items, categories, month, usePeriod);

    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');

    const weeksMeta: { weekStart: any }[] = [];
    let weekCursor = monthStart.startOf('isoWeek');
    while (weekCursor.isBefore(monthEnd) || isSameIsoWeek(weekCursor, monthEnd)) {
      weeksMeta.push({ weekStart: weekCursor });
      weekCursor = weekCursor.add(1, 'week');
    }

    return { month, data: monthData, weeksData, weeksMeta };
  });

  // 最大周数（用于占位对齐）
  const maxWeeks = Math.max(...monthsInfo.map(m => m.weeksData.length), 1);

  return (
    <div class="statistics-view">
      <TopControls currentView="季" usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} />

      <div class="sv-quarter-grid">
        {/* 第1行：季度汇总 - 跨全部3列 */}
        <div class="sv-quarter-grid-summary">
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

        {/* 第2行：3个月 - 每个占1列 */}
        {monthsInfo.map(({ month, data }, i) => (
          <div
            key={month.format('YYYY-MM')}
            class="sv-quarter-grid-month"
            style={{ gridColumn: `${i + 1}` }}
          >
            <ChartBlock
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
              isCompact={true}
              displayMode={displayMode}
              minVisibleHeight={minVisibleHeight}
            />
          </div>
        ))}

        {/* 第3+行：每月的周 - 竖排在月列下方 */}
        {monthsInfo.map(({ month, weeksData, weeksMeta }, i) => (
          <div
            key={`w-col-${month.format('YYYY-MM')}`}
            class="sv-quarter-grid-week-col"
            style={{ gridColumn: `${i + 1}` }}
          >
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
            {/* 占位块，确保3列等高 */}
            {Array.from({ length: maxWeeks - weeksData.length }, (_, j) => (
              <div key={`pad-${j}`} class="sv-week-placeholder" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
