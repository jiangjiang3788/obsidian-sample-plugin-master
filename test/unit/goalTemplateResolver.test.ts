/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F035/regression
 * @covers F035/unit
 * @covers F036/unit
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';

function baseSettings(): ThinkSettings {
  return {
    groups: [], viewInstances: [], layouts: [],
    goalSettings: {
      goals: [{ path: '产品化/目标中心', status: 'active', metrics: [], createdAt: '', updatedAt: '' }],
      goalTemplates: [],
    },
    floatingTimerEnabled: true,
  } as any;
}

describe('GoalTemplateResolver Goal-only', () => {
  it('falls back to the registered RecordType when the Goal has no custom template', () => {
    const result = GoalTemplateResolver.resolve({ settings: baseSettings(), blockId: 'core.task', goalPath: '产品化/目标中心' });
    expect(result.templateSourceType).toBe('record-type');
    expect(result.goal?.path).toBe('产品化/目标中心');
    expect(result.template?.id).toBe('core.task');
  });


  it('requires an enabled direct Goal x RecordType template for create capture', () => {
    const missing = GoalTemplateResolver.resolve({
      settings: baseSettings(),
      recordTypeId: 'core.task',
      goalPath: '产品化/目标中心',
      requireDirectGoalTemplate: true,
    });
    expect(missing.status).toBe('missing-goal-template');
    expect(missing.template).toBeNull();

    const noGoal = GoalTemplateResolver.resolve({
      settings: baseSettings(),
      recordTypeId: 'core.task',
      requireDirectGoalTemplate: true,
    });
    expect(noGoal.status).toBe('goal-required');
    expect(noGoal.template).toBeNull();
  });

  it('resolves the single Goal x RecordType override', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalTemplates.push({
      goalPath: '产品化/目标中心', recordTypeId: 'core.task', enabled: true,
      defaultValues: { priority: 'high' },
    } as any);
    const result = GoalTemplateResolver.resolve({ settings, blockId: 'core.task', goalPath: '产品化/目标中心' });
    expect(result.templateSourceType).toBe('goal-template');
    expect(result.template?.fields.find((field) => field.key === 'priority')?.defaultValue).toBe('high');
  });

  it('does not inherit a parent Goal template when the child owns none', () => {
    const settings = baseSettings();
    settings.goalSettings!.goals.push({ path: '产品化/目标中心/插件', status: 'active', metrics: [], createdAt: '', updatedAt: '' } as any);
    settings.goalSettings!.goalTemplates.push({ goalPath: '产品化/目标中心', recordTypeId: 'core.task', enabled: true, targetFile: '01/父目标.md' } as any);
    const result = GoalTemplateResolver.resolve({ settings, blockId: 'core.task', goalPath: '产品化/目标中心/插件' });
    expect(result.templateSourceType).toBe('record-type');
    expect(result.template?.targetFile).toBe('01/目标.md');
  });
  it('treats an explicit disabled Goal x RecordType as unavailable instead of falling back', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalTemplates.push({
      goalPath: '产品化/目标中心', recordTypeId: 'core.habit', enabled: false,
    } as any);
    const result = GoalTemplateResolver.resolve({ settings, recordTypeId: 'core.habit', goalPath: '产品化/目标中心' });
    expect(result.status).toBe('disabled');
    expect(result.template).toBeNull();
    expect(result.templateSourceType).toBe('goal-template');
  });

});
