import {
  buildTimelineColorMap,
  buildTimelineRenderModel,
  resolveTimelineConfig,
  resolveTimelineTasks,
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
        timelineTasks: [{ doneDate: '2026-06-01' } as any],
        summaryCategoryHours: { work: 2 },
        dailyViewData: { dateRangeDays: [], blocksByDay: {} },
      },
    });

    expect(renderModel.timelineTasks).toHaveLength(1);
    expect(renderModel.summaryCategoryHours).toEqual({ work: 2 });
    expect(renderModel.totalSummaryHours).toBe(2);
    expect(renderModel.dailyViewData).toEqual({ dateRangeDays: [], blocksByDay: {} });
  });


  it('projects a manual Task start/end range when no TaskSession exists', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
      schemaVersion: 2,
      coreBlock: 'task',
      status: 'done',
      content: '个地方官方',
      title: '个地方官方',
      tags: [],
      categoryKey: '任务',
      created: 0,
      modified: 0,
      extra: {},
      startAt: '2026-08-14T16:45',
      endAt: '2026-08-14T17:35',
      expectedDurationMinutes: 50,
      filename: '目标.md',
      file: { path: '01/目标.md', basename: '目标.md' },
    } as any;

    const result = resolveTimelineTasks([task], [task]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: task.id,
      taskRecordId: task.id,
      timelineSource: 'task-range',
      actualStartDate: '2026-08-14',
      startTime: '16:45',
      endTime: '17:35',
      duration: 50,
    });
    expect(result[0].sessionRecordId).toBeUndefined();
  });

  it('projects an open Task range too because lifecycle status does not control timeline visibility', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YB', schemaVersion: 2, coreBlock: 'task', status: 'open',
      content: '未完成但已经记录时间', title: '未完成但已经记录时间', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, startAt: '2026-08-14T10:00', expectedDurationMinutes: 30,
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;

    const result = resolveTimelineTasks([task], [task]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ timelineSource: 'task-range', startTime: '10:00', endTime: '10:30', duration: 30 });
  });

  it('prefers TaskSession history over the Task manual range to avoid duplicate timeline blocks', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YC', schemaVersion: 2, coreBlock: 'task', status: 'done',
      content: '有 session 的任务', title: '有 session 的任务', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, startAt: '2026-08-14T16:45', endAt: '2026-08-14T17:35',
      expectedDurationMinutes: 50, filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7YD', schemaVersion: 2, coreBlock: 'task-session',
      taskId: task.id, sessionStartedAt: '2026-08-14T16:50:00', sessionEndedAt: '2026-08-14T17:20:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timer',
      title: '', content: '', tags: [], categoryKey: '任务工作块', created: 0, modified: 0, extra: {},
    } as any;

    const result = resolveTimelineTasks([task], [task, session]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: session.id,
      sessionRecordId: session.id,
      taskRecordId: task.id,
      timelineSource: 'task-session',
      startTime: '16:50',
      endTime: '17:20',
      duration: 30,
    });
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
