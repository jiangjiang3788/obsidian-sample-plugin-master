/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F035/unit
 * @covers F037/unit
 * Goal -> Task 默认值 seed 的可移植合同。
 *
 * 不读取仓库根 data.json：用户数据属于运行时输入，不能作为源码测试夹具。
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { applyGoalTaskDefaultsSeed, GOAL_TASK_DEFAULTS_SEED_VERSION } from '@/core/settings/goalTaskDefaultsSeed';

const requiredDefaultKeys = [
  'brainDemand', 'physicalDemand', 'importance', 'urgency', 'priority', 'availabilityContexts', 'recurrenceUnit',
] as const;

function settingsWithTaskGoals(): ThinkSettings {
  return {
    groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
    goalTaskDefaultsSeedVersion: 0,
    goalSettings: {
      goals: [
        { path: '武装大脑', status: 'active' },
        { path: '工作能力/通勤', status: 'active' },
        { path: '仪容仪表/剪头发', status: 'active' },
      ],
      goalTemplates: [
        { goalPath: '武装大脑', recordTypeId: 'core.task', enabled: true, defaultValues: { 自定义: '保留' } },
        { goalPath: '工作能力/通勤', recordTypeId: 'core.task', enabled: true },
        { goalPath: '仪容仪表/剪头发', recordTypeId: 'core.task', enabled: true },
        { goalPath: '武装大脑', recordTypeId: 'core.review', enabled: true, defaultValues: { 不应被改: true } },
      ],
    },
  } as ThinkSettings;
}

describe('Goal Task defaults seed', () => {
  it('只迁移已声明的 core.task 模板，并保留用户自定义默认值', () => {
    const result = applyGoalTaskDefaultsSeed(settingsWithTaskGoals());
    expect(result.changed).toBe(true);
    expect(result.appliedTemplateCount).toBe(3);
    expect(result.settings.goalTaskDefaultsSeedVersion).toBe(GOAL_TASK_DEFAULTS_SEED_VERSION);

    const templates = result.settings.goalSettings?.goalTemplates || [];
    const tasks = templates.filter((template) => template.recordTypeId === 'core.task');
    expect(tasks).toHaveLength(3);
    for (const template of tasks) {
      const defaults = template.defaultValues || {};
      for (const key of requiredDefaultKeys) expect(defaults).toHaveProperty(key);
      expect(defaults).not.toHaveProperty('energyDemand');
      expect(Array.isArray(defaults.availabilityContexts)).toBe(true);
    }
    expect(tasks.find((template) => template.goalPath === '武装大脑')?.defaultValues).toEqual(expect.objectContaining({ 自定义: '保留' }));
    expect(templates.find((template) => template.recordTypeId === 'core.review')?.defaultValues).toEqual({ 不应被改: true });
  });

  it('关键 Goal seed 值与当前合同一致，并且第二次运行不覆盖用户编辑', () => {
    const once = applyGoalTaskDefaultsSeed(settingsWithTaskGoals()).settings;
    const byGoal = new Map((once.goalSettings?.goalTemplates || [])
      .filter((template) => template.recordTypeId === 'core.task')
      .map((template) => [template.goalPath, template.defaultValues || {}]));

    expect(byGoal.get('武装大脑')).toEqual(expect.objectContaining({
      brainDemand: 'high', physicalDemand: 'medium', importance: 'important', urgency: 'normal',
      priority: 'highest', availabilityContexts: ['any'], recurrenceUnit: 'month',
    }));
    expect(byGoal.get('工作能力/通勤')).toEqual(expect.objectContaining({ availabilityContexts: ['commute'] }));
    expect(byGoal.get('仪容仪表/剪头发')).toEqual(expect.objectContaining({ availabilityContexts: ['out'] }));

    const edited: ThinkSettings = {
      ...once,
      goalSettings: {
        ...once.goalSettings!,
        goalTemplates: once.goalSettings!.goalTemplates.map((template) => template.goalPath === '武装大脑' && template.recordTypeId === 'core.task'
          ? { ...template, defaultValues: { ...(template.defaultValues || {}), priority: 'lowest' } }
          : template),
      },
    };
    const twice = applyGoalTaskDefaultsSeed(edited);
    expect(twice.changed).toBe(false);
    expect(twice.appliedTemplateCount).toBe(0);
    expect(twice.settings.goalSettings?.goalTemplates.find((template) => template.goalPath === '武装大脑' && template.recordTypeId === 'core.task')?.defaultValues?.priority).toBe('lowest');
  });
});
