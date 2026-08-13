/** @jsxImportSource preact */
import { h } from 'preact';
import type { CategoryConfig } from '@core/view/public';
import type { RecordViewItem } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import { ChartBlock } from '../../components/statistics/ChartBlock';
import type { StatisticsCellClickHandler } from '../types';
import type { OpenRecordOriginHandler } from '@shared/types/public';
import { buildMonthStatisticsRenderModel } from './MonthStatisticsViewModel';
import { buildQuarterStatisticsRenderModel } from './QuarterStatisticsViewModel';
import { buildYearStatisticsRenderModel } from './YearStatisticsViewModel';

export interface PeriodChartBlockModel {
  key?: string; wrapperClassName?: string; style?: Record<string, string | number>;
  data: PeriodData; label: string; identifier: (goal: string) => unknown; isCompact?: boolean; level?: number;
}

export interface PeriodChartColumnModel {
  key: string; wrapperClassName: string; style?: Record<string, string | number>;
  blocks: PeriodChartBlockModel[]; level?: number;
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
  bucketAccessor?: (item: RecordViewItem) => string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
};

export function PeriodStatisticsView(props: PeriodStatisticsViewProps) {
  const { gridClassName, gridStyle, summary, blocks = [], columns = [], categories, onCellClick, displayMode, minVisibleHeight, bucketAccessor, onOpenRecordOrigin } = props;
  // Keep the complete time skeleton. Zero-data periods are meaningful comparison
  // slots and must render their label, zero counts and baseline instead of vanishing.
  const visibleBlocks = blocks;
  const visibleColumns = columns;

  const levelClass = (level = 0) => `sv-period-level sv-period-level--${Math.max(0, level)}`;
  const flowStyle = (style?: Record<string, string | number>) => style;
  const effectiveGridStyle = gridStyle;
  const renderChart = (block: PeriodChartBlockModel) => (
    <ChartBlock key={block.key} data={block.data} label={block.label} categories={categories} onCellClick={onCellClick} cellIdentifier={block.identifier} isCompact={block.isCompact} displayMode={displayMode} minVisibleHeight={minVisibleHeight} bucketAccessor={bucketAccessor} onOpenRecordOrigin={onOpenRecordOrigin} />
  );
  const renderBlock = (block: PeriodChartBlockModel) => (
    <div key={block.key} class={`${block.wrapperClassName || ''} ${levelClass(block.level)}`} style={flowStyle(block.style)}>{renderChart(block)}</div>
  );

  return (
    <div class="statistics-view think-viz-surface">
      <div class={`${gridClassName} sv-period-hierarchy`} style={effectiveGridStyle}>
        {renderBlock(summary)}
        {visibleBlocks.map(renderBlock)}
        {visibleColumns.map((column) => (
          <div key={column.key} class={`${column.wrapperClassName} ${levelClass(column.level)}`} style={flowStyle(column.style)}>
            {column.blocks.map(renderChart)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthStatisticsView(props: StatisticsCommonProps & { items: RecordViewItem[]; monthDate: unknown; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { items, categories, monthDate, usePeriod, bucketAccessor, ...common } = props;
  const model = buildMonthStatisticsRenderModel({ items, categories, monthDate, usePeriod, bucketAccessor });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-month-grid" gridStyle={{ gridTemplateColumns: model.gridTemplateColumns }} summary={{ wrapperClassName: 'sv-month-grid-summary', level: 0, data: model.monthData, label: model.monthLabel, identifier: model.monthIdentifier }} blocks={model.weeks.map((week) => ({ key: week.key, wrapperClassName: 'sv-month-grid-week', level: 1, style: { gridColumn: week.gridColumn }, data: week.data, label: week.label, identifier: week.identifier, isCompact: true }))} />;
}

export function QuarterStatisticsView(props: StatisticsCommonProps & { items: RecordViewItem[]; quarterDate: unknown; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { items, categories, quarterDate, usePeriod, bucketAccessor, ...common } = props;
  const model = buildQuarterStatisticsRenderModel({ items, categories, quarterDate, usePeriod, bucketAccessor });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-quarter-grid" summary={{ wrapperClassName: 'sv-quarter-grid-summary', level: 0, data: model.quarterData, label: model.quarterLabel, identifier: model.quarterIdentifier }} blocks={model.months.map((month) => ({ key: month.key, wrapperClassName: 'sv-quarter-grid-month', level: 1, style: { gridColumn: month.gridColumn }, data: month.data, label: month.label, identifier: month.identifier }))} columns={model.months.map((month) => ({ key: `w-col-${month.key}`, wrapperClassName: 'sv-quarter-grid-week-col', level: 2, style: { gridColumn: month.gridColumn }, blocks: month.weeks.map((week) => ({ key: week.key, data: week.data, label: week.label, identifier: week.identifier, isCompact: true })) }))} />;
}

export function YearStatisticsView(props: StatisticsCommonProps & { year: number; processedData: { yearData: PeriodData; quartersData: PeriodData[]; monthsData: PeriodData[]; weeksData: PeriodData[] }; yearlyWeekStructure: { month: number; weeks: number[] }[]; usePeriod: boolean; onToggleUsePeriod: (next: boolean) => void }) {
  const { year, categories, processedData, yearlyWeekStructure, bucketAccessor, ...common } = props;
  const model = buildYearStatisticsRenderModel({ year, categories, processedData, yearlyWeekStructure });
  return <PeriodStatisticsView {...common} categories={categories} bucketAccessor={bucketAccessor} gridClassName="sv-year-grid" summary={{ wrapperClassName: 'sv-year-grid-year', level: 0, data: processedData.yearData, label: model.yearLabel, identifier: model.yearIdentifier }} blocks={[...model.quarters.map((quarter) => ({ key: quarter.key, wrapperClassName: 'sv-year-grid-quarter', level: 1, style: { gridColumn: quarter.gridColumn }, data: quarter.data, label: quarter.label, identifier: quarter.identifier })), ...model.months.map((month) => ({ key: month.key, wrapperClassName: month.className, level: 2, style: { gridColumn: month.gridColumn }, data: month.data, label: month.label, identifier: month.identifier }))]} columns={model.weekColumns.map((column) => ({ key: column.key, wrapperClassName: column.className, level: 3, style: { gridColumn: column.gridColumn }, blocks: column.weeks.map((week) => ({ key: week.key, data: week.data, label: week.label, identifier: week.identifier, isCompact: true })) }))} />;
}
