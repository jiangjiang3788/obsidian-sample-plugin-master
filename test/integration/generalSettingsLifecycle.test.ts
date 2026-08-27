/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F110/integration
 * @covers F110/persistence
 * @covers F110/restart
 * @covers F110/error
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { SettingsUseCase } from '@/app/usecases/settings.usecase';

function createHarness(saveFailure = false) {
  let persisted: unknown = { groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true, categoryColors: {}, goalSettings: { goals: [], goalTemplates: [] } };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      if (saveFailure) throw new Error('模拟设置写盘失败');
      persisted = toPersistedThinkSettings(settings);
    }),
  };
  const repository = new SettingsRepository(persistence);
  return { persistence, repository };
}

async function makeUseCase(repository: SettingsRepository) {
  const settings = await repository.load();
  const state: any = {
    isInitialized: true,
    settings,
    ui: { isTimerWidgetVisible: true, setTimerWidgetVisible: jest.fn(), toggleTimerWidgetVisible: jest.fn() },
  };
  state.updateSettings = async (mutator: (draft: ThinkSettings) => void) => { state.settings = await repository.update(mutator); };
  state.setFloatingTimerEnabled = async (value: boolean) => { state.settings = await repository.update((draft) => { draft.floatingTimerEnabled = value; }); };
  return { useCase: new SettingsUseCase({ getState: () => state } as any), state };
}

describe('通用设置落盘、错误与重启恢复', () => {
  it('悬浮计时器、开发错误开关和分类颜色通过设置用例持久化并在重启后恢复', async () => {
    const h = createHarness();
    const { useCase } = await makeUseCase(h.repository);
    await useCase.setFloatingTimerEnabled(false);
    await useCase.setDevConsoleStackEnabled(true);
    await useCase.updateCategoryColors({ 工作: '#112233', 健康: '#445566' });

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.floatingTimerEnabled).toBe(false);
    expect(restored.devConsoleStackEnabled).toBe(true);
    expect(restored.categoryColors).toMatchObject({ 工作: '#112233', 健康: '#445566' });
  });

  it('底层保存失败时向调用方明确抛错，不把失败伪装成保存成功', async () => {
    const h = createHarness(true);
    const { useCase } = await makeUseCase(h.repository);
    await expect(useCase.setDevConsoleStackEnabled(true)).rejects.toThrow('模拟设置写盘失败');
  });
});
