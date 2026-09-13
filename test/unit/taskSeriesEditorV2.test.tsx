/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F051/unit
 * @covers F051/ui
 * @covers F051/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

import { buildExplicitTaskSeriesEditPlan, buildTaskLifecycleBypassIssue } from '@/app/usecases/recordInput/workflows/UpdateRecordWorkflow';
import { DeleteRecordWorkflow } from '@/app/usecases/recordInput/workflows/DeleteRecordWorkflow';
import { detachTaskSeriesIdentityForDuplicate } from '@core/records/public';
import { RecurringTaskSeriesEditor } from '@/features/quickinput/modal/RecurringTaskSeriesEditor';
import { buildQuickInputDisplayTemplate } from '@/features/quickinput/editor/model/displayTemplate';
import { QuickInputEditorFields } from '@/features/quickinput/editor/components/Fields';

describe('周期任务专用编辑器 V2', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('没有显式范围或选择仅本次时，不生成任何 TaskSeries 更新计划', () => {
    const item = { id: 'task-1', recordType: 'task', seriesId: 'series-1' } as any;
    expect(buildExplicitTaskSeriesEditPlan({ item, meta: {} }, { content: '本次' })).toBeNull();
    expect(buildExplicitTaskSeriesEditPlan({ item, meta: { taskSeriesEdit: { scope: 'current' } } }, { content: '本次' })).toBeNull();
  });

  it('只有显式选择本次及以后时才生成系列默认值与重复规则更新', () => {
    const item = { id: 'task-1', recordType: 'task', seriesId: 'series-1' } as any;
    const plan = buildExplicitTaskSeriesEditPlan({
      item,
      meta: {
        taskSeriesEdit: {
          scope: 'current_and_future',
          recurrence: { unit: 'week', interval: 2, anchor: 'completion' },
        },
      },
    }, {
      content: '每两周复盘',
      expectedDurationMinutes: 45,
      priority: 'high',
    });

    expect(plan).toMatchObject({
      seriesId: 'series-1',
      scope: 'current_and_future',
      update: {
        content: '每两周复盘',
        expectedDurationMinutes: 45,
        priority: 'high',
        recurrence: { unit: 'week', interval: 2, anchor: 'completion' },
      },
    });
  });

  it('本次及以后会把精力推荐默认值同步到 TaskSeries', () => {
    const item = { id: 'task-1', recordType: 'task', seriesId: 'series-1' } as Parameters<typeof buildExplicitTaskSeriesEditPlan>[0]['item'];
    const plan = buildExplicitTaskSeriesEditPlan({
      item,
      meta: { taskSeriesEdit: { scope: 'current_and_future' } },
    }, {
      energyDemand: 'high',
      brainDemand: 'medium',
      physicalDemand: 'low',
      availabilityContexts: ['work', 'home'],
      recoveryIntent: true,
    });

    expect(plan).toMatchObject({
      seriesId: 'series-1',
      scope: 'current_and_future',
      update: {
        energyDemand: 'high',
        brainDemand: 'medium',
        physicalDemand: 'low',
        availabilityContexts: ['work', 'home'],
        recoveryIntent: true,
      },
    });
  });

  it('系列规则范围只更新 recurrence，不把当前表单内容写进系列默认值', () => {
    const item = { id: 'task-1', recordType: 'task', seriesId: 'series-1' } as any;
    const plan = buildExplicitTaskSeriesEditPlan({
      item,
      meta: { taskSeriesEdit: { scope: 'series_rules', recurrence: { unit: 'month', interval: 1, anchor: 'scheduled' } } },
    }, { content: '这只是当前表单内容', priority: 'highest' });

    expect(plan).toEqual({
      seriesId: 'series-1',
      scope: 'series_rules',
      update: { recurrence: { unit: 'month', interval: 1, anchor: 'scheduled' } },
    });
  });



  it('已有 Task 的普通 Update 不能绕过生命周期命令直接改状态', () => {
    const item = { id: 'task-1', recordType: 'task', status: 'open' } as Parameters<typeof buildTaskLifecycleBypassIssue>[0];
    expect(buildTaskLifecycleBypassIssue(item, { content: '只改内容', status: 'open' })).toBeNull();
    expect(buildTaskLifecycleBypassIssue(item, { content: '试图直接完成', status: 'done' })).toMatchObject({
      code: 'task_status_requires_lifecycle_command',
      field: 'status',
    });
  });
  it('新建周期任务把固定计划作为显式默认规则，不再依赖隐藏的 start 默认值', () => {
    const template = buildQuickInputDisplayTemplate({
      id: 'core.task',
      recordTypeId: 'core.task',
      fields: [
        { id: 'body', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
      ],
    }, 'core.task', [])!;

    const anchor = template.fields?.find((field) => field.key === 'recurrenceAnchor');
    expect(anchor).toMatchObject({ label: '重复方式', defaultValue: 'scheduled' });
    expect(anchor?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'scheduled', label: '固定计划' }),
      expect.objectContaining({ value: 'completion', label: '完成后重复' }),
    ]));
  });

  it('编辑已有周期任务时，普通 Task 字段区不再显示另一套重复字段', async () => {
    const template = buildQuickInputDisplayTemplate({
      id: 'core.task',
      recordTypeId: 'core.task',
      fields: [
        { id: 'body', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
      ],
    }, 'core.task', [])!;

    await act(async () => render(
      <QuickInputEditorFields
        getResourcePath={(path) => path}
        template={template}
        formData={{ seriesId: 'series-1', recurrenceUnit: 'week', recurrenceInterval: 1 }}
        onUpdateField={() => {}}
      />,
      host,
    ));

    expect(host.textContent).not.toContain('重复间隔');
    expect(host.textContent).not.toContain('重复方式');
  });

  it('复制周期任务时会脱离原 Series，避免产生第二条 open occurrence', () => {
    expect(detachTaskSeriesIdentityForDuplicate({
      content: '复制我',
      seriesId: 'series-1',
      系列ID: 'series-1',
    })).toEqual({ content: '复制我' });
  });

  it('通用删除工作流拒绝直接删除周期任务当前实例', async () => {
    const workflow = new DeleteRecordWorkflow({ deps: {} as never } as never);
    await expect(workflow.submit({
      item: { id: 'task-1', recordType: 'task', seriesId: 'series-1' } as any,
      source: 'quickinput',
    })).resolves.toMatchObject({
      status: 'validation_error',
      operation: 'delete',
      errors: [expect.objectContaining({ code: 'recurring_task_delete_requires_lifecycle_command' })],
    });
  });

  it('旧 start 锚点在用户没有切换时保持原样，主动切换才变成 completion', async () => {
    const onRecurrenceChange = jest.fn();
    await act(async () => render(
      <RecurringTaskSeriesEditor
        scope="current_and_future"
        recurrence={{ unit: 'week', interval: 1, anchor: 'start' }}
        onScopeChange={() => {}}
        onRecurrenceChange={onRecurrenceChange}
        onSkipCurrent={() => {}}
        onStopSeries={() => {}}
      />,
      host,
    ));

    expect(host.textContent).toContain('按开始时间推进');
    expect(onRecurrenceChange).not.toHaveBeenCalled();

    const completionButton = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('完成后重复')) as HTMLButtonElement | undefined;
    expect(completionButton).toBeTruthy();
    await act(async () => completionButton?.click());
    expect(onRecurrenceChange).toHaveBeenCalledWith({ unit: 'week', interval: 1, anchor: 'completion' });
  });
});
