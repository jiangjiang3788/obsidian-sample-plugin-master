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
