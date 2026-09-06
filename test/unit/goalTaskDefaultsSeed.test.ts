import { applyGoalTaskDefaultsSeed, GOAL_TASK_DEFAULTS_SEED_VERSION } from '../../src/core/settings/goalTaskDefaultsSeed';
import type { ThinkSettings } from '../../src/core/settings/ThinkSettings';

describe('Goal Task defaults one-time seed', () => {
  it('applies authored defaults to existing direct task templates once and never re-overwrites later edits', () => {
    const base = {
      groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
      goalSettings: {
        goals: [{ path: '武装大脑', status: 'active', createdAt: '', updatedAt: '' }],
        goalTemplates: [{ goalPath: '武装大脑', recordTypeId: 'core.task', enabled: true, defaultValues: { 任务内容: 'x' } }],
      },
    } as ThinkSettings;
    const first = applyGoalTaskDefaultsSeed(base);
    expect(first.changed).toBe(true);
    expect(first.settings.goalTaskDefaultsSeedVersion).toBe(GOAL_TASK_DEFAULTS_SEED_VERSION);
    expect(first.settings.goalSettings?.goalTemplates[0].defaultValues).toMatchObject({
      任务内容: 'x', brainDemand: 'high', physicalDemand: 'medium', importance: 'important', urgency: 'normal', priority: 'highest', availabilityContexts: ['any'], recurrenceUnit: 'month',
    });
    const edited = {
      ...first.settings,
      goalSettings: {
        ...first.settings.goalSettings!,
        goalTemplates: first.settings.goalSettings!.goalTemplates.map((t) => ({ ...t, defaultValues: { ...(t.defaultValues || {}), priority: 'low' } })),
      },
    };
    const second = applyGoalTaskDefaultsSeed(edited);
    expect(second.changed).toBe(false);
    expect(second.settings.goalSettings?.goalTemplates[0].defaultValues?.priority).toBe('low');
  });
});
