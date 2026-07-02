import {
  buildTimeNavigatorCellClass,
  buildTimeNavigatorQuarterBlocks,
  buildTimeNavigatorSelection,
  buildTimeNavigatorWeekCells,
} from '@/features/settings/views/runtime/TimeNavigatorModel';
import { dayjs } from '@core/public';

describe('TimeNavigatorModel', () => {
  it('builds selected year/month/quarter/week facts', () => {
    const selection = buildTimeNavigatorSelection(dayjs('2026-06-26'), dayjs('2026-06-20'));
    expect(selection.selectedYear).toBe(2026);
    expect(selection.selectedMonth).toBe(6);
    expect(selection.selectedQuarter).toBe(2);
    expect(selection.totalWeeksInYear).toBeGreaterThan(50);
  });

  it('builds quarter and month cells without view state', () => {
    const quarters = buildTimeNavigatorQuarterBlocks({ selectedQuarter: 2, selectedMonth: 5 });
    expect(quarters).toHaveLength(4);
    expect(quarters[0]).toMatchObject({ quarter: 1, isSelected: true, isBeforeSelection: true });
    expect(quarters[1].months.map((cell) => cell.month)).toEqual([4, 5, 6]);
    expect(quarters[1].months[2].isSelected).toBe(false);
  });

  it('builds stable class names and week cells', () => {
    expect(buildTimeNavigatorCellClass('cell', [[true, 'active'], [false, 'hidden']])).toBe('cell active');
    const weekCells = buildTimeNavigatorWeekCells({
      todayYear: 2026,
      todayWeek: 2,
      selectedYear: 2026,
      selectedWeek: 3,
      selectedMonth: 1,
      selectedQuarter: 1,
      totalWeeksInYear: 4,
    });
    expect(weekCells).toHaveLength(4);
    expect(weekCells[1].className).toContain('is-today');
    expect(weekCells[2].className).toContain('is-selected');
  });
});
