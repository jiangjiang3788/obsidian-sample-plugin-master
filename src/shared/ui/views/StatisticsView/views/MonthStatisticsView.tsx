/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByMonth, getMonthWeeksData, isSameIsoWeek } from '@core/public';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { TopControls } from '../components/TopControls';

export function MonthStatisticsView({
  items,
  categories,
  monthDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
}: {
  items: Item[];
  categories: CategoryConfig[];
  monthDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
}) {
  const monthData = aggregateByMonth(items, categories, monthDate, usePeriod);
  const monthWeeksData = getMonthWeeksData(items, categories, monthDate, usePeriod);

  const monthStart = monthDate.startOf('month');
  const monthEnd = monthDate.endOf('month');

  const weeksMeta: { weekStart: any; label: string }[] = [];
  let weekCursor = monthStart.startOf('isoWeek');

  while (weekCursor.isBefore(monthEnd) || isSameIsoWeek(weekCursor, monthEnd)) {
    const weekStart = weekCursor;
    const weekEnd = weekStart.endOf('isoWeek');
    weeksMeta.push({
      weekStart,
      label: `${weekStart.format('MM-DD')} ~ ${weekEnd.format('MM-DD')}`,
    });
    weekCursor = weekCursor.add(1, 'week');
  }

  const weekCount = monthWeeksData.length;

  return (
    <div class="statistics-view">
      <TopControls currentView="月" usePeriod={usePeriod} onToggleUsePeriod={onToggleUsePeriod} />

      <div
        class="sv-month-grid"
        style={{ gridTemplateColumns: `repeat(${weekCount}, 1fr)` }}
      >
        {/* 第1行：月度汇总 - 跨全部N列 */}
        <div class="sv-month-grid-summary">
          <ChartBlock
            data={monthData}
            label={monthDate.format('YYYY年MM月')}
            categories={categories}
            onCellClick={onCellClick}
            cellIdentifier={(cat: string) => ({
              type: 'month',
              month: monthDate.month() + 1,
              year: monthDate.year(),
              category: cat,
            })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
          />
        </div>

        {/* 第2行：周 - 每个占1列 */}
        {monthWeeksData.map((data, index) => {
          const meta = weeksMeta[index];
          if (!meta) return null;
          const { weekStart } = meta;
          return (
            <div
              key={weekStart.format('YYYY-MM-DD')}
              class="sv-month-grid-week"
              style={{ gridColumn: `${index + 1}` }}
            >
              <ChartBlock
                data={data}
                label={`第${index + 1}周`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
