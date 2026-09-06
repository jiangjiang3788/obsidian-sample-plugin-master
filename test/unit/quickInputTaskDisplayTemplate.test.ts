/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F042/unit
 */
import type { QuickInputTemplateLike } from '../../src/features/quickinput/editor/model/types';
import { buildQuickInputDisplayTemplate, resolveTaskQuickInputTimingMode, shouldShowQuickInputTimeDirectionControl } from '../../src/features/quickinput/editor/model/displayTemplate';

describe('QuickInput task display template', () => {
  const raw: QuickInputTemplateLike = {
    id: 'core.task',
    recordTypeId: 'core.task',
    fields: [
      { id: 'body', key: '任务内容', label: '任务内容', type: 'textarea', semantic: 'body' },
      { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', autoSelectFirst: false, options: [
        { value: 'lowest', label: '最低' }, { value: 'high', label: '高' },
      ] },
    ],
  };

  it('canonicalizes task primary fields without embedding Goal context as a form field', () => {
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [])!;
    expect(result.fields!.slice(0, 3).map((field) => field.key)).toEqual(['status', '任务内容', 'recurrenceUnit']);
    expect(result.fields!.some((field) => field.key === 'goalPath' || field.key === '目标')).toBe(false);
    expect(result.fields!.find((field) => field.key === '任务内容')?.type).toBe('text');
    expect(result.fields!.find((field) => field.key === 'scheduledAt')).toMatchObject({ label: '计划时间', semantic: 'startTime' });
    expect(result.fields!.some((field) => field.key === 'startAt' || field.key === 'endAt')).toBe(false);
    expect(result.fields!.find((field) => field.key === 'dueAt')?.label).toBe('截止时间');
    expect(result.fields!.find((field) => field.key === 'expectedDurationMinutes')).toMatchObject({
      label: '预计时长（分钟）',
      type: 'number',
      semantic: 'duration',
    });
  });

  it('defaults all task single-select fields to their first option policy', () => {
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [])!;
    const status = result.fields!.find((field) => field.key === 'status');
    expect(status?.defaultValue).toBe('open');
    expect(status?.options?.map((option) => option.value)).toEqual(['open', 'done']);
    expect(status?.options?.map((option) => option.label)).toEqual(['⏳ 未完成', '✅ 已完成']);
    expect(result.fields!.find((field) => field.key === 'recurrenceUnit')?.defaultValue).toBe('none');
    expect(result.fields!.find((field) => field.key === 'priority')?.autoSelectFirst).toBe(true);
    expect(result.fields!.find((field) => field.key === 'priority')?.defaultValue).toBe('lowest');
  });

  it('preserves ordinary GoalTemplate defaults while keeping recurrence explicit', () => {
    const configured: QuickInputTemplateLike = {
      id: 'core.task',
      recordTypeId: 'core.task',
      fields: [
        { id: 'body', key: '任务内容', label: '任务内容', type: 'textarea', semantic: 'body' },
        { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', defaultValue: 'highest', options: [
          { value: 'lowest', label: '最低' }, { value: 'highest', label: '最高' },
        ] },
        { id: 'importance', key: 'importance', label: '重要程度', type: 'singleSelect', defaultValue: 'normal', options: [
          { value: 'important', label: '重要' }, { value: 'normal', label: '普通' },
        ] },
        { id: 'brain', key: 'brainDemand', label: '脑力要求', type: 'singleSelect', defaultValue: 'high', options: [
          { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
        ] },
        { id: 'repeat', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence', defaultValue: 'month', options: [
          { value: 'none', label: '不重复' }, { value: 'month', label: '月' },
        ] },
      ],
    };

    const result = buildQuickInputDisplayTemplate(configured, 'core.task', [])!;
    expect(result.fields!.find((field) => field.key === 'priority')?.defaultValue).toBe('highest');
    expect(result.fields!.find((field) => field.key === 'importance')?.defaultValue).toBe('normal');
    expect(result.fields!.find((field) => field.key === 'brainDemand')?.defaultValue).toBe('high');
    expect(result.fields!.find((field) => field.key === 'recurrenceUnit')?.defaultValue).toBe('none');
  });
  it('keeps recurrence explicit even when a GoalTemplate carries an old seeded cadence default', () => {
    const configured = buildQuickInputDisplayTemplate({
      ...raw,
      fields: [
        ...(raw.fields || []),
        { id: 'repeat', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence', defaultValue: 'day', options: [
          { value: 'none', label: '不重复' }, { value: 'day', label: '天' },
        ] },
      ],
    }, 'core.task', [])!;
    expect(configured.fields!.find((field) => field.key === 'recurrenceUnit')?.defaultValue).toBe('none');
  });

  it('keeps backward-time controls exclusive to execution capture and hides recurrence there', () => {
    const planned = buildQuickInputDisplayTemplate(raw, 'core.task', [])!;
    expect(shouldShowQuickInputTimeDirectionControl(planned)).toBe(false);

    const execution = buildQuickInputDisplayTemplate(raw, 'core.task', [], { taskTimingMode: 'execution' })!;
    expect(execution.fields!.find((field) => field.key === 'status')?.defaultValue).toBe('done');
    expect(execution.fields!.find((field) => field.key === 'startAt')).toMatchObject({ label: '实际开始', semantic: 'startTime' });
    expect(execution.fields!.find((field) => field.key === 'endAt')).toMatchObject({ label: '实际结束', semantic: 'endTime' });
    expect(execution.fields!.find((field) => field.key === 'expectedDurationMinutes')?.label).toBe('时长（分钟）');
    expect(execution.fields!.some((field) => field.key === 'recurrenceUnit')).toBe(false);
    expect(shouldShowQuickInputTimeDirectionControl(execution)).toBe(true);
  });

  it('switches a newly-created done Task to execution timing by semantic status', () => {
    expect(resolveTaskQuickInputTimingMode({
      effectiveBlockId: 'core.task',
      recordInputMode: 'create',
      formData: { status: { value: 'done', label: '已完成' } },
    })).toBe('execution');
    expect(resolveTaskQuickInputTimingMode({
      effectiveBlockId: 'core.task',
      recordInputMode: 'create',
      formData: { status: { value: 'open', label: '未完成' } },
    })).toBe('plan');
  });

  it('removes lifecycle status from existing Task ordinary edit fields', () => {
    const editing = buildQuickInputDisplayTemplate(raw, 'core.task', [], { recordInputMode: 'edit' })!;
    expect(editing.fields!.some((field) => field.key === 'status')).toBe(false);
  });


  it('keeps Task expected duration optional even when an old/custom template marked it required', () => {
    const requiredDurationRaw: QuickInputTemplateLike = {
      ...raw,
      fields: [
        ...(raw.fields || []),
        { id: 'duration', key: 'expectedDurationMinutes', label: '预计时长', type: 'number', semantic: 'duration', required: true },
      ],
    };
    const result = buildQuickInputDisplayTemplate(requiredDurationRaw, 'core.task', [])!;
    expect(result.fields!.find((field) => field.key === 'expectedDurationMinutes')?.required).toBe(false);
  });

});
