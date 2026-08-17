import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_CORE_BLOCK_SETTINGS } from '@/core/blocks';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';

function baseSettings(): ThinkSettings {
  return {
    groups: [], viewInstances: [], layouts: [],
    inputSettings: { blocks: [] },
    goalSettings: {
      goals: [{ path: '产品化/目标中心', status: 'active', metrics: [], createdAt: '', updatedAt: '' }],
      goalTemplates: [],
    },
    coreBlockSettings: DEFAULT_CORE_BLOCK_SETTINGS,
    floatingTimerEnabled: true,
  } as any;
}

describe('GoalTemplateResolver Goal-only', () => {
  it('falls back to the CoreBlock when the Goal has no custom template', () => {
    const result = GoalTemplateResolver.resolve({ settings: baseSettings(), blockId: 'core.task', goalPath: '产品化/目标中心' });
    expect(result.templateSourceType).toBe('core-block');
    expect(result.goal?.path).toBe('产品化/目标中心');
    expect(result.template?.id).toBe('core.task');
  });

  it('resolves the single Goal x CoreBlock override', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalTemplates.push({
      goalPath: '产品化/目标中心', coreBlockId: 'core.task', enabled: true,
      defaultValues: { priority: 'high' },
    } as any);
    const result = GoalTemplateResolver.resolve({ settings, blockId: 'core.task', goalPath: '产品化/目标中心' });
    expect(result.templateSourceType).toBe('goal-template');
    expect(result.template?.fields.find((field) => field.key === 'priority')?.defaultValue).toBe('high');
  });

  it('inherits the nearest parent Goal template when the child owns none', () => {
    const settings = baseSettings();
    settings.goalSettings!.goals.push({ path: '产品化/目标中心/插件', status: 'active', metrics: [], createdAt: '', updatedAt: '' } as any);
    settings.goalSettings!.goalTemplates.push({ goalPath: '产品化/目标中心', coreBlockId: 'core.task', enabled: true, targetFile: '01/父目标.md' } as any);
    const result = GoalTemplateResolver.resolve({ settings, blockId: 'core.task', goalPath: '产品化/目标中心/插件' });
    expect(result.templateSourceType).toBe('goal-template');
    expect(result.template?.targetFile).toBe('01/父目标.md');
  });
});
