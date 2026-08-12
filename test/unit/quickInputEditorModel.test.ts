import {
  applyQuickInputFieldUpdate,
  applyQuickInputGoalSelection,
  applyQuickInputLinkedTimeChanges,
  applyQuickInputTimeDirectionChange,
  buildInitialFieldSources,
  buildQuickInputEditorState,
  buildQuickInputGoalOptions,
  buildQuickInputPeriodUi,
  deriveQuickInputInitialSelection,
  hydrateQuickInputTemplateDefaults,
  preserveQuickInputBlockSwitchState,
} from '@features/quickinput/editor/QuickInputEditorModel';

describe('QuickInputEditorModel', () => {


  it('lists active goals without GoalTemplate requirements for direct record types', () => {
    const settings = {
      schemaVersion: 2,
      groups: [],
      viewInstances: [],
      layouts: [],
      inputSettings: { blocks: [], themes: [] },
      goalSettings: {
        goals: [
          { id: 'goal-a', title: '生活', goalPath: '生活', status: 'active', createdAt: '', updatedAt: '' },
          { id: 'goal-b', title: '归档', goalPath: '归档', status: 'archived', createdAt: '', updatedAt: '' },
        ],
        goalTemplates: [],
      },
      floatingTimerEnabled: true,
    } as any;

    expect(buildQuickInputGoalOptions(settings, '', { requirePreset: false }).map((goal) => goal.id)).toEqual(['goal-a']);
    expect(buildQuickInputGoalOptions(settings, 'core.plan').map((goal) => goal.id)).toEqual([]);
  });


  it('derives initial goal/template selection from form data before invocation context', () => {
    const selection = deriveQuickInputInitialSelection(
      { goalId: 'goal-form', goalPath: '学习/英语', templateVariantId: 'preset-a', __timeDirection: 'backward' },
      { goalId: 'goal-context', goalPath: '工作' },
    );
    expect(selection).toMatchObject({
      selectedGoalId: 'goal-form',
      selectedGoalPath: '学习/英语',
      selectedTemplateVariantId: 'preset-a',
      timeDirection: 'backward',
    });
  });

  it('marks meaningful initial fields as context sources and skips editor meta fields', () => {
    expect(buildInitialFieldSources({ 内容: '记录', 空值: '', __timeDirection: 'forward', lastChanged: '时间' })).toEqual({ 内容: 'context' });
  });

  it('can mark edit backfilled initial fields explicitly', () => {
    expect(buildInitialFieldSources({ 内容: '旧记录', 日期: '2026-06-30' }, 'edit_backfill')).toEqual({
      内容: 'edit_backfill',
      日期: 'edit_backfill',
    });
  });

  it('applies template defaults without overwriting user-owned fields', () => {
    const hydrated = hydrateQuickInputTemplateDefaults({
      template: {
        fields: [
          { key: '内容', type: 'text', defaultValue: '默认内容' },
          { key: '状态', type: 'select', options: [{ value: 'todo', label: '待办' }] },
        ],
      },
      current: { 内容: '用户输入' },
      fieldSources: { 内容: 'user' },
      selectedGoal: { id: 'goal-1', title: '学习', goalPath: '学习' } as any,
      currentGoalPath: '学习',
      currentGoalTitle: '学习',
      timeDirection: 'forward',
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.formData.内容).toBe('用户输入');
    expect(hydrated.fieldSources.内容).toBe('user');
    expect(hydrated.formData.状态).toEqual({ value: 'todo', label: '待办' });
    expect(hydrated.fieldSources.状态).toBe('system_auto');
  });



  it('updates a user field and returns goal/theme selection side effects', () => {
    const updated = applyQuickInputFieldUpdate({
      formData: { 内容: '旧内容' },
      fieldSources: { 内容: 'context' } as any,
      key: '目标',
      value: '学习/英语',
      timeDirection: 'forward',
    });
    expect(updated.formData['目标']).toBe('学习/英语');
    expect(updated.fieldSources['目标']).toBe('user');
    expect(updated.nextGoalPath).toBe('学习/英语');
    expect(updated.nextGoalId).toBe('goal:学习/英语');
  });

  it('applies backward time direction defaults inside the model layer', () => {
    const updated = applyQuickInputTimeDirectionChange({
      formData: { 时间: '09:00', 时长: 30 },
      fieldSources: { 时间: 'user', 时长: 'user' } as any,
      nextDirection: 'backward',
      defaultEndTime: '10:00',
    });
    expect(updated.timeDirection).toBe('backward');
    expect(updated.formData['结束']).toBe('10:00');
    expect(updated.fieldSources['结束']).toBe('system_auto');
  });

  it('keeps linked time draft cleanup inside the model layer', () => {
    const linked = applyQuickInputLinkedTimeChanges({ 时间: '09:00', 时长: 30, lastChanged: '时间' }, 'forward');
    expect(linked.formData.lastChanged).toBeUndefined();
  });


  it('preserves only stable fields when switching block', () => {
    const preserved = preserveQuickInputBlockSwitchState(
      {
        内容: '继续保留',
        日期: '2026-06-30',
        时间: '09:00',
        自定义: '删除',
        goalId: 'goal-1',
        themePath: '学习',
        templateId: 'old-template',
        templateVariantId: 'old-variant',
        周期: '旧周期',
      },
      {
        内容: 'user',
        日期: 'context',
        时间: 'context',
        自定义: 'user',
        goalId: 'goal_context',
        themePath: 'goal_context',
        templateId: 'system_auto',
        templateVariantId: 'system_auto',
        周期: 'system_auto',
      } as any,
    );
    expect(preserved.formData).toEqual({ 内容: '继续保留', 日期: '2026-06-30', 时间: '09:00', goalId: 'goal-1', themePath: '学习' });
    expect(preserved.fieldSources).toEqual({ 内容: 'user', 日期: 'context', 时间: 'context', goalId: 'goal_context', themePath: 'goal_context' });
  });

  it('applies goal selection without overwriting user-owned fields', () => {
    const selected = applyQuickInputGoalSelection({
      formData: { 目标: '用户选择', 内容: '记录' },
      fieldSources: { 目标: 'user', 内容: 'user' } as any,
      option: { id: 'goal-1', value: '学习/英语', label: '英语', goal: { id: 'goal-1', title: '英语', goalPath: '学习/英语', themePath: '学习' } as any, themePath: '学习' },
    });
    expect(selected.goalId).toBe('goal-1');
    expect(selected.formData.目标).toBe('用户选择');
    expect(selected.formData.goalPath).toBe('学习/英语');
    expect(selected.formData.themePath).toBe('学习');
  });

  it('builds QuickInput state with theme path summary and period fields', () => {
    const periodUi = buildQuickInputPeriodUi({ id: '2026-W01', label: '2026 第 1 周', granularity: 'week' });
    const state = buildQuickInputEditorState({
      blockId: 'event',
      effectiveBlockId: 'event',
      selectedGoal: { id: 'goal-1', title: '英语', goalPath: '学习/英语', themePath: '学习/英语' } as any,
      currentGoalPath: '学习/英语',
      currentGoalTitle: '英语',
      currentGoalParts: { root: '学习', leaf: '英语' },
      currentPeriod: { id: '2026-W01', label: '2026 第 1 周' },
      selectedThemeId: 'theme-1',
      themeIdMap: new Map([['theme-1', { id: 'theme-1', path: '学习/英语', icon: '📘' } as any]]),
      formData: { 内容: '听力' },
      currentPeriodFields: periodUi.fields,
      timeDirection: 'forward',
      template: { fields: [] },
      templateId: 'tpl-1',
      resolvedTemplateVariantId: 'preset-1',
      templateSourceType: 'goal-template',
      fieldSources: { 内容: 'user' } as any,
    });
    expect(state.formData.goalTemplateId).toBe('tpl-1');
    expect(state.formData['周期']).toBe('2026 第 1 周');
    expect(state.rootTheme).toBe('学习');
    expect(state.leafTheme).toBe('英语');
    expect(state.fieldSourceSummary?.user).toBe(1);
  });
});


import {
  getQuickInputFailureMessage,
  getQuickInputSubmitLabel,
  getQuickInputSuccessNotice,
  isQuickInputCreateOperation,
  isQuickInputUpdateOperation,
} from '../../src/features/quickinput/modal/quickInputOperationMode';

describe('quickInputOperationMode', () => {
  it('separates create/update semantics for edit operations', () => {
    expect(isQuickInputUpdateOperation('edit')).toBe(true);
    expect(isQuickInputUpdateOperation('convert')).toBe(true);
    expect(isQuickInputCreateOperation('duplicate')).toBe(true);
    expect(isQuickInputCreateOperation('convert')).toBe(false);
  });

  it('uses explicit submit labels for convert and duplicate modes', () => {
    expect(getQuickInputSubmitLabel('convert', false)).toBe('转换并保存');
    expect(getQuickInputSubmitLabel('convert', true)).toBe('转换中...');
    expect(getQuickInputSubmitLabel('duplicate', false)).toBe('另存为新记录');
    expect(getQuickInputSubmitLabel('duplicate', true)).toBe('另存中...');
  });

  it('keeps operation-specific feedback copy', () => {
    expect(getQuickInputFailureMessage('duplicate')).toBe('另存为新记录失败');
    expect(getQuickInputSuccessNotice('duplicate')).toBe('✅ 已另存为新记录');
    expect(getQuickInputSuccessNotice('convert', '✅ 已保存修改')).toBe('✅ 已转换记录类型');
    expect(getQuickInputSuccessNotice('convert', '✅ 已迁移保存：A → B')).toBe('✅ 已迁移保存：A → B');
  });
});


import {
  getQuickInputSelectedValue,
  isQuickInputChoiceSelected,
  normalizeQuickInputChoices,
  toQuickInputOptionObject,
} from '@features/quickinput/editor/components/quickInputOptionSelection';

describe('quickInputOptionSelection', () => {
  it('normalizes primitive and object options for visible single-select pills', () => {
    expect(normalizeQuickInputChoices(['Todo', { value: 'doing', label: 'Doing' }, { label: 'Done' }])).toEqual([
      { value: 'Todo', label: 'Todo' },
      { value: 'doing', label: 'Doing' },
      { value: 'Done', label: 'Done' },
    ]);
  });

  it('detects selected values from both stored option objects and primitive values', () => {
    const choice = { value: 'doing', label: 'Doing' };

    expect(isQuickInputChoiceSelected({ value: 'doing', label: 'Doing' }, choice)).toBe(true);
    expect(isQuickInputChoiceSelected('doing', choice)).toBe(true);
    expect(isQuickInputChoiceSelected('Doing', choice)).toBe(true);
    expect(isQuickInputChoiceSelected('todo', choice)).toBe(false);
  });

  it('stores selected single-select choices as option objects', () => {
    expect(toQuickInputOptionObject({ value: 'done', label: 'Done' })).toEqual({ value: 'done', label: 'Done' });
    expect(getQuickInputSelectedValue({ value: 'done', label: 'Done' })).toBe('done');
  });
});
