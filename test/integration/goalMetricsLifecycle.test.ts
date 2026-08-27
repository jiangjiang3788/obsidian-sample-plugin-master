/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F034/integration
 * @covers F034/persistence
 * @covers F034/restart
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { GoalUseCase } from '@/app/usecases/goal.usecase';

function createHarness() {
  let persisted: unknown = { groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true, goalSettings: { goals: [], goalTemplates: [] } };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => { persisted = toPersistedThinkSettings(settings); }),
  };
  const repository = new SettingsRepository(persistence);
  const makeStore = async () => {
    const loaded = await repository.load();
    const state: any = {
      isInitialized: true,
      settings: loaded,
      updateSettings: async (mutator: (draft: ThinkSettings) => void) => {
        const next = await repository.update(mutator); state.settings = next; return next;
      },
    };
    return { getState: () => state } as any;
  };
  return { persistence, makeStore };
}

describe('Goal 指标落盘与重启恢复', () => {
  it('新增、修改、删除指标都通过 GoalUseCase 写入 SettingsRepository，重启后保持一致', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);
    await goals.addGoal({ path: '健康/运动' });

    await goals.updateGoalMetrics('健康/运动', [
      { key: 'task.done', label: '完成任务', direction: 'increase', targetValue: 10, unit: '个' },
    ]);
    expect(store.getState().settings.goalSettings.goals[0].metrics[0]).toMatchObject({ key: 'task.done', targetValue: 10, unit: '个' });

    await goals.updateGoalMetrics('健康/运动', [
      { key: 'task.done', label: '每周完成任务', direction: 'increase', targetValue: 12, unit: '个' },
      { key: 'energy.avg', label: '平均精力', direction: 'increase', targetValue: 75, unit: '分' },
    ]);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    const metrics = restored.goalSettings?.goals.find((goal) => goal.path === '健康/运动')?.metrics || [];
    expect(metrics).toHaveLength(2);
    expect(metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'task.done', label: '每周完成任务', targetValue: 12 }),
      expect.objectContaining({ key: 'energy.avg', targetValue: 75 }),
    ]));

    const restartedStoreState: any = {
      isInitialized: true,
      settings: restored,
      updateSettings: async (mutator: (draft: ThinkSettings) => void) => {
        const next = await restarted.update(mutator); restartedStoreState.settings = next; return next;
      },
    };
    const restartedUseCase = new GoalUseCase({ getState: () => restartedStoreState } as any);
    await restartedUseCase.updateGoalMetrics('健康/运动', metrics.filter((metric) => metric.key !== 'energy.avg'));

    const finalRepository = new SettingsRepository(h.persistence);
    const finalSettings = await finalRepository.load();
    expect(finalSettings.goalSettings?.goals[0]?.metrics?.map((metric) => metric.key)).toEqual(['task.done']);
  });
});
