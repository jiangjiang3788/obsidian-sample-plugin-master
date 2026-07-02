import { dayjs, createPeriodData } from '@core/public';
import {
  getStatisticsGoalThemeSummaryLabel,
  getStatisticsGoalThemeSummaryRows,
  getStatisticsGoalThemeSummaryText,
  getStatisticsGoalThemeSummaryTitle,
} from '@/features/settings/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip';
import { buildMonthStatisticsRenderModel, buildMonthWeekMeta } from '@/features/settings/views/runtime/StatisticsView/views/MonthStatisticsViewModel';
import { buildQuarterStatisticsRenderModel, buildQuarterMonthWeekStarts } from '@/features/settings/views/runtime/StatisticsView/views/QuarterStatisticsViewModel';
import { buildYearStatisticsRenderModel, getYearStatisticsMaxWeeksInMonth } from '@/features/settings/views/runtime/StatisticsView/views/YearStatisticsViewModel';

const categories = [{ name: '目标' }] as any[];
const emptyYearData = {
  yearData: createPeriodData(categories),
  quartersData: Array.from({ length: 4 }, () => createPeriodData(categories)),
  monthsData: Array.from({ length: 12 }, () => createPeriodData(categories)),
  weeksData: Array.from({ length: 53 }, () => createPeriodData(categories)),
};

describe('Statistics period view models', () => {
  it('keeps goal/theme summary strip rules in one helper set', () => {
    const rows = getStatisticsGoalThemeSummaryRows([
      { goalPath: '工作/项目', themes: [{ themePath: 'A/B', label: 'B', count: 2 }] },
      { goalPath: '空', themes: [] },
    ]);
    expect(rows).toHaveLength(1);
    expect(getStatisticsGoalThemeSummaryLabel(rows[0].goalPath)).toBe('项目');
    expect(getStatisticsGoalThemeSummaryTitle(rows[0])).toBe('工作/项目: A/B 2');
    expect(getStatisticsGoalThemeSummaryText(rows[0])).toBe('B2');
  });

  it('builds month week metadata and render model', () => {
    const monthDate = dayjs('2026-06-15');
    const meta = buildMonthWeekMeta(monthDate);
    expect(meta.length).toBeGreaterThanOrEqual(5);

    const model = buildMonthStatisticsRenderModel({
      items: [],
      categories,
      monthDate,
      usePeriod: false,
    });
    expect(model.monthLabel).toBe('2026年06月');
    expect(model.monthIdentifier('目标')).toEqual({ type: 'month', month: 6, year: 2026, goal: '目标' });
    expect(model.gridTemplateColumns).toMatch(/^repeat\(/);
    expect(model.weeks[0].identifier('目标').type).toBe('week');
  });

  it('builds quarter month/week model with placeholders', () => {
    const quarterDate = dayjs('2026-05-01');
    const weekStarts = buildQuarterMonthWeekStarts(dayjs('2026-04-01'));
    expect(weekStarts.length).toBeGreaterThan(0);

    const model = buildQuarterStatisticsRenderModel({
      items: [],
      categories,
      quarterDate,
      usePeriod: false,
    });
    expect(model.quarterLabel).toBe('2026年 第2季度');
    expect(model.quarterIdentifier('目标')).toEqual({ type: 'quarter', quarter: 2, year: 2026, goal: '目标' });
    expect(model.months).toHaveLength(3);
    expect(model.months[0].gridColumn).toBe('1');
    expect(model.months[0].weeks[0].identifier('目标').type).toBe('week');
    expect(model.months.every((month) => month.placeholderCount >= 0)).toBe(true);
  });

  it('builds year render model without keeping grid math in the view', () => {
    const yearlyWeekStructure = [
      { month: 1, weeks: [1, 2, 3, 4, 5] },
      { month: 2, weeks: [6, 7, 8, 9] },
      { month: 3, weeks: [10, 11, 12, 13] },
    ];
    expect(getYearStatisticsMaxWeeksInMonth(yearlyWeekStructure)).toBe(5);

    const model = buildYearStatisticsRenderModel({
      year: 2026,
      categories,
      processedData: emptyYearData,
      yearlyWeekStructure,
    });
    expect(model.yearLabel).toBe('2026年');
    expect(model.quarters[1].gridColumn).toBe('4 / 7');
    expect(model.months[2].className).toContain('sv-quarter-end');
    expect(model.weekColumns[2].className).toContain('sv-quarter-end');
    expect(model.weekColumns[0].weeks[0].identifier('目标')).toEqual({ type: 'week', year: 2026, week: 1, goal: '目标' });
  });
});
