/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import type { CategoryConfig } from '@core/public';
import { aggregateByMonth, getMonthWeeksData, isSameIsoWeek } from '@core/public';
import { ChartBlock } from '../../../statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';

export function MonthStatisticsView({
  items,
  categories,
  monthDate,
  usePeriod,
  onToggleUsePeriod,
  onCellClick,
  displayMode,
  minVisibleHeight,
  bucketAccessor,
}: {
  items: Item[];
  categories: CategoryConfig[];
  monthDate: any;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
}) {
  const monthData = aggregateByMonth(items, categories, monthDate, usePeriod, bucketAccessor);
  const monthWeeksData = getMonthWeeksData(items, categories, monthDate, usePeriod, bucketAccessor);

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
            cellIdentifier={(goal: string) => ({
              type: 'month',
              month: monthDate.month() + 1,
              year: monthDate.year(),
              goal,
            })}
            displayMode={displayMode}
            minVisibleHeight={minVisibleHeight}
            bucketAccessor={bucketAccessor}
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
                label={`W${weekStart.isoWeek()}`}
                categories={categories}
                onCellClick={onCellClick}
                cellIdentifier={(goal: string) => ({
                  type: 'week',
                  week: weekStart.isoWeek(),
                  year: weekStart.isoWeekYear(),
                  goal,
                })}
                isCompact={true}
                displayMode={displayMode}
                minVisibleHeight={minVisibleHeight}
                bucketAccessor={bucketAccessor}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
