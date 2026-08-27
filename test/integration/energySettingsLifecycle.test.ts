/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F113/integration
 * @covers F113/persistence
 * @covers F113/restart
 * @covers F113/error
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { SettingsUseCase } from '@/app/usecases/settings.usecase';

function createHarness(saveFailure = false) {
  let persisted: unknown = {
    groups: [],
    viewInstances: [],
    layouts: [],
    goalSettings: {
      goals: [{ path: '健康', status: 'active' }, { path: '健康/运动', status: 'active' }],
      goalTemplates: [],
    },
    energySettings: { defaultGoalPath: '' },
  };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      if (saveFailure) throw new Error('模拟精力设置写盘失败');
      persisted = toPersistedThinkSettings(settings);
    }),
  };
  return { persistence, repository: new SettingsRepository(persistence) };
}

async function createUseCase(repository: SettingsRepository) {
  const state: any = { isInitialized: true, settings: await repository.load() };
  state.updateSettings = async (mutator: (draft: ThinkSettings) => void) => {
    state.settings = await repository.update(mutator);
  };
  return new SettingsUseCase({ getState: () => state } as any);
}

describe('精力设置落盘与重启恢复', () => {
  it('默认目标通过 SettingsUseCase 写入 data.json 形态，并由全新 Repository 恢复', async () => {
    const h = createHarness();
    const useCase = await createUseCase(h.repository);

    await useCase.setEnergyDefaultGoalPath(' 健康/运动 ');

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.energySettings?.defaultGoalPath).toBe('健康/运动');
  });

  it('切回自动模式后重启仍保持空默认目标', async () => {
    const h = createHarness();
    const useCase = await createUseCase(h.repository);
    await useCase.setEnergyDefaultGoalPath('健康');
    await useCase.setEnergyDefaultGoalPath(null);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.energySettings?.defaultGoalPath).toBe('');
  });

  it('底层写盘失败时明确向调用方抛错，不把失败伪装成保存成功', async () => {
    const h = createHarness(true);
    const useCase = await createUseCase(h.repository);
    await expect(useCase.setEnergyDefaultGoalPath('健康')).rejects.toThrow('模拟精力设置写盘失败');
  });
});
