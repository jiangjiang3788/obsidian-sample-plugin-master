import type { ThinkSettings } from '@/core/types/schema';
import { DEFAULT_CORE_BLOCK_SETTINGS } from '@/core/blocks';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';

function baseSettings(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    inputSettings: {
      blocks: [],
      themes: [{ id: 'theme-work', path: '工作/插件', icon: '🧩' }],
      overrides: [
        {
          id: 'override-theme-task',
          blockId: 'core.task',
          themeId: 'theme-work',
          outputTemplate: '主题覆盖模板不应主导新链',
        },
      ],
    },
    goalSettings: {
      goals: [
        {
          id: 'goal.plugin',
          title: '目标中心',
          goalPath: '产品化/目标中心',
          status: 'active',
          themePath: '工作/插件',
          granularity: 'week',
          metrics: [],
          createdAt: '2026-06-06T00:00:00.000Z',
          updatedAt: '2026-06-06T00:00:00.000Z',
        },
      ],
      cycles: [],
      goalBlockBindings: [],
      goalRecordRelations: [],
    },
    coreBlockSettings: DEFAULT_CORE_BLOCK_SETTINGS,
    floatingTimerEnabled: true,
    activeThemePaths: [],
  };
}

describe('GoalTemplateResolver', () => {
  it('uses core block template and treats theme as metadata only', () => {
    const result = GoalTemplateResolver.resolve({
      settings: baseSettings(),
      blockId: 'core.task',
      goalId: 'goal.plugin',
    });
    expect(result.templateSourceType).toBe('core-block');
    expect(result.theme?.icon).toBe('🧩');
    expect(result.template?.outputTemplate).not.toBe('主题覆盖模板不应主导新链');
  });

  it('uses goal + block template when a goal template exists', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalBlockBindings.push({
      id: 'binding.goal.plugin.core.task',
      goalId: 'goal.plugin',
      coreBlockId: 'core.task',
      enabled: true,
      outputTemplate: '目标模板',
      createdAt: '2026-06-06T00:00:00.000Z',
      updatedAt: '2026-06-06T00:00:00.000Z',
    });

    const result = GoalTemplateResolver.resolve({
      settings,
      blockId: 'core.task',
      goalPath: '产品化/目标中心',
    });
    expect(result.templateSourceType).toBe('goal-template');
    expect(result.template?.outputTemplate).toBe('目标模板');
  });
});
