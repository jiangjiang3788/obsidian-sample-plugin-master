import { DEFAULT_GOAL_SETTINGS, getGoalTemplateId, getGoalTemplates, removeGoalTemplateFromSettings, upsertGoalTemplateInSettings } from '../../src/core/goal';

describe('GoalTemplate storage helpers', () => {
  it('upserts and removes templates while hiding legacy storage details', () => {
    const template: any = {
      id: getGoalTemplateId('goal.a', 'core.task'),
      goalId: 'goal.a',
      coreBlockId: 'core.task',
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const next = upsertGoalTemplateInSettings(DEFAULT_GOAL_SETTINGS, template);
    expect(getGoalTemplates(next)).toHaveLength(1);
    const removed = removeGoalTemplateFromSettings(next, 'goal.a', 'core.task');
    expect(getGoalTemplates(removed)).toHaveLength(0);
  });
});


import { compactGoalTemplateForStorage, describeGoalTemplateStorageDiff, DEFAULT_CORE_BLOCKS } from '@/core/public';
import type { GoalTemplate, GoalDefinition } from '@/core/public';

const taskBlock = DEFAULT_CORE_BLOCKS.find((block) => block.id === 'core.task')!;
const planBlock = DEFAULT_CORE_BLOCKS.find((block) => block.id === 'core.plan')!;

const goal: GoalDefinition = {
  id: 'goal.plugin',
  title: '插件',
  goalPath: '插件',
  status: 'active',
  themePath: '电脑/记录系统',
  metrics: [],
  createdAt: '2026-06-23T00:00:00.000Z',
  updatedAt: '2026-06-23T00:00:00.000Z',
};

describe('Template Variant differential storage', () => {
  it('removes fields and output settings that are identical to the CoreBlock', () => {
    const template: GoalTemplate = {
      id: 'goal-template.goal.plugin.core.task.default',
      goalId: goal.id,
      coreBlockId: 'core.task',
      variantId: 'default',
      name: '默认任务',
      enabled: true,
      fields: taskBlock.fields as any,
      targetFile: taskBlock.targetFile,
      appendUnderHeader: taskBlock.appendUnderHeader,
      defaultValues: {
        goalId: goal.id,
        goalPath: goal.goalPath,
        templateId: 'old-template',
        templateSourceType: 'legacy',
        themePath: goal.themePath,
        icon: '🧩',
      },
      requiredFields: [],
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    };

    const compacted = compactGoalTemplateForStorage(template, { coreBlock: taskBlock, goal });

    expect(compacted.fields).toBeUndefined();
    expect((compacted as any).outputTemplate).toBeUndefined();
    expect(compacted.targetFile).toBeUndefined();
    expect(compacted.appendUnderHeader).toBeUndefined();
    expect(compacted.requiredFields).toBeUndefined();
    expect(compacted.defaultValues).toEqual({ icon: '🧩' });
    expect(compacted.periodPolicy).toBeUndefined();
  });

  it('keeps periodPolicy only for plan/review templates', () => {
    const taskTemplate = compactGoalTemplateForStorage({
      id: 'task-template',
      goalId: goal.id,
      coreBlockId: 'core.task',
      variantId: 'default',
      enabled: true,
      periodPolicy: { enabled: true, granularity: 'month' },
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }, { coreBlock: taskBlock, goal });

    const planTemplate = compactGoalTemplateForStorage({
      id: 'plan-template',
      goalId: goal.id,
      coreBlockId: 'core.plan',
      variantId: 'default',
      enabled: true,
      periodPolicy: { enabled: true, granularity: 'quarter' },
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }, { coreBlock: planBlock, goal });

    expect(taskTemplate.periodPolicy).toBeUndefined();
    expect(planTemplate.periodPolicy).toEqual({ enabled: true, granularity: 'quarter' });
    expect(describeGoalTemplateStorageDiff(planTemplate)).toContain('周期 quarter');
  });
});
