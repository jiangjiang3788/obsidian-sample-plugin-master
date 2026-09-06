/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F027/integration
 * @covers F042/integration
 */
import { hydrateQuickInputTemplateDefaults, applyQuickInputFieldUpdate, finalizeQuickInputFormData } from '@/features/quickinput/editor/QuickInputEditorModel';

const template = {
  fields: [
    { id: 'content', key: '内容', label: '内容', type: 'text', required: true, defaultValue: '默认 {{goal.path}}' },
    { id: 'priority', key: '优先级', label: '优先级', type: 'singleSelect', options: [{ value: 'medium', label: '中' }, { value: 'high', label: '高' }], defaultValue: 'medium' },
    { id: 'date', key: '日期', label: '日期', type: 'date' },
  ],
};

describe('模板字段 → 默认值水合 → 用户修改 → 提交表单组合', () => {
  it('模板默认值带来源进入编辑状态，用户修改后来源转为 user，最终表单保留 canonical 值', () => {
    const hydrated = hydrateQuickInputTemplateDefaults({
      template,
      context: {},
      current: {},
      fieldSources: {},
      selectedGoal: { path: '学习/英语' },
      currentGoalPath: '学习/英语',
      currentGoalTitle: '英语',
      timeDirection: 'forward',
    } as never);
    expect(hydrated.formData.内容).toBe('默认 学习/英语');
    expect(hydrated.formData.优先级).toEqual({ value: 'medium', label: '中' });
    expect(hydrated.fieldSources.优先级).toBe('template_default');

    const updated = applyQuickInputFieldUpdate({
      formData: hydrated.formData,
      fieldSources: hydrated.fieldSources,
      key: '优先级', value: { value: 'high', label: '高' }, isOptionObject: true,
      timeDirection: 'forward',
    } as never);
    expect(updated.fieldSources.优先级).toBe('user');
    const finalized = finalizeQuickInputFormData(updated.formData);
    expect(finalized.优先级).toEqual({ value: 'high', label: '高' });
  });

  it('用户把模板默认值清空后，后续水合不会把默认值自动填回来', () => {
    const first = hydrateQuickInputTemplateDefaults({
      template,
      context: {},
      current: {},
      fieldSources: {},
      selectedGoal: { path: '学习/英语' },
      currentGoalPath: '学习/英语',
      currentGoalTitle: '英语',
      timeDirection: 'forward',
    } as never);
    expect(first.formData.内容).toBe('默认 学习/英语');

    const cleared = applyQuickInputFieldUpdate({
      formData: first.formData,
      fieldSources: first.fieldSources,
      key: '内容',
      value: '',
      timeDirection: 'forward',
    } as never);
    expect(cleared.formData.内容).toBe('');
    expect(cleared.fieldSources.内容).toBe('user');

    const hydratedAgain = hydrateQuickInputTemplateDefaults({
      template,
      context: {},
      current: cleared.formData,
      fieldSources: cleared.fieldSources,
      selectedGoal: { path: '学习/英语' },
      currentGoalPath: '学习/英语',
      currentGoalTitle: '英语',
      timeDirection: 'forward',
    } as never);

    expect(hydratedAgain.formData.内容).toBe('');
    expect(hydratedAgain.fieldSources.内容).toBe('user');
  });

  it('用户把多选模板默认值清空为 [] 后同样保持为空', () => {
    const multiTemplate = {
      fields: [{
        id: 'contexts', key: 'availabilityContexts', label: '场景', type: 'multiSelect',
        options: [{ value: 'work', label: '工作' }, { value: 'home', label: '家' }],
        defaultValue: 'work,home',
      }],
    };
    const first = hydrateQuickInputTemplateDefaults({
      template: multiTemplate,
      context: {},
      current: {},
      fieldSources: {},
      selectedGoal: { path: '工作能力' },
      currentGoalPath: '工作能力',
      currentGoalTitle: '工作能力',
      timeDirection: 'forward',
    } as never);
    expect(first.formData.availabilityContexts).toEqual(['work', 'home']);
    const cleared = applyQuickInputFieldUpdate({
      formData: first.formData,
      fieldSources: first.fieldSources,
      key: 'availabilityContexts',
      value: [],
      timeDirection: 'forward',
    } as never);
    const hydratedAgain = hydrateQuickInputTemplateDefaults({
      template: multiTemplate,
      context: {},
      current: cleared.formData,
      fieldSources: cleared.fieldSources,
      selectedGoal: { path: '工作能力' },
      currentGoalPath: '工作能力',
      currentGoalTitle: '工作能力',
      timeDirection: 'forward',
    } as never);

    expect(hydratedAgain.formData.availabilityContexts).toEqual([]);
    expect(hydratedAgain.fieldSources.availabilityContexts).toBe('user');
  });


  it('AI/调用上下文明确值优先于 Goal 模板默认值，未明确的资源字段继续由模板补齐，currentContext 不会污染 Task 可用场景', () => {
    const taskTemplate = {
      fields: [
        { id: 'brain', key: 'brainDemand', label: '脑力要求', type: 'singleSelect', options: [{ value: 'low', label: '低' }, { value: 'high', label: '高' }], defaultValue: 'low' },
        { id: 'physical', key: 'physicalDemand', label: '体力要求', type: 'singleSelect', options: [{ value: 'low', label: '低' }, { value: 'high', label: '高' }], defaultValue: 'low' },
        { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', options: [{ value: 'medium', label: '中' }, { value: 'high', label: '高' }], defaultValue: 'high' },
        { id: 'contexts', key: 'availabilityContexts', label: '场景', type: 'multiSelect', options: [{ value: 'work', label: '工作' }, { value: 'home', label: '家' }, { value: 'out', label: '外出' }], defaultValue: 'work,home' },
      ],
    };
    const hydrated = hydrateQuickInputTemplateDefaults({
      template: taskTemplate,
      context: {
        brainDemand: 'high',
        availabilityContexts: ['out'],
        currentContext: 'home',
      },
      current: {},
      fieldSources: {},
      selectedGoal: { path: '爱好能力/武装大脑' },
      currentGoalPath: '爱好能力/武装大脑',
      currentGoalTitle: '武装大脑',
      timeDirection: 'forward',
    } as never);

    expect(hydrated.formData.brainDemand).toEqual({ value: 'high', label: '高' });
    expect(hydrated.fieldSources.brainDemand).toBe('context');
    expect(hydrated.formData.physicalDemand).toEqual({ value: 'low', label: '低' });
    expect(hydrated.fieldSources.physicalDemand).toBe('template_default');
    expect(hydrated.formData.priority).toEqual({ value: 'high', label: '高' });
    expect(hydrated.formData.availabilityContexts).toEqual(['out']);
    expect(hydrated.fieldSources.availabilityContexts).toBe('context');
  });

});
