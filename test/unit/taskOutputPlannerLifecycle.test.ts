/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F053/unit
 */
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';

const taskTemplate: RecordCaptureTemplate = {
  id: 'core.task',
  recordTypeId: 'core.task',
  name: '任务',
  categoryKey: '任务',
  targetFile: '01/目标.md',
  fields: [
    { id: 'status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status' },
    { id: 'content', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
    { id: 'start', key: 'startAt', label: '开始/预计时间', type: 'datetime', semantic: 'startTime' },
    { id: 'end', key: 'endAt', label: '结束时间', type: 'datetime', semantic: 'endTime' },
    { id: 'duration', key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration' },
    { id: 'recurrence', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence' },
  ],
};

describe('Task OutputPlanner lifecycle invariants', () => {
  it('writes completedAt when quick-entry creates an already-done Task', () => {
    const plan = buildRecordOutputPlan({
      template: taskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YA',
      formData: {
        status: { value: 'done', label: '已完成' },
        任务内容: '个地方官方',
        startAt: '2026-08-14T16:45',
        endAt: '2026-08-14T17:35',
        expectedDurationMinutes: 50,
        recurrenceUnit: { value: 'none', label: '不重复' },
      },
    });

    expect(plan.outputContent).toContain('状态:: done');
    expect(plan.outputContent).toContain('开始时间:: 2026-08-14 16:45');
    expect(plan.outputContent).toContain('结束时间:: 2026-08-14 17:35');
    expect(plan.outputContent).toContain('预计时长:: 50');
    expect(plan.outputContent).toContain('完成于:: 2026-08-14 17:35');
  });

  it('ignores stale recurrence defaults for completed capture instead of creating a TaskSeries or throwing', () => {
    const plan = buildRecordOutputPlan({
      template: taskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YQ',
      context: { __recordUiContext: { kind: 'quickinput_create', captureMode: 'completed_execution' } },
      formData: {
        status: 'done',
        任务内容: '历史补记',
        startAt: '2026-08-14T16:45',
        endAt: '2026-08-14T17:35',
        recurrenceUnit: 'day',
      },
    });

    expect(plan.outputContent).not.toContain('记录类型:: task-series');
    expect(plan.outputContent).not.toContain('系列ID::');
    expect(plan.outputContent).toContain('记录类型:: task-session');
    expect(plan.outputContent).not.toContain('开始时间:: 2026-08-14 16:45');
    expect(plan.outputContent).not.toContain('结束时间:: 2026-08-14 17:35');
  });

  it('forces Timeline completed_execution to done and persists a Session even if form status is stale open', () => {
    const plan = buildRecordOutputPlan({
      template: taskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YT',
      context: { __recordUiContext: { kind: 'timeline_create', captureMode: 'completed_execution' } },
      formData: {
        status: 'open',
        任务内容: '时间轴补录不能降级成未完成',
        startAt: '2026-08-14T16:45',
        endAt: '2026-08-14T17:35',
        recurrenceUnit: 'day',
      },
    });

    expect(plan.outputContent).toContain('状态:: done');
    expect(plan.outputContent).toContain('完成于:: 2026-08-14 17:35');
    expect(plan.outputContent).toContain('记录类型:: task-session');
    expect(plan.outputContent).toContain('结果:: task-completed');
    expect(plan.outputContent).not.toContain('记录类型:: task-series');
  });

  it('does not write completedAt for an open Task even when the Task has an end time', () => {
    const plan = buildRecordOutputPlan({
      template: taskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YB',
      formData: {
        status: { value: 'open', label: '未完成' },
        任务内容: '只是记录了时间段',
        startAt: '2026-08-14T16:45',
        endAt: '2026-08-14T17:35',
        recurrenceUnit: { value: 'none', label: '不重复' },
      },
    });

    expect(plan.outputContent).toContain('状态:: open');
    expect(plan.outputContent).not.toContain('完成于::');
  });
  it('does not create a TaskSession for an ordinary already-done QuickInput Task', () => {
    const plan = buildRecordOutputPlan({
      template: taskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YC',
      formData: {
        status: { value: 'done', label: '已完成' },
        任务内容: '普通快速记录完成任务',
        startAt: '2026-08-14T16:45',
        endAt: '2026-08-14T17:35',
        expectedDurationMinutes: 50,
        recurrenceUnit: { value: 'none', label: '不重复' },
      },
    });

    expect(plan.outputContent.match(/记录类型:: task-session/g)).toBeNull();
  });


  it('new planned Task persists scheduled/due/expected facts without fabricating an actual range', () => {
    const plannedTemplate: RecordCaptureTemplate = {
      ...taskTemplate,
      fields: [
        { id: 'status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status' },
        { id: 'content', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
        { id: 'scheduled', key: 'scheduledAt', label: '计划时间', type: 'datetime', semantic: 'startTime' },
        { id: 'duration', key: 'expectedDurationMinutes', label: '预计时长（分钟）', type: 'number', semantic: 'duration' },
        { id: 'due', key: 'dueAt', label: '截止时间', type: 'datetime' },
        { id: 'recurrence', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence' },
      ],
    };
    const plan = buildRecordOutputPlan({
      template: plannedTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YD',
      formData: {
        status: 'open', 任务内容: '计划任务',
        scheduledAt: '2026-08-27T09:30', dueAt: '2026-08-27T18:00', expectedDurationMinutes: 45,
        recurrenceUnit: 'none',
      },
    });

    expect(plan.outputContent).toContain('计划时间:: 2026-08-27 09:30');
    expect(plan.outputContent).toContain('截止时间:: 2026-08-27 18:00');
    expect(plan.outputContent).toContain('预计时长:: 45');
    expect(plan.outputContent).not.toContain('开始时间::');
    expect(plan.outputContent).not.toContain('结束时间::');
    expect(plan.outputContent).not.toContain('记录类型:: task-session');
  });

});
