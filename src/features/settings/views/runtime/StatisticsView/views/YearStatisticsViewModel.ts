import type { CategoryConfig } from '@core/view/public';
import type { PeriodData } from '@core/utils/public';
import { createPeriodData } from '@core/utils/public';
import type { StatisticsYearlyWeekMonth } from '../StatisticsViewModel';

export interface YearStatisticsQuarterModel {
  key: string;
  gridColumn: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'quarter'; year: number; quarter: number; goal: string };
}

export interface YearStatisticsMonthModel {
  key: string;
  className: string;
  gridColumn: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'month'; year: number; month: number; goal: string };
}

export interface YearStatisticsWeekModel {
  key: string;
  label: string;
  data: PeriodData;
  identifier: (goal: string) => { type: 'week'; year: number; week: number; goal: string };
}

export interface YearStatisticsWeekColumnModel {
  key: string;
  className: string;
  gridColumn: string;
  weeks: YearStatisticsWeekModel[];
  placeholderCount: number;
}

export interface YearStatisticsRenderModel {
  yearLabel: string;
  yearIdentifier: (goal: string) => { type: 'year'; year: number; goal: string };
  quarters: YearStatisticsQuarterModel[];
  months: YearStatisticsMonthModel[];
  weekColumns: YearStatisticsWeekColumnModel[];
}

export function getYearStatisticsMaxWeeksInMonth(yearlyWeekStructure: StatisticsYearlyWeekMonth[]): number {
  return Math.max(...yearlyWeekStructure.map(({ weeks }) => weeks.length), 1);
}

export function buildYearStatisticsRenderModel(input: {
  year: number;
  categories: CategoryConfig[];
  processedData: {
    yearData: PeriodData;
    quartersData: PeriodData[];
    monthsData: PeriodData[];
    weeksData: PeriodData[];
  };
  yearlyWeekStructure: StatisticsYearlyWeekMonth[];
}): YearStatisticsRenderModel {
  const { year, categories, processedData, yearlyWeekStructure } = input;
  const maxWeeksInMonth = getYearStatisticsMaxWeeksInMonth(yearlyWeekStructure);

  return {
    yearLabel: `${year}年`,
    yearIdentifier: (goal: string) => ({ type: 'year', year, goal }),
    quarters: processedData.quartersData.map((data, index) => ({
      key: `q${index}`,
      gridColumn: `${index * 3 + 1} / ${index * 3 + 4}`,
      label: `Q${index + 1}`,
      data,
      identifier: (goal: string) => ({ type: 'quarter', year, quarter: index + 1, goal }),
    })),
    months: processedData.monthsData.map((data, index) => ({
      key: `m${index}`,
      className: `sv-year-grid-month${(index % 3 === 2 && index < 11) ? ' sv-quarter-end' : ''}`,
      gridColumn: `${index + 1}`,
      label: `${index + 1}月`,
      data,
      identifier: (goal: string) => ({ type: 'month', year, month: index + 1, goal }),
    })),
    weekColumns: yearlyWeekStructure.map(({ month, weeks }) => {
      const isQuarterEnd = (month % 3 === 0) && month < 12;
      return {
        key: `w-col-${month}`,
        className: `sv-year-grid-week-col${isQuarterEnd ? ' sv-quarter-end' : ''}`,
        gridColumn: `${month}`,
        weeks: weeks.map((week) => {
          const weekIndex = week - 1;
          const data = processedData.weeksData[weekIndex] || createPeriodData(categories);
          return {
            key: `${week}`,
            label: `${week}W`,
            data,
            identifier: (goal: string) => ({ type: 'week', year, week, goal }),
          };
        }),
        placeholderCount: Math.max(maxWeeksInMonth - weeks.length, 0),
      };
    }),
  };
}
