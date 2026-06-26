import {
  buildStatisticsProcessedData,
  buildStatisticsViewConfig,
  buildYearlyWeekStructure,
  getStatisticsPopoverWidgetId,
  isSameStatisticsCell,
  isStatisticsYearView,
  resolveStatisticsYear,
} from '@/shared/ui/views/StatisticsView/StatisticsViewModel';

describe('StatisticsViewModel', () => {
  it('derives config, year flags and popover keys', () => {
    expect(buildStatisticsViewConfig({ id: 'v1', viewConfig: { displayMode: 'compact' } } as any).displayMode).toBe('compact');
    expect(isStatisticsYearView('年')).toBe(true);
    expect(isStatisticsYearView('月')).toBe(false);
    expect(resolveStatisticsYear({ year: () => 2026 } as any)).toBe(2026);
    expect(getStatisticsPopoverWidgetId('abc')).toBe('stats-popover-abc');
    expect(isSameStatisticsCell({ a: 1 }, { a: 1 })).toBe(true);
  });

  it('builds fallback week structure and non-year processed data', () => {
    expect(buildYearlyWeekStructure(2026, false)).toEqual([]);
    const weeks = buildYearlyWeekStructure(2026, true).flatMap(month => month.weeks);
    expect(weeks.length).toBeGreaterThan(50);

    const processed = buildStatisticsProcessedData({
      isYearView: false,
      items: [],
      year: 2026,
      filteredCategories: [{ name: '目标' }],
      usePeriod: false,
    });
    expect(processed.quartersData).toEqual([]);
    expect(processed.monthsData).toEqual([]);
    expect(processed.weeksData).toEqual([]);
  });
});
