import {
  initializeRecordInputSession,
  preserveRecordInputBlockSwitchState,
  reduceRecordInputSession,
} from '@core/public';

const baseSources = {
  内容: 'user',
  日期: 'context',
  自定义: 'user',
  goalId: 'goal_context',
  themePath: 'goal_context',
  templateId: 'system_auto',
  templateVariantId: 'system_auto',
} as const;

describe('RecordInputSession', () => {
  it('keeps block switch preservation policy in the core domain', () => {
    const preserved = preserveRecordInputBlockSwitchState(
      {
        内容: '保留',
        日期: '2026-06-30',
        自定义: '不跨类型保留',
        goalId: 'goal-1',
        themePath: '学习',
        templateId: 'tpl-old',
        templateVariantId: 'variant-old',
      },
      baseSources,
    );

    expect(preserved.formData).toEqual({
      内容: '保留',
      日期: '2026-06-30',
      goalId: 'goal-1',
      themePath: '学习',
    });
    expect(preserved.fieldSources).toEqual({
      内容: 'user',
      日期: 'context',
      goalId: 'goal_context',
      themePath: 'goal_context',
    });
  });

  it('switches record type as a draft change and clears template selection', () => {
    const state = initializeRecordInputSession({
      initialBlockId: 'core.habit',
      initialThemeId: 'theme-1',
      initialFormData: {
        内容: '眼睛训练',
        日期: '2026-06-30',
        自定义: '不跨类型保留',
        goalId: 'goal-health',
        goalPath: '照顾好自己',
        templateId: 'habit-template',
        templateVariantId: 'habit-default',
      },
      initialFieldSources: {
        内容: 'user',
        日期: 'context',
        自定义: 'user',
        goalId: 'goal_context',
        goalPath: 'goal_context',
        templateId: 'system_auto',
        templateVariantId: 'system_auto',
      },
      initialSelection: {
        selectedGoalId: 'goal-health',
        selectedGoalPath: '照顾好自己',
        selectedTemplateVariantId: 'habit-default',
        timeDirection: 'forward',
      },
    });

    const switched = reduceRecordInputSession(state, {
      type: 'switchRecordType',
      blockId: 'core.task',
    });

    expect(switched.currentBlockId).toBe('core.task');
    expect(switched.originBlockId).toBe('core.habit');
    expect(switched.selectedTemplateVariantId).toBeNull();
    expect(switched.formData).toEqual({
      内容: '眼睛训练',
      日期: '2026-06-30',
      goalId: 'goal-health',
      goalPath: '照顾好自己',
    });
    expect(switched.draftByBlockId['core.habit']?.formData.自定义).toBe('不跨类型保留');
  });

  it('restores per-record-type draft when switching back', () => {
    const initial = initializeRecordInputSession({
      initialBlockId: 'core.habit',
      initialFormData: { 内容: '喝水', 日期: '2026-06-30' },
      initialFieldSources: { 内容: 'user', 日期: 'context' },
    });

    const task = reduceRecordInputSession(initial, { type: 'switchRecordType', blockId: 'core.task' });
    const editedTask = reduceRecordInputSession(task, {
      type: 'updateDraft',
      formData: { 内容: '整理代码', 日期: '2026-06-30' },
      fieldSources: { 内容: 'user', 日期: 'context' },
      selectedTemplateVariantId: 'task-default',
    });
    const backToHabit = reduceRecordInputSession(editedTask, { type: 'switchRecordType', blockId: 'core.habit' });
    const backToTask = reduceRecordInputSession(backToHabit, { type: 'switchRecordType', blockId: 'core.task' });

    expect(backToHabit.formData.内容).toBe('喝水');
    expect(backToTask.formData.内容).toBe('整理代码');
    expect(backToTask.selectedTemplateVariantId).toBe('task-default');
  });

  it('clears goal context without dropping user draft content', () => {
    const state = initializeRecordInputSession({
      initialBlockId: 'core.task',
      initialFormData: {
        内容: '保留用户输入',
        goalId: 'goal-old',
        goalPath: '旧目标',
        周期: '旧周期',
        templateId: 'old-template',
      },
      initialFieldSources: {
        内容: 'user',
        goalId: 'goal_context',
        goalPath: 'goal_context',
        周期: 'system_auto',
        templateId: 'system_auto',
      },
      initialSelection: {
        selectedGoalId: 'goal-old',
        selectedGoalPath: '旧目标',
        selectedTemplateVariantId: 'old-template',
      },
    });

    const cleared = reduceRecordInputSession(state, { type: 'clearGoalContext' });

    expect(cleared.formData.内容).toBe('保留用户输入');
    expect(cleared.formData.goalId).toBeUndefined();
    expect(cleared.formData.周期).toBeUndefined();
    expect(cleared.selectedGoalId).toBeNull();
    expect(cleared.selectedTemplateVariantId).toBeNull();
  });
  it('changes operation mode without clearing current draft', () => {
    const state = initializeRecordInputSession({
      mode: 'edit',
      initialBlockId: 'core.task',
      initialFormData: { 内容: '已有修改' },
      initialFieldSources: { 内容: 'user' },
    });

    const converted = reduceRecordInputSession(state, { type: 'setMode', mode: 'convert' });

    expect(converted.mode).toBe('convert');
    expect(converted.currentBlockId).toBe('core.task');
    expect(converted.formData.内容).toBe('已有修改');
    expect(converted.revision).toBe(state.revision + 1);
  });

});
