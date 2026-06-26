import {
  buildTimelineColorMap,
  buildTimelineDailyViewData,
  buildTimelineRenderModel,
  buildTimelineSummaryCategoryHours,
  isTimelineSummaryView,
  resolveTimelineConfig,
  sumTimelineSummaryHours,
} from '@/shared/ui/views/TimelineView/TimelineViewModel';

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

  it('handles summary and daily mode branches', () => {
    expect(isTimelineSummaryView('年')).toBe(true);
    expect(isTimelineSummaryView('月')).toBe(false);
    expect(isTimelineSummaryView('月', { isSummaryView: true })).toBe(true);

    const daily = buildTimelineDailyViewData({
      timelineTasks: [],
      dateRange: [new Date('2026-06-01'), new Date('2026-06-02')],
      isSummaryView: true,
    });
    expect(daily).toBeNull();

    expect(buildTimelineSummaryCategoryHours({
      timelineTasks: [],
      dateRange: [new Date('2026-06-01'), new Date('2026-06-02')],
      config: resolveTimelineConfig(moduleConfig),
      isSummaryView: true,
    })).toEqual({});
    expect(sumTimelineSummaryHours({ a: 1, b: 2 })).toBe(3);
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
});
