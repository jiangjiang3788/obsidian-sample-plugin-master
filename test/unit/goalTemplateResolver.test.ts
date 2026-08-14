import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_CORE_BLOCK_SETTINGS } from '@/core/blocks';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';

function baseSettings(): ThinkSettings {
  return {
    schemaVersion: 5,
    groups: [],
    viewInstances: [],
    layouts: [],
    inputSettings: {
      blocks: [],
      themes: [{ id: 'theme-work', path: '工作/插件', icon: '🧩' }],
    },
    goalSettings: {
      goals: [
        {
          id: 'goal.plugin',
          title: '目标中心',
          goalPath: '产品化/目标中心',
          status: 'active',
          themePath: '工作/插件',
          metrics: [],
          createdAt: '2026-06-06T00:00:00.000Z',
          updatedAt: '2026-06-06T00:00:00.000Z',
        },
      ],
        goalTemplates: [],
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
    expect(result.template?.id).toBe('core.task');
  });

  it('uses goal + block template when a goal template exists', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalTemplates.push({
      id: 'binding.goal.plugin.core.task',
      goalId: 'goal.plugin',
      coreBlockId: 'core.task',
      enabled: true,
      defaultValues: { themePath: '工作/插件' },
      createdAt: '2026-06-06T00:00:00.000Z',
      updatedAt: '2026-06-06T00:00:00.000Z',
    });

    const result = GoalTemplateResolver.resolve({
      settings,
      blockId: 'core.task',
      goalId: 'goal.plugin',
    });
    expect(result.templateSourceType).toBe('goal-template');
    expect(result.template?.fields.find((field) => field.key === 'themePath')?.defaultValue).toBe('工作/插件');
    expect(result.template?.fields.length).toBeGreaterThan(0);
  });
  it('preserves template theme context even when a custom preset omits the theme field from visible fields', () => {
    const settings = baseSettings();
    settings.goalSettings!.goalTemplates.push({
      id: 'goal-template.goal.plugin.core.task',
      goalId: 'goal.plugin',
      coreBlockId: 'core.task',
      enabled: true,
      fields: [
        { id: 'body', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
      ],
      defaultValues: { themePath: '工作/模板主题' },
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    });

    const result = GoalTemplateResolver.resolve({
      settings,
      blockId: 'core.task',
      goalId: 'goal.plugin',
    });

    expect(result.template?.fields.find((field) => field.key === 'themePath')?.defaultValue).toBe('工作/模板主题');
  });

});
