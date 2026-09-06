import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { GoalUseCase } from '@/app/usecases/goal.usecase';
import type { AppStoreApi } from '@/app/usecases/AppStoreApi';

function createHarness() {
  let persisted: unknown = { groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true, goalSettings: { goals: [], goalTemplates: [] } };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => { persisted = toPersistedThinkSettings(settings); }),
  };
  const repository = new SettingsRepository(persistence);
  const makeStore = async () => {
    const loaded = await repository.load();
    const state: {
      isInitialized: true;
      settings: ThinkSettings;
      updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<ThinkSettings>;
    } = {
      isInitialized: true,
      settings: loaded,
      updateSettings: async (mutator) => {
        const next = await repository.update(mutator);
        state.settings = next;
        return next;
      },
    };
    return { getState: () => state } as unknown as AppStoreApi;
  };
  return { persistence, makeStore };
}

describe('Goal 时间预设持久化', () => {
  it('独立保存顶层百分比与子目标时间，重启后不丢', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const useCase = new GoalUseCase(store);
    await useCase.addGoal({ path: '休息' });
    await useCase.addGoal({ path: '工作' });
    await useCase.addGoal({ path: '休息/睡眠' });

    await useCase.setGoalTimePresetPercent('休息', 42);
    await useCase.setGoalTimePresetPercent('工作', 21);
    await useCase.setGoalWeeklyTargetMinutes('休息/睡眠', 56 * 60);

    const current = store.getState().settings.goalSettings.goals;
    expect(current.find((goal) => goal.path === '休息')?.timePresetPercent).toBe(42);
    expect(current.find((goal) => goal.path === '工作')?.timePresetPercent).toBe(21);
    expect(current.find((goal) => goal.path === '休息/睡眠')?.weeklyTargetMinutes).toBe(56 * 60);
    expect(store.getState().settings.goalSettings?.timePresetRevisions?.length).toBe(1);
    const revision = store.getState().settings.goalSettings?.timePresetRevisions?.[0];
    expect(revision?.presets['休息']?.timePresetPercent).toBe(42);
    expect(revision?.presets['休息/睡眠']?.weeklyTargetMinutes).toBe(56 * 60);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.goalSettings?.goals.find((goal) => goal.path === '休息')?.timePresetPercent).toBe(42);
    expect(restored.goalSettings?.goals.find((goal) => goal.path === '休息/睡眠')?.weeklyTargetMinutes).toBe(56 * 60);
    expect(restored.goalSettings?.timePresetRevisions?.[0]?.presets['休息']?.timePresetPercent).toBe(42);
  });
});
