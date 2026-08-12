import {
  buildTimelineColorMap,
  buildTimelineRenderModel,
  resolveTimelineConfig,
} from '@/features/views/runtime/TimelineView/TimelineViewModel';
import {
  buildTimelineDayColumns,
  buildTimelineTimeAxisRows,
} from '@/features/views/runtime/TimelineView/TimelineDailyViewModel';

const moduleConfig = {
  viewConfig: {
    UNTRACKED_LABEL: '未跟踪',
    MAX_HOURS_PER_DAY: 12,
    defaultHourHeight: 28,
    progressOrder: ['work'],
    categories: {
      work: { color: '#111111' },
    },
  },
};

describe('TimelineViewModel', () => {
  it('resolves config and color map with injected model precedence', () => {
    expect(resolveTimelineConfig(moduleConfig).MAX_HOURS_PER_DAY).toBe(12);
    expect(resolveTimelineConfig(moduleConfig, { config: { injected: true } as any })).toEqual({ injected: true });
    expect(buildTimelineColorMap(resolveTimelineConfig(moduleConfig))).toEqual({ work: '#111111', 未跟踪: '#9ca3af' });
  });


  it('builds a render model that respects injected timeline data', () => {
    const renderModel = buildTimelineRenderModel({
      items: [],
      module: moduleConfig,
      dateRange: [new Date('2026-06-01'), new Date('2026-06-02')],
      currentView: '月',
      injectedModel: {
        timelineTasks: [{ doneDate: '2026-06-01' }],
        summaryCategoryHours: { work: 2 },
        dailyViewData: { dateRangeDays: [], blocksByDay: {} },
      },
    });

    expect(renderModel.timelineTasks).toHaveLength(1);
    expect(renderModel.summaryCategoryHours).toEqual({ work: 2 });
    expect(renderModel.totalSummaryHours).toBe(2);
    expect(renderModel.dailyViewData).toEqual({ dateRangeDays: [], blocksByDay: {} });
  });

  it('builds daily columns and time-axis rows', () => {
    const day = { format: () => '2026-06-01' };
    expect(buildTimelineDayColumns({ dateRangeDays: [day], blocksByDay: {} } as any)).toEqual([
      { day: '2026-06-01', blocks: [] },
    ]);
    expect(buildTimelineTimeAxisRows(4, 24)).toEqual([
      { hour: 0, label: '', height: '24px' },
      { hour: 1, label: '', height: '24px' },
      { hour: 2, label: '2:00', height: '24px' },
      { hour: 3, label: '', height: '24px' },
      { hour: 4, label: '4:00', height: '24px' },
    ]);
  });

});
