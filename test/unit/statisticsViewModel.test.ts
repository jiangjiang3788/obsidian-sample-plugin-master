import { dayjs, createPeriodData } from '@core/public';
import {
  buildStatisticsGoalBuckets, buildStatisticsProcessedData, buildStatisticsViewConfig, buildYearlyWeekStructure,
  getStatisticsPopoverWidgetId, isSameStatisticsCell, isStatisticsYearView, resolveStatisticsBucketAccessor, resolveStatisticsYear,
} from '@/features/views/runtime/StatisticsView/StatisticsViewModel';
import { getStatisticsGoalThemeSummaryLabel, getStatisticsGoalThemeSummaryRows, getStatisticsGoalThemeSummaryText, getStatisticsGoalThemeSummaryTitle } from '@/features/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip';
import { buildMonthStatisticsRenderModel, buildMonthWeekMeta } from '@/features/views/runtime/StatisticsView/views/MonthStatisticsViewModel';
import { buildQuarterStatisticsRenderModel, buildQuarterMonthWeekStarts } from '@/features/views/runtime/StatisticsView/views/QuarterStatisticsViewModel';
import { buildYearStatisticsRenderModel, getYearStatisticsMaxWeeksInMonth } from '@/features/views/runtime/StatisticsView/views/YearStatisticsViewModel';

const goalItems: any[] = [
  { id:'1', title:'A', categoryKey:'任务', coreBlock:'task', goalPaths:['项目/目标A'], goalPath:'项目/目标A', date:'2026-01-05', extra:{}, tags:[], content:'', created:0, modified:0 },
  { id:'2', title:'B', categoryKey:'事件', coreBlock:'evidence', goalPaths:['项目/目标B'], goalPath:'项目/目标B', date:'2026-01-06', extra:{}, tags:[], content:'', created:0, modified:0 },
];
const categories=[{name:'目标'}] as any[];
const emptyYearData={ yearData:createPeriodData(categories), quartersData:Array.from({length:4},()=>createPeriodData(categories)), monthsData:Array.from({length:12},()=>createPeriodData(categories)), weeksData:Array.from({length:53},()=>createPeriodData(categories)) };

describe('Statistics view models', () => {
  it('uses Goal as the statistics grouping dimension', () => {
    expect(buildStatisticsViewConfig({viewConfig:{}} as any).groupBy).toBe('goal');
    expect(buildStatisticsGoalBuckets({items:goalItems as any,goals:[]}).map((b:any)=>b.name).sort()).toEqual(['项目/目标A','项目/目标B']);
    expect(resolveStatisticsBucketAccessor([])(goalItems[0] as any)).toBe('项目/目标A');
  });
  it('derives config, year flags and processed-data fallbacks', () => {
    expect(buildStatisticsViewConfig({id:'v1',viewConfig:{displayMode:'compact'}} as any).displayMode).toBe('compact');
    expect(isStatisticsYearView('年')).toBe(true); expect(isStatisticsYearView('月')).toBe(false); expect(resolveStatisticsYear({year:()=>2026} as any)).toBe(2026);
    expect(getStatisticsPopoverWidgetId('abc')).toBe('stats-popover-abc'); expect(isSameStatisticsCell({a:1},{a:1})).toBe(true);
    expect(buildYearlyWeekStructure(2026,false)).toEqual([]); expect(buildYearlyWeekStructure(2026,true).flatMap(m=>m.weeks).length).toBeGreaterThan(50);
    const processed=buildStatisticsProcessedData({isYearView:false,items:[],year:2026,filteredCategories:[{name:'目标'}],usePeriod:false});
    expect(processed.quartersData).toEqual([]); expect(processed.monthsData).toEqual([]); expect(processed.weeksData).toEqual([]);
  });
  it('keeps goal/theme summary helpers together', () => {
    const rows=getStatisticsGoalThemeSummaryRows([{goalPath:'工作/项目',themes:[{themePath:'A/B',label:'B',count:2}]},{goalPath:'空',themes:[]}]);
    expect(rows).toHaveLength(1); expect(getStatisticsGoalThemeSummaryLabel(rows[0].goalPath)).toBe('项目'); expect(getStatisticsGoalThemeSummaryTitle(rows[0])).toBe('工作/项目: A/B 2'); expect(getStatisticsGoalThemeSummaryText(rows[0])).toBe('B2');
  });
  it('builds month and quarter period render models', () => {
    const monthDate=dayjs('2026-06-15'); expect(buildMonthWeekMeta(monthDate).length).toBeGreaterThanOrEqual(5);
    const month=buildMonthStatisticsRenderModel({items:[],categories,monthDate,usePeriod:false}); expect(month.monthLabel).toBe('2026年06月'); expect(month.monthIdentifier('目标')).toEqual({type:'month',month:6,year:2026,goal:'目标'});
    const quarterDate=dayjs('2026-05-01'); expect(buildQuarterMonthWeekStarts(dayjs('2026-04-01')).length).toBeGreaterThan(0);
    const quarter=buildQuarterStatisticsRenderModel({items:[],categories,quarterDate,usePeriod:false}); expect(quarter.quarterLabel).toBe('2026年 第2季度'); expect(quarter.months).toHaveLength(3); expect(quarter.months.every(m=>m.placeholderCount>=0)).toBe(true);
  });
  it('builds year render model without view-owned grid math', () => {
    const structure=[{month:1,weeks:[1,2,3,4,5]},{month:2,weeks:[6,7,8,9]},{month:3,weeks:[10,11,12,13]}];
    expect(getYearStatisticsMaxWeeksInMonth(structure)).toBe(5);
    const model=buildYearStatisticsRenderModel({year:2026,categories,processedData:emptyYearData,yearlyWeekStructure:structure});
    expect(model.yearLabel).toBe('2026年'); expect(model.quarters[1].gridColumn).toBe('4 / 7'); expect(model.months[2].className).toContain('sv-quarter-end'); expect(model.weekColumns[0].weeks[0].identifier('目标')).toEqual({type:'week',year:2026,week:1,goal:'目标'});
  });
});
