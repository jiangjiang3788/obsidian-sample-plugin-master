/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F085/unit
 */
import { dayjs, createPeriodData } from '@core/public';
import {
  buildStatisticsGoalBuckets, buildStatisticsProcessedData, buildStatisticsViewConfig, buildYearlyWeekStructure,
  getStatisticsPopoverWidgetId, isSameStatisticsCell, isStatisticsYearView, resolveStatisticsBucketAccessor, resolveStatisticsYear,
} from '@/features/views/runtime/StatisticsView/StatisticsViewModel';
import { buildMonthStatisticsRenderModel, buildMonthWeekMeta } from '@/features/views/runtime/StatisticsView/views/MonthStatisticsViewModel';
import { buildQuarterStatisticsRenderModel, buildQuarterMonthWeekStarts } from '@/features/views/runtime/StatisticsView/views/QuarterStatisticsViewModel';
import { buildYearStatisticsRenderModel, getYearStatisticsMaxWeeksInMonth } from '@/features/views/runtime/StatisticsView/views/YearStatisticsViewModel';

const goalItems = [
  { id:'1', title:'A', recordType:'task', goalPath:'项目/目标A', date:'2026-01-05', extra:{}, tags:[], content:'', created:0, modified:0 },
  { id:'2', title:'B', recordType:'event', goalPath:'项目/目标B', date:'2026-01-06', extra:{}, tags:[], content:'', created:0, modified:0 },
];
const categories=[{name:'目标',color:'#000000',files:[]}];
const emptyYearData={ yearData:createPeriodData(categories), quartersData:Array.from({length:4},()=>createPeriodData(categories)), monthsData:Array.from({length:12},()=>createPeriodData(categories)), weeksData:Array.from({length:53},()=>createPeriodData(categories)) };

describe('Statistics view models', () => {
  it('uses Goal as the statistics grouping dimension', () => {
    expect(buildStatisticsViewConfig({viewConfig:{}} as never).groupBy).toBe('goal');
    expect(buildStatisticsGoalBuckets({items:goalItems as never,goals:[]}).map((b) => b.name)).toEqual(['项目']);
    expect(resolveStatisticsBucketAccessor([])(goalItems[0] as never)).toBe('项目');
  });
  it('derives config, year flags and processed-data fallbacks', () => {
    expect(buildStatisticsViewConfig({id:'v1',viewConfig:{displayMode:'compact'}} as never).displayMode).toBe('compact');
    expect(isStatisticsYearView('年')).toBe(true); expect(isStatisticsYearView('月')).toBe(false); expect(resolveStatisticsYear({year:()=>2026} as never)).toBe(2026);
    expect(getStatisticsPopoverWidgetId('abc')).toBe('stats-popover-abc'); expect(isSameStatisticsCell({a:1},{a:1})).toBe(true);
    expect(buildYearlyWeekStructure(2026,false)).toEqual([]); expect(buildYearlyWeekStructure(2026,true).flatMap(m=>m.weeks).length).toBeGreaterThan(50);
    const processed=buildStatisticsProcessedData({isYearView:false,items:[],year:2026,filteredCategories:categories,usePeriod:false});
    expect(processed.quartersData).toEqual([]); expect(processed.monthsData).toEqual([]); expect(processed.weeksData).toEqual([]);
  });
  it('rolls child Goal paths into one root overview bucket', () => {
    const more = [...goalItems, { ...goalItems[0], id: '3', goalPath: '另一个根/子目标' }];
    expect(buildStatisticsGoalBuckets({ items: more as never, goals: [] }).map((bucket) => bucket.name)).toEqual(['另一个根', '项目']);
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
