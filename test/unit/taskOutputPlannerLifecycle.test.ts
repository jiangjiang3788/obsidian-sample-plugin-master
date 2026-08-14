import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';

const taskTemplate: RecordCaptureTemplate = {
  id: 'core.task',
  coreBlockId: 'core.task',
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
    expect(plan.outputContent).toMatch(/完成于:: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
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
});
