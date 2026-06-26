import {
  applyQuickInputLinkedTimeChanges,
  buildInitialFieldSources,
  hydrateQuickInputTemplateDefaults,
} from '@/app/ui/components/QuickInputEditor/QuickInputEditorModel';

describe('QuickInputEditorModel', () => {
  it('marks meaningful initial fields as context sources and skips editor meta fields', () => {
    expect(buildInitialFieldSources({ 内容: '记录', 空值: '', __timeDirection: 'forward', lastChanged: '时间' })).toEqual({ 内容: 'context' });
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

  it('keeps linked time draft cleanup inside the model layer', () => {
    const linked = applyQuickInputLinkedTimeChanges({ 时间: '09:00', 时长: 30, lastChanged: '时间' }, 'forward');
    expect(linked.formData.lastChanged).toBeUndefined();
  });
});
