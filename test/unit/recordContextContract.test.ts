import { applyRecordGoalContext, resolveRecordGoalPath } from '@core/recordInput/public';
import { hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import type { QuickInputFieldSourceMap, QuickInputTemplateLike } from '@/features/quickinput/editor/model/types';

const simpleTemplate: QuickInputTemplateLike = {
  id: 'core.test',
  name: '测试',
  fields: [
    { id: 'date', key: '日期', label: '日期', type: 'date' },
    { id: 'title', key: '内容', label: '内容', type: 'text', defaultValue: '模板默认' },
    { id: 'mood', key: 'mood', label: '心情', type: 'singleSelect', defaultValue: 'neutral', options: [
      { value: 'neutral', label: '一般' },
      { value: 'good', label: '很好' },
    ] },
  ],
};

function hydrate(context: Record<string, unknown>, current: Record<string, unknown> = {}, fieldSources: QuickInputFieldSourceMap = {}) {
  return hydrateQuickInputTemplateDefaults({
    template: simpleTemplate,
    context,
    current,
    fieldSources,
    selectedGoal: null,
    currentGoalPath: null,
    currentGoalTitle: null,
    currentPeriod: null,
    timeDirection: 'forward',
  });
}

describe('Record invocation context contract', () => {
  it('uses one deterministic Goal precedence from explicit selection down to item fallback', () => {
    const common = {
      formData: { goalPath: '表单/目标' },
      context: {
        goalPath: '直接/上下文',
        __recordUiContext: { goalContext: { goalPath: 'UI/目标' } },
      },
      item: { goalPath: '记录/目标' } as never,
    };

    expect(resolveRecordGoalPath({ ...common, selectedGoalPath: '用户/选择' })).toBe('用户/选择');
    expect(resolveRecordGoalPath(common)).toBe('表单/目标');
    expect(resolveRecordGoalPath({ ...common, formData: {} })).toBe('直接/上下文');
    expect(resolveRecordGoalPath({ ...common, formData: {}, context: { __recordUiContext: { goalContext: { goalPath: 'UI/目标' } } } })).toBe('UI/目标');
    expect(resolveRecordGoalPath({ formData: {}, context: {}, item: { goalPath: '记录/目标' } as never })).toBe('记录/目标');
  });

  it('expands a Goal context into canonical path/root/leaf fields without overwriting source ownership', () => {
    const applied = applyRecordGoalContext({
      formData: { 内容: '记录' },
      context: { __recordUiContext: { goalContext: { goalPath: '生活/健康/睡眠' } } },
      fieldSources: { 内容: 'user' },
    });

    expect(applied.goalPath).toBe('生活/健康/睡眠');
    expect(applied.formData).toMatchObject({
      内容: '记录',
      goalPath: '生活/健康/睡眠',
      rootGoal: '生活',
      leafGoal: '睡眠',
    });
    expect(applied.fieldSources).toMatchObject({
      内容: 'user',
      goalPath: 'goal_context',
      rootGoal: 'goal_context',
      leafGoal: 'goal_context',
    });
  });

  it('lets invocation context beat template defaults and accepts either field key or label', () => {
    const result = hydrate({
      日期: '2026-05-13',
      内容: '来自视图',
      心情: '很好',
    });

    expect(result.formData).toMatchObject({
      日期: '2026-05-13',
      内容: '来自视图',
      mood: { value: 'good', label: '很好' },
    });
    expect(result.fieldSources).toMatchObject({
      日期: 'context',
      内容: 'context',
      mood: 'context',
    });
  });

  it('never lets later context overwrite a user-owned field', () => {
    const result = hydrate(
      { 内容: '视图想覆盖', 日期: '2026-05-13' },
      { 内容: '用户已经修改', 日期: '2026-05-12' },
      { 内容: 'user', 日期: 'context' },
    );

    expect(result.formData.内容).toBe('用户已经修改');
    expect(result.fieldSources.内容).toBe('user');
    expect(result.formData.日期).toBe('2026-05-13');
    expect(result.fieldSources.日期).toBe('context');
  });

  it('keeps UI metadata outside editable form fields unless an actual template field consumes it', () => {
    const result = hydrate({
      内容: '正文',
      __recordUiContext: {
        kind: 'timeline_create',
        timeContext: { clickedMinute: 300 },
        filterContext: { filters: [{ field: 'status', op: '=', value: 'open' }] },
      },
    });

    expect(result.formData.内容).toBe('正文');
    expect(result.formData).not.toHaveProperty('__recordUiContext');
  });
});
