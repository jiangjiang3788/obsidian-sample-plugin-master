import {
  dayjs,
  getMondayByWeek,
  getWeekNumber,
  getWeekRangeStr,
  getWeeksInYear,
} from '@core/utils/public';

export type TimeNavigatorView = '年' | '季' | '月' | '周';

export interface TimeNavigatorSelection {
  todayYear: number;
  todayWeek: number;
  selectedYear: number;
  selectedWeek: number;
  selectedMonth: number;
  selectedQuarter: number;
  totalWeeksInYear: number;
}

export interface TimeNavigatorMonthCell {
  month: number;
  isSelected: boolean;
  isBeforeSelection: boolean;
}

export interface TimeNavigatorQuarterBlock {
  quarter: number;
  isSelected: boolean;
  isBeforeSelection: boolean;
  months: TimeNavigatorMonthCell[];
}

export interface TimeNavigatorWeekCell {
  week: number;
  className: string;
  title: string;
  endOfWeek: dayjs.Dayjs;
}

export function buildTimeNavigatorSelection(currentDate: dayjs.Dayjs, today: dayjs.Dayjs = dayjs()): TimeNavigatorSelection {
  const selectedYear = currentDate.year();

  return {
    todayYear: today.year(),
    todayWeek: getWeekNumber(today),
    selectedYear,
    selectedWeek: getWeekNumber(currentDate),
    selectedMonth: currentDate.month() + 1,
    selectedQuarter: currentDate.quarter(),
    totalWeeksInYear: getWeeksInYear(selectedYear),
  };
}

export function buildTimeNavigatorQuarterBlocks(selection: Pick<TimeNavigatorSelection, 'selectedQuarter' | 'selectedMonth'>): TimeNavigatorQuarterBlock[] {
  return Array.from({ length: 4 }, (_, index) => {
    const quarter = index + 1;
    return {
      quarter,
      isSelected: quarter <= selection.selectedQuarter,
      isBeforeSelection: quarter < selection.selectedQuarter,
      months: Array.from({ length: 3 }, (_, monthIndex) => {
        const month = (quarter - 1) * 3 + monthIndex + 1;
        return {
          month,
          isSelected: month <= selection.selectedMonth,
          isBeforeSelection: month < selection.selectedMonth,
        };
      }),
    };
  });
}

export function buildTimeNavigatorCellClass(baseClassName: string, flags: Array<[boolean, string]>): string {
  return [baseClassName, ...flags.map(([enabled, className]) => (enabled ? className : ''))]
    .filter(Boolean)
    .join(' ');
}

export function buildTimeNavigatorWeekCells(selection: TimeNavigatorSelection): TimeNavigatorWeekCell[] {
  return Array.from({ length: selection.totalWeeksInYear }, (_, index) => {
    const week = index + 1;
    const cellMonday = getMondayByWeek(selection.selectedYear, week);
    const isSelected = week <= selection.selectedWeek;
    const isToday = selection.selectedYear === selection.todayYear && week === selection.todayWeek;
    const isBeforeSelection = week < selection.selectedWeek;

    return {
      week,
      className: buildTimeNavigatorCellClass('tn-cell tn-week-cell', [
        [isSelected, 'is-selected'],
        [isToday, 'is-today'],
        [isBeforeSelection && !isSelected, 'is-before-selection'],
      ]),
      title: `${week}周 (${getWeekRangeStr(cellMonday)})`,
      endOfWeek: cellMonday.endOf('isoWeek'),
    };
  });
}

export function buildTimeNavigatorYearTarget(selectedYear: number): dayjs.Dayjs {
  return dayjs().year(selectedYear).endOf('year');
}

export function buildTimeNavigatorQuarterTarget(selectedYear: number, quarter: number): dayjs.Dayjs {
  return dayjs().year(selectedYear).quarter(quarter).endOf('quarter');
}

export function buildTimeNavigatorMonthTarget(selectedYear: number, month: number): dayjs.Dayjs {
  return dayjs().year(selectedYear).month(month - 1).endOf('month');
}
