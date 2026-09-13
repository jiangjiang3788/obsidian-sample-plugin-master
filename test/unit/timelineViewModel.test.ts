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
import {
  buildDailyViewData,
  buildTimelineBlockGesturePreview,
  buildTimelineDragSelection,
  dayjs,
} from '@core/utils/public';
import type { RecordViewItem, TimelineTask } from '@core/types/public';

const moduleConfig = {
  viewConfig: {
    UNTRACKED_LABEL: '未跟踪',
    MAX_HOURS_PER_DAY: 12,
    defaultHourHeight: 28,
  },
};

describe('TimelineViewModel', () => {
  it('resolves config and color map with injected model precedence', () => {
    expect(resolveTimelineConfig(moduleConfig).MAX_HOURS_PER_DAY).toBe(12);
    expect(resolveTimelineConfig(moduleConfig, { config: { injected: true } as any })).toEqual({ injected: true });
    const goalSettings = { goals: [{ path: '工作', status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01', color: '#111111' }], goalTemplates: [] };
    expect(buildTimelineColorMap(goalSettings as any, [{ goalPath: '工作' } as any], '未跟踪')).toMatchObject({ 工作: '#111111', 未归属目标: '#9ca3af', 未跟踪: '#d1d5db' });
  });


  it('builds a render model that respects injected timeline data', () => {
    const renderModel = buildTimelineRenderModel({
      items: [],
      module: moduleConfig,
      dateRange: [new Date('2026-06-01'), new Date('2026-06-02')],
      currentView: '月',
      injectedModel: {
        timelineTasks: [{ doneDate: '2026-06-01' } as any],
        summaryGoalHours: { work: 2 },
        dailyViewData: { dateRangeDays: [], blocksByDay: {} },
      },
    });

    expect(renderModel.timelineTasks).toHaveLength(1);
    expect(renderModel.summaryGoalHours).toEqual({ work: 2 });
    expect(renderModel.totalSummaryHours).toBe(2);
    expect(renderModel.dailyViewData).toEqual({ dateRangeDays: [], blocksByDay: {} });
  });


  it('projects a manual Task start/end range when no TaskSession exists', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
      recordType: 'task',
      status: 'done',
      content: '个地方官方',
      title: '个地方官方',
      tags: [],
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
      timelineEditTarget: { kind: 'task-range', recordId: task.id },
      timelineRange: { start: '2026-08-14T16:45', end: '2026-08-14T17:35' },
      actualStartDate: '2026-08-14',
      startTime: '16:45',
      endTime: '17:35',
      duration: 50,
    });
    expect(result[0].sessionRecordId).toBeUndefined();
  });

  it('projects an open Task range too because lifecycle status does not control timeline visibility', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YB', recordType: 'task', status: 'open',
      content: '未完成但已经记录时间', title: '未完成但已经记录时间', tags: [], created: 0, modified: 0, extra: {}, startAt: '2026-08-14T10:00', expectedDurationMinutes: 30,
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;

    const result = resolveTimelineTasks([task], [task]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ timelineSource: 'task-range', startTime: '10:00', endTime: '10:30', duration: 30 });
  });

  it('keeps a start-only unfinished Task visible as a zero-duration point marker', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YP', recordType: 'task', status: 'open',
      content: '只计划了开始时间', title: '只计划了开始时间', tags: [], created: 0, modified: 0, extra: {}, startAt: '2026-08-14T11:20',
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
    expect(renderModel.summaryGoalHours).toMatchObject({ 未跟踪: 24 });
    expect(renderModel.totalSummaryHours).toBe(24);
  });

  it('prefers TaskSession history over the Task manual range to avoid duplicate timeline blocks', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YC', recordType: 'task', status: 'done',
      content: '有 session 的任务', title: '有 session 的任务', tags: [], created: 0, modified: 0, extra: {}, startAt: '2026-08-14T16:45', endAt: '2026-08-14T17:35',
      expectedDurationMinutes: 50, filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7YD', recordType: 'task-session',
      taskId: task.id, sessionStartedAt: '2026-08-14T16:50:00', sessionEndedAt: '2026-08-14T17:20:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timer',
      title: '', content: '', tags: [], created: 0, modified: 0, extra: {},
    } as any;

    const result = resolveTimelineTasks([task], [task, session]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: session.id,
      sessionRecordId: session.id,
      taskRecordId: task.id,
      timelineSource: 'task-session',
      timelineEditTarget: { kind: 'task-session', recordId: session.id },
      timelineRange: { start: session.sessionStartedAt, end: session.sessionEndedAt },
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
      { hour: 1, label: '01:00', height: '24px' },
      { hour: 2, label: '02:00', height: '24px' },
      { hour: 3, label: '03:00', height: '24px' },
    ]);
    expect(buildTimelineTimeAxisRows(2.5, 24)).toEqual([
      { hour: 0, label: '00:00', height: '24px' },
      { hour: 1, label: '01:00', height: '24px' },
      { hour: 2, label: '02:00', height: '12px' },
    ]);
  });

  it('snaps drag selections to five-minute boundaries in either drag direction', () => {
    expect(buildTimelineDragSelection(9 * 60 + 7, 10 * 60 + 2, 24)).toEqual({
      startMinute: 9 * 60 + 5,
      endMinute: 10 * 60 + 5,
      durationMinutes: 60,
    });
    expect(buildTimelineDragSelection(10 * 60 + 2, 9 * 60 + 7, 24)).toEqual({
      startMinute: 9 * 60 + 5,
      endMinute: 10 * 60 + 5,
      durationMinutes: 60,
    });
    expect(buildTimelineDragSelection(23 * 60 + 50, 23 * 60 + 59, 24)).toEqual({
      startMinute: 23 * 60 + 50,
      endMinute: 24 * 60,
      durationMinutes: 10,
    });
  });


  it('moves and resizes a logical range through one five-minute interaction model', () => {
    const block = {
      ...resolveTimelineTasks([{
        id: 'task.direct-range', recordType: 'task', status: 'open', content: '直接操纵', title: '直接操纵',
        tags: [], created: 0, modified: 0, extra: {},
        startAt: '2026-08-26T09:00', endAt: '2026-08-26T10:00',
        filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
      } as any], [{
        id: 'task.direct-range', recordType: 'task', status: 'open', content: '直接操纵', title: '直接操纵',
        tags: [], created: 0, modified: 0, extra: {},
        startAt: '2026-08-26T09:00', endAt: '2026-08-26T10:00',
        filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
      } as any])[0],
      day: '2026-08-26', blockStartMinute: 540, blockEndMinute: 600,
      isRangeStart: true, isRangeEnd: true,
    } as any;

    const moved = buildTimelineBlockGesturePreview({
      block, mode: 'move', anchorMinute: 550, currentMinute: 578, maxHours: 24,
    });
    expect(moved).toMatchObject({ blockStartMinute: 570, blockEndMinute: 630, durationMinutes: 60 });
    expect(dayjs(moved?.range.start).format('YYYY-MM-DD HH:mm')).toBe('2026-08-26 09:30');
    expect(dayjs(moved?.range.end).format('YYYY-MM-DD HH:mm')).toBe('2026-08-26 10:30');

    const resizedStart = buildTimelineBlockGesturePreview({
      block, mode: 'resize-start', anchorMinute: 540, currentMinute: 570, maxHours: 24,
    });
    expect(dayjs(resizedStart?.range.start).format('HH:mm')).toBe('09:30');
    expect(dayjs(resizedStart?.range.end).format('HH:mm')).toBe('10:00');
    expect(resizedStart?.durationMinutes).toBe(30);

    const resizedEnd = buildTimelineBlockGesturePreview({
      block, mode: 'resize-end', anchorMinute: 600, currentMinute: 645, maxHours: 24,
    });
    expect(dayjs(resizedEnd?.range.start).format('HH:mm')).toBe('09:00');
    expect(dayjs(resizedEnd?.range.end).format('HH:mm')).toBe('10:45');
    expect(resizedEnd?.durationMinutes).toBe(105);
  });

  it('treats cross-midnight day blocks as projections of one logical range', () => {
    const task = {
      id: 'task.cross-midnight', recordType: 'task', status: 'done', content: '跨午夜', title: '跨午夜',
      tags: [], created: 0, modified: 0, extra: {},
      startAt: '2026-08-26T23:30', endAt: '2026-08-27T01:00',
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const timelineTask = resolveTimelineTasks([task], [task])[0];
    const daily = buildDailyViewData([timelineTask], [new Date(2026, 7, 26), new Date(2026, 7, 27)]);
    const first = daily.blocksByDay['2026-08-26'][0];
    const second = daily.blocksByDay['2026-08-27'][0];
    expect(first).toMatchObject({ isRangeStart: true, isRangeEnd: false });
    expect(second).toMatchObject({ isRangeStart: false, isRangeEnd: true });

    const moved = buildTimelineBlockGesturePreview({
      block: second, mode: 'move', anchorMinute: 30, currentMinute: 60, maxHours: 24,
    });
    expect(dayjs(moved?.range.start).format('YYYY-MM-DD HH:mm')).toBe('2026-08-27 00:00');
    expect(dayjs(moved?.range.end).format('YYYY-MM-DD HH:mm')).toBe('2026-08-27 01:30');
    expect(moved?.durationMinutes).toBe(90);
  });

  it('keeps historical Session completion result after the source Task is reopened', () => {
    const task = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7VR', recordType: 'task', status: 'open',
      content: '重新打开的任务', title: '重新打开的任务', tags: [], created: 0, modified: 0, extra: {}, filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as any;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7VS', recordType: 'task-session',
      taskId: task.id, sessionStartedAt: '2026-08-14T16:50:00', sessionEndedAt: '2026-08-14T17:20:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timeline',
      title: '', content: '', tags: [], created: 0, modified: 0, extra: {},
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
      id: 'task.01KZZQ6G798KJN54XBGKJVH7PA', recordType: 'task', status: 'done',
      content: '计划与实际', title: '计划与实际', tags: [], created: 0, modified: 0, extra: {},
      scheduledAt: '2026-08-14T09:00', expectedDurationMinutes: 60,
      startAt: '2026-08-14T09:05', endAt: '2026-08-14T10:05',
      filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as unknown as RecordViewItem;
    const session = {
      id: 'task-session.01KZZQ6G798KJN54XBGKJVH7PB', recordType: 'task-session', taskId: task.id,
      sessionStartedAt: '2026-08-14T09:20:00', sessionEndedAt: '2026-08-14T09:50:00',
      sessionDurationMinutes: 30, sessionResult: 'task-completed', sessionSource: 'timer',
      title: '', content: '', tags: [], created: 0, modified: 0, extra: {},
    } as unknown as RecordViewItem;

    const result = resolveTimelineTasks([task], [task, session]);
    expect(result.map((entry) => entry.timelineSource).sort()).toEqual(['task-plan', 'task-session']);
    expect(result.find((entry) => entry.timelineSource === 'task-plan')).toMatchObject({
      id: `${task.id}:plan`,
      timelineEditTarget: { kind: 'task-plan', recordId: task.id },
      startTime: '09:00', endTime: '10:00', duration: 60,
    });
    expect(result.find((entry) => entry.timelineSource === 'task-session')).toMatchObject({
      id: session.id, startTime: '09:20', endTime: '09:50', duration: 30,
    });
  });

  it('uses a distinct projection id for a planned point and excludes planned duration from actual summaries', () => {
    const pointTask = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7PC', recordType: 'task', status: 'open',
      content: '计划点', title: '计划点', tags: [], created: 0, modified: 0, extra: {},
      scheduledAt: '2026-08-14T08:30', filename: '目标.md', file: { path: '01/目标.md', basename: '目标.md' },
    } as unknown as RecordViewItem;
    const point = resolveTimelineTasks([pointTask], [pointTask])[0];
    expect(point).toMatchObject({
      id: `${pointTask.id}:plan`,
      timelineSource: 'task-plan',
      timelineEditTarget: { kind: 'task-plan', recordId: pointTask.id },
      timelineRange: { start: '2026-08-14T08:30' },
      duration: 0,
    });

    const planned = { ...point, id: 'planned-range', timelineSource: 'task-plan' as const, duration: 60, doneDate: '2026-08-14', fileName: '目标.md' } as TimelineTask;
    const actual = { ...point, id: 'actual-range', timelineSource: 'task-session' as const, duration: 30, doneDate: '2026-08-14', fileName: '目标.md' } as TimelineTask;
    const renderModel = buildTimelineRenderModel({
      items: [], module: moduleConfig,
      dateRange: [new Date('2026-08-14T00:00:00'), new Date('2026-08-14T23:59:59')],
      currentView: '天',
      injectedModel: { timelineTasks: [planned, actual] },
    });
    expect(renderModel.summaryGoalHours['未归属目标']).toBe(0.5);
  });


  it('builds Goal allocation from full TaskSession records, not filtered Timeline items or legacy Task ranges', () => {
    const workTask = {
      id: 'task.work', recordType: 'task', status: 'done', goalPath: '工作',
      content: '工作', title: '工作', tags: [], created: 0, modified: 0, extra: {},
      startAt: '2026-08-14T08:00:00', endAt: '2026-08-14T18:00:00',
    } as unknown as RecordViewItem;
    const healthTask = {
      id: 'task.health', recordType: 'task', status: 'done', goalPath: '照顾好自己/身体健康',
      content: '健康', title: '健康', tags: [], created: 0, modified: 0, extra: {},
    } as unknown as RecordViewItem;
    const workSession = {
      id: 'task-session.work', recordType: 'task-session', taskId: workTask.id,
      sessionStartedAt: '2026-08-14T09:00:00', sessionEndedAt: '2026-08-14T09:30:00', sessionDurationMinutes: 30,
      sessionResult: 'task-completed', sessionSource: 'timer', title: '', content: '', tags: [], created: 0, modified: 0, extra: {},
    } as unknown as RecordViewItem;
    const healthSession = {
      id: 'task-session.health', recordType: 'task-session', taskId: healthTask.id,
      sessionStartedAt: '2026-08-14T10:00:00', sessionEndedAt: '2026-08-14T10:30:00', sessionDurationMinutes: 30,
      sessionResult: 'task-completed', sessionSource: 'timer', title: '', content: '', tags: [], created: 0, modified: 0, extra: {},
    } as unknown as RecordViewItem;

    const renderModel = buildTimelineRenderModel({
      // Simulate Timeline filters hiding the health Task. Goal allocation must still use all records.
      items: [workTask],
      records: [workTask, healthTask, workSession, healthSession],
      module: moduleConfig,
      dateRange: [new Date('2026-08-14T00:00:00'), new Date('2026-08-14T23:59:59.999')],
      currentView: '周',
      goalSettings: {
        goals: [
          { path: '照顾好自己', status: 'active', timePresetPercent: 40, createdAt: '', updatedAt: '' },
          { path: '工作', status: 'active', timePresetPercent: 30, createdAt: '', updatedAt: '' },
          { path: '照顾好自己/身体健康', status: 'active', weeklyTargetMinutes: 240, createdAt: '', updatedAt: '' },
        ],
        goalTemplates: [],
      },
    });

    expect(renderModel.goalAllocationSummary?.trackedMinutes).toBe(60);
    expect(renderModel.goalAllocationSummary?.rows.find((row) => row.path === '照顾好自己')?.minutes).toBe(30);
    expect(renderModel.goalAllocationSummary?.rows.find((row) => row.path === '工作')?.minutes).toBe(30);
    // The 10-hour Task start/end range above is Timeline fallback only and must never enter Goal actual.
    expect(renderModel.goalAllocationSummary?.trackedMinutes).not.toBeGreaterThan(60);
  });

});
