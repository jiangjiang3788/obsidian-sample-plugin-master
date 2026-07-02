/** @jsxImportSource preact */
import { h } from 'preact';
import type { CategoryConfig } from '@core/view/public';
import type { Item } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import { ChartBlock } from '../../components/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import { buildMonthStatisticsRenderModel } from './MonthStatisticsViewModel';
import { buildQuarterStatisticsRenderModel } from './QuarterStatisticsViewModel';
import { buildYearStatisticsRenderModel } from './YearStatisticsViewModel';

export interface PeriodChartBlockModel {
  key?: string; wrapperClassName?: string; style?: Record<string, string | number>;
  data: PeriodData; label: string; identifier: (goal: string) => unknown; isCompact?: boolean;
}

export interface PeriodChartColumnModel {
  key: string; wrapperClassName: string; style?: Record<string, string | number>;
  blocks: PeriodChartBlockModel[]; placeholderCount?: number;
}

interface PeriodStatisticsViewProps extends StatisticsCommonProps {
  gridClassName: string; gridStyle?: Record<string, string | number>;
  summary: PeriodChartBlockModel; blocks?: PeriodChartBlockModel[]; columns?: PeriodChartColumnModel[];
}

type StatisticsCommonProps = {
  categories: CategoryConfig[];
  onCellClick: StatisticsCellClickHandler;
  displayMode: 'smart' | 'linear' | 'logarithmic';
  minVisibleHeight: number;
  bucketAccessor?: (item: Item) => string;
};

export function PeriodStatisticsView(props: PeriodStatisticsViewProps) {
  const { gridClassName, gridStyle, summary, blocks = [], columns = [], categories, onCellClick, displayMode, minVisibleHeight, bucketAccessor } = props;
  const renderChart = (block: PeriodChartBlockModel) => (
    <ChartBlock key={block.key} data={block.data} label={block.label} categories={categories} onCellClick={onCellClick} cellIdentifier={block.identifier} isCompact={block.isCompact} displayMode={displayMode} minVisibleHeight={minVisibleHeight} bucketAccessor={bucketAccessor} />
  );
  const renderBlock = (block: PeriodChartBlockModel) => <div key={block.key} class={block.wrapperClassName} style={block.style}>{renderChart(block)}</div>;

  return (
    <div class="statistics-view">
      <div class={gridClassName} style={gridStyle}>
        {renderBlock(summary)}
        {blocks.map(renderBlock)}
        {columns.map((column) => (
          <div key={column.key} class={column.wrapperClassName} style={column.style}>
            {column.blocks.map(renderChart)}
            {Array.from({ length: column.placeholderCount ?? 0 }, (_, index) => <div key={`pad-${index}`} class="sv-week-placeholder" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthStatisticsView(props: StatisticsCommonProps & { items: Item[]; monthDate: unknown; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { items, categories, monthDate, usePeriod, bucketAccessor, ...common } = props;
  const model = buildMonthStatisticsRenderModel({ items, categories, monthDate, usePeriod, bucketAccessor });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-month-grid" gridStyle={{ gridTemplateColumns: model.gridTemplateColumns }} summary={{ wrapperClassName: 'sv-month-grid-summary', data: model.monthData, label: model.monthLabel, identifier: model.monthIdentifier }} blocks={model.weeks.map((week) => ({ key: week.key, wrapperClassName: 'sv-month-grid-week', style: { gridColumn: week.gridColumn }, data: week.data, label: week.label, identifier: week.identifier, isCompact: true }))} />;
}

export function QuarterStatisticsView(props: StatisticsCommonProps & { items: Item[]; quarterDate: unknown; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { items, categories, quarterDate, usePeriod, bucketAccessor, ...common } = props;
  const model = buildQuarterStatisticsRenderModel({ items, categories, quarterDate, usePeriod, bucketAccessor });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-quarter-grid" summary={{ wrapperClassName: 'sv-quarter-grid-summary', data: model.quarterData, label: model.quarterLabel, identifier: model.quarterIdentifier }} blocks={model.months.map((month) => ({ key: month.key, wrapperClassName: 'sv-quarter-grid-month', style: { gridColumn: month.gridColumn }, data: month.data, label: month.label, identifier: month.identifier }))} columns={model.months.map((month) => ({ key: `w-col-${month.key}`, wrapperClassName: 'sv-quarter-grid-week-col', style: { gridColumn: month.gridColumn }, blocks: month.weeks.map((week) => ({ key: week.key, data: week.data, label: week.label, identifier: week.identifier, isCompact: true })), placeholderCount: month.placeholderCount }))} />;
}

export function YearStatisticsView(props: StatisticsCommonProps & { year: number; processedData: { yearData: PeriodData; quartersData: PeriodData[]; monthsData: PeriodData[]; weeksData: PeriodData[] }; yearlyWeekStructure: { month: number; weeks: number[] }[]; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { year, categories, processedData, yearlyWeekStructure, bucketAccessor, ...common } = props;
  const model = buildYearStatisticsRenderModel({ year, categories, processedData, yearlyWeekStructure });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-year-grid" summary={{ wrapperClassName: 'sv-year-grid-year', data: processedData.yearData, label: model.yearLabel, identifier: model.yearIdentifier }} blocks={[...model.quarters.map((quarter) => ({ key: quarter.key, wrapperClassName: 'sv-year-grid-quarter', style: { gridColumn: quarter.gridColumn }, data: quarter.data, label: quarter.label, identifier: quarter.identifier })), ...model.months.map((month) => ({ key: month.key, wrapperClassName: month.className, style: { gridColumn: month.gridColumn }, data: month.data, label: month.label, identifier: month.identifier }))]} columns={model.weekColumns.map((column) => ({ key: column.key, wrapperClassName: column.className, style: { gridColumn: column.gridColumn }, blocks: column.weeks.map((week) => ({ key: week.key, data: week.data, label: week.label, identifier: week.identifier, isCompact: true })), placeholderCount: column.placeholderCount }))} />;
}
