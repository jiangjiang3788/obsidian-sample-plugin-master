/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F027/integration
 * @covers F042/integration
 */
import { hydrateQuickInputTemplateDefaults, applyQuickInputFieldUpdate, finalizeQuickInputFormData } from '@/features/quickinput/editor/QuickInputEditorModel';

const template: any = {
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
    } as any);
    expect(hydrated.formData.内容).toBe('默认 学习/英语');
    expect(hydrated.formData.优先级).toEqual({ value: 'medium', label: '中' });
    expect(hydrated.fieldSources.优先级).toBe('template_default');

    const updated = applyQuickInputFieldUpdate({
      formData: hydrated.formData,
      fieldSources: hydrated.fieldSources,
      key: '优先级', value: { value: 'high', label: '高' }, isOptionObject: true,
      timeDirection: 'forward',
    } as any);
    expect(updated.fieldSources.优先级).toBe('user');
    const finalized = finalizeQuickInputFormData(updated.formData);
    expect(finalized.优先级).toEqual({ value: 'high', label: '高' });
  });
});
