/**
 * Goal icon convergence: Goal.icon is the only persisted Goal identity icon.
 */
import { toCurrentThinkSettings, toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';

describe('current settings Goal icon convergence', () => {
  it('backfills one unambiguous legacy template icon to Goal.icon and removes template icon defaults', () => {
    const current = toCurrentThinkSettings({
      groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
      goalSettings: {
        goals: [{ path: '照顾好自己/运动', status: 'active' }],
        goalTemplates: [{
          goalPath: '照顾好自己/运动',
          recordTypeId: 'core.thought',
          enabled: true,
          fields: [
            { id: 'icon', key: 'icon', label: '图标', type: 'text', semantic: 'icon', defaultValue: '💪' },
            { id: 'content', key: '内容', label: '内容', type: 'textarea', defaultValue: '保留' },
          ],
          defaultValues: { icon: '💪', 内容: '保留' },
        }],
      },
    });

    expect(current.goalSettings?.goals[0]?.icon).toBe('💪');
    const template = current.goalSettings?.goalTemplates[0];
    expect(template?.defaultValues).toEqual({ 内容: '保留' });
    expect(template?.fields?.find((field) => field.key === 'icon')?.defaultValue).toBeUndefined();

    const persisted = toPersistedThinkSettings(current) as any;
    expect(persisted.goalSettings.goals[0].icon).toBe('💪');
    expect(persisted.goalSettings.goalTemplates[0].defaultValues).toEqual({ 内容: '保留' });
    expect(persisted.goalSettings.goalTemplates[0].fields.find((field: any) => field.key === 'icon')?.defaultValue).toBeUndefined();
  });

  it('does not invent a Goal.icon when legacy template icons conflict', () => {
    const current = toCurrentThinkSettings({
      groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
      goalSettings: {
        goals: [{ path: '照顾好自己/运动', status: 'active' }],
        goalTemplates: [
          { goalPath: '照顾好自己/运动', recordTypeId: 'core.thought', enabled: true, defaultValues: { icon: '🧘' } },
          { goalPath: '照顾好自己/运动', recordTypeId: 'core.review', enabled: true, defaultValues: { icon: '💪' } },
        ],
      },
    });

    expect(current.goalSettings?.goals[0]?.icon).toBeUndefined();
    expect(current.goalSettings?.goalTemplates.every((template) => !template.defaultValues?.icon)).toBe(true);
  });
});
