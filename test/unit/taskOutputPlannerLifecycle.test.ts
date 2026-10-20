/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F053/unit
 */
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import { buildEditRecordState } from '@/core/recordInput/editStateResolver';
import { buildExplicitTaskSeriesEditPlan } from '@/app/usecases/recordInput/workflows/UpdateRecordWorkflow';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';

const taskTemplate: RecordCaptureTemplate = {
  id: 'core.task',
  recordTypeId: 'core.task',
  name: '任务',
  targetFile: '01/{{year}}/2-0其他.md',
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
    expect(plan.targetFilePath).toBe('01/2026/2-0其他.md');
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


describe('Timeline Task name edit persistence regression', () => {
  const aliasedTaskTemplate: RecordCaptureTemplate = {
    ...taskTemplate,
    fields: taskTemplate.fields.map((field) => field.key === '任务内容'
      ? { ...field, key: '内容' }
      : field),
  };

  it('does not backfill a stale 任务内容 alongside a Goal-template 内容 editor field', () => {
    const item = {
      id: 'task.01KZZQ6G798KJN54XBGKJVH7YX',
      recordType: 'task',
      status: 'open',
      title: '旧名称',
      content: '旧名称',
      editableText: '旧名称',
      scheduledAt: '2026-10-19T09:00',
      goalPath: '工作/项目',
      tags: [],
      created: 0,
      modified: 0,
      extra: {},
      source: { path: '01/2026/2-0其他.md', startLine: 1, endLine: 8, modified: 0 },
    } as any;
    const settings = {
      goalSettings: {
        goals: [{ path: '工作/项目', status: 'active' }],
        goalTemplates: [{
          goalPath: '工作/项目', recordTypeId: 'core.task', enabled: true,
          fields: aliasedTaskTemplate.fields,
        }],
      },
    } as any;
    const prepared = buildEditRecordState({ settings, item, preferredRecordTypeId: 'core.task' });
    expect(prepared.initialFormData['内容']).toBe('旧名称');
    expect(prepared.initialFormData).not.toHaveProperty('任务内容');

    const plan = buildRecordOutputPlan({
      template: prepared.template,
      recordId: item.id,
      formData: { ...prepared.initialFormData, 内容: '新名称' },
    });
    expect(plan.outputContent).toContain('内容:: 新名称');
    expect(plan.outputContent).not.toContain('内容:: 旧名称');
  });

  it('writes the edited semantic body even when legacy aliases contain an old name', () => {
    const plan = buildRecordOutputPlan({
      template: aliasedTaskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YY',
      formData: { status: 'open', 内容: '修改后的名称', 任务内容: '修改前的名称' },
    });
    expect(plan.outputContent).toContain('内容:: 修改后的名称');
    expect(plan.outputContent).not.toContain('内容:: 修改前的名称');
  });

  it('uses the same new name for the future occurrences of a recurring Task', () => {
    const plan = buildRecordOutputPlan({
      template: aliasedTaskTemplate,
      recordId: 'task.01KZZQ6G798KJN54XBGKJVH7YZ',
      formData: {
        status: 'open', 内容: '周期任务新名称', 任务内容: '周期任务旧名称',
        seriesId: 'task-series.01KZZQ6G798KJN54XBGKJVH7YZ',
      },
    });
    const seriesPlan = buildExplicitTaskSeriesEditPlan({
      item: { recordType: 'task', seriesId: 'task-series.01KZZQ6G798KJN54XBGKJVH7YZ' } as any,
      meta: { taskSeriesEdit: { scope: 'current_and_future' } },
    }, plan.renderData);
    expect(seriesPlan).toMatchObject({ update: { content: '周期任务新名称' } });
  });
});
