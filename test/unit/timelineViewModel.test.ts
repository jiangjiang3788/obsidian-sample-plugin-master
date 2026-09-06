/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 */
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
import { buildDailyViewData } from '@core/utils/public';
import type { RecordViewItem, TimelineTask } from '@core/types/public';

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
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YB', coreBlock: 'task', status: 'open',
      content: '未完成但已经记录时间', title: '未完成但已经记录时间', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, startAt: '2026-08-14T10:00', expectedDurationMinutes: 30,
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;

    const result = resolveTimelineTasks([task], [task]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ timelineSource: 'task-range', startTime: '10:00', endTime: '10:30', duration: 30 });
  });

  it('keeps a start-only unfinished Task visible as a zero-duration point marker', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YP', coreBlock: 'task', status: 'open',
      content: '只计划了开始时间', title: '只计划了开始时间', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, startAt: '2026-08-14T11:20',
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;

    const result = resolveTimelineTasks([task], [task]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      timelineSource: 'task-point',
      startTime: '11:20',
      duration: 0,
      startMinute: 680,
      endMinute: 680,
      status: 'open',
    });

    const renderModel = buildTimelineRenderModel({
      items: [task], records: [task], module: moduleConfig,
      dateRange: [new Date('2026-08-14T00:00:00'), new Date('2026-08-14T23:59:59')],
      currentView: '天',
    });
    expect(renderModel.dailyViewData?.blocksByDay['2026-08-14']?.[0]).toMatchObject({
      timelineSource: 'task-point',
      blockStartMinute: 680,
      blockEndMinute: 680,
    });
    expect(renderModel.summaryCategoryHours).toMatchObject({ 未跟踪: 24 });
    expect(renderModel.totalSummaryHours).toBe(24);
  });

  it('prefers TaskSession history over the Task manual range to avoid duplicate timeline blocks', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YC', coreBlock: 'task', status: 'done',
      content: '有 session 的任务', title: '有 session 的任务', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, startAt: '2026-08-14T16:45', endAt: '2026-08-14T17:35',
      expectedDurationMinutes: 50, filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7YD', coreBlock: 'task-session',
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

  it('normalizes every rendered day to a local 00:00 origin even when the incoming range carries clock time', () => {
    const daily = buildDailyViewData([], [
      new Date(2026, 7, 26, 13, 45, 0),
      new Date(2026, 7, 27, 18, 20, 0),
    ]);
    expect(daily.dateRangeDays.map((day) => day.format('YYYY-MM-DD HH:mm'))).toEqual([
      '2026-08-26 00:00',
      '2026-08-27 00:00',
    ]);
  });

  it('builds daily columns and time-axis rows', () => {
    const day = { format: () => '2026-06-01' };
    expect(buildTimelineDayColumns({ dateRangeDays: [day], blocksByDay: {} } as any)).toEqual([
      { day: '2026-06-01', blocks: [] },
    ]);
    expect(buildTimelineTimeAxisRows(4, 24)).toEqual([
      { hour: 0, label: '00:00', height: '24px' },
      { hour: 1, label: '', height: '24px' },
      { hour: 2, label: '02:00', height: '24px' },
      { hour: 3, label: '', height: '24px' },
    ]);
    expect(buildTimelineTimeAxisRows(2.5, 24)).toEqual([
      { hour: 0, label: '00:00', height: '24px' },
      { hour: 1, label: '', height: '24px' },
      { hour: 2, label: '02:00', height: '12px' },
    ]);
  });

  it('keeps historical Session completion result after the source Task is reopened', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7VR', coreBlock: 'task', status: 'open',
      content: '重新打开的任务', title: '重新打开的任务', tags: [], categoryKey: '任务',
      created: 0, modified: 0, extra: {}, filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7VS', coreBlock: 'task-session',
      taskId: task.id, sessionStartedAt: '2026-08-14T16:50:00', sessionEndedAt: '2026-08-14T17:20:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timeline',
      title: '', content: '', tags: [], categoryKey: '任务工作块', created: 0, modified: 0, extra: {},
    } as any;

    const result = resolveTimelineTasks([task], [task, session]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      timelineSource: 'task-session',
      sessionResult: 'task-completed',
      status: 'open',
    });
  });


  it('renders planned and actual layers together while suppressing duplicate legacy actual range', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7PA', coreBlock: 'task', status: 'done',
      content: '计划与实际', title: '计划与实际', tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
      scheduledAt: '2026-08-14T09:00', expectedDurationMinutes: 60,
      startAt: '2026-08-14T09:05', endAt: '2026-08-14T10:05',
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as unknown as RecordViewItem;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7PB', coreBlock: 'task-session', taskId: task.id,
      sessionStartedAt: '2026-08-14T09:20:00', sessionEndedAt: '2026-08-14T09:50:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timer',
      title: '', content: '', tags: [], categoryKey: '任务工作块', created: 0, modified: 0, extra: {},
    } as unknown as RecordViewItem;

    const result = resolveTimelineTasks([task], [task, session]);
    expect(result.map((entry) => entry.timelineSource).sort()).toEqual(['task-plan', 'task-session']);
    expect(result.find((entry) => entry.timelineSource === 'task-plan')).toMatchObject({
      id: `${task.id}:plan`, startTime: '09:00', endTime: '10:00', duration: 60,
    });
    expect(result.find((entry) => entry.timelineSource === 'task-session')).toMatchObject({
      id: session.id, startTime: '09:20', endTime: '09:50', duration: 30,
    });
  });

  it('uses a distinct projection id for a planned point and excludes planned duration from actual summaries', () => {
    const pointTask = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7PC', coreBlock: 'task', status: 'open',
      content: '计划点', title: '计划点', tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
      scheduledAt: '2026-08-14T08:30', filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as unknown as RecordViewItem;
    const point = resolveTimelineTasks([pointTask], [pointTask])[0];
    expect(point).toMatchObject({ id: `${pointTask.id}:plan`, timelineSource: 'task-plan', duration: 0 });

    const planned = { ...point, id: 'planned-range', timelineSource: 'task-plan' as const, duration: 60, doneDate: '2026-08-14', fileName: '目标.md' } as TimelineTask;
    const actual = { ...point, id: 'actual-range', timelineSource: 'task-session' as const, duration: 30, doneDate: '2026-08-14', fileName: '目标.md' } as TimelineTask;
    const renderModel = buildTimelineRenderModel({
      items: [], module: moduleConfig,
      dateRange: [new Date('2026-08-14T00:00:00'), new Date('2026-08-14T23:59:59')],
      currentView: '天',
      injectedModel: { timelineTasks: [planned, actual] },
    });
    expect(renderModel.summaryCategoryHours['目标.md']).toBe(0.5);
  });

});
