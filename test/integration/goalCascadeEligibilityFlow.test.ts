/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F040/integration
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { GoalUseCase } from '@/app/usecases/goal.usecase';
import { buildQuickInputGoalOptions } from '@/features/quickinput/editor/QuickInputEditorModel';

function createHarness() {
  let persisted: unknown = {
    groups: [],
    viewInstances: [],
    layouts: [],
    floatingTimerEnabled: true,
    goalSettings: { goals: [], goalTemplates: [] },
  };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      persisted = toPersistedThinkSettings(settings);
    }),
  };
  const repository = new SettingsRepository(persistence);

  const makeStore = async () => {
    const loaded = await repository.load();
    const state: any = {
      isInitialized: true,
      settings: loaded,
      updateSettings: async (mutator: (draft: ThinkSettings) => void) => {
        const next = await repository.update(mutator);
        state.settings = next;
        return next;
      },
    };
    return { getState: () => state } as any;
  };

  return { makeStore };
}

describe('P0 Goal 四列导航资格：GoalUseCase → SettingsRepository → QuickInput', () => {
  it('只有当前 Goal 的直接启用模板才具备创建资格；祖先模板不能向下继承', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);

    await goals.addGoal({ path: 'E2E' });
    await goals.addGoal({ path: 'E2E/一级' });
    await goals.addGoal({ path: 'E2E/一级/二级' });
    await goals.addGoal({ path: 'E2E/一级/二级/三级' });

    // 一级有直接任务模板；二级故意没有；三级重新拥有自己的直接任务模板。
    await goals.upsertGoalTemplateDraft({
      goalPath: 'E2E/一级',
      recordTypeId: 'core.task',
      enabled: true,
      requiredFields: ['任务内容'],
    });
    await goals.upsertGoalTemplateDraft({
      goalPath: 'E2E/一级/二级/三级',
      recordTypeId: 'core.task',
      enabled: true,
      requiredFields: ['任务内容'],
    });

    const options = buildQuickInputGoalOptions(
      store.getState().settings,
      'core.task',
      true,
    );

    expect(options.map((option) => [option.value, option.synthetic])).toEqual([
      ['E2E', true],
      ['E2E/一级', false],
      ['E2E/一级/二级', true],
      ['E2E/一级/二级/三级', false],
    ]);

    // 二级虽然有一个具备模板的父 Goal，但自己仍只能导航，不能创建。
    expect(options.find((option) => option.value === 'E2E/一级/二级')?.synthetic).toBe(true);
    // 叶子拥有直接模板，因此恢复真正创建资格。
    expect(options.find((option) => option.value === 'E2E/一级/二级/三级')?.synthetic).toBe(false);
  });

  it('禁用叶子直接模板后，叶子分支不再因为祖先模板而被保留为可创建路径', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);

    await goals.addGoal({ path: 'E2E' });
    await goals.addGoal({ path: 'E2E/一级' });
    await goals.addGoal({ path: 'E2E/一级/二级' });
    await goals.addGoal({ path: 'E2E/一级/二级/三级' });
    await goals.upsertGoalTemplateDraft({ goalPath: 'E2E/一级', recordTypeId: 'core.task', enabled: true });
    await goals.upsertGoalTemplateDraft({ goalPath: 'E2E/一级/二级/三级', recordTypeId: 'core.task', enabled: false });

    const options = buildQuickInputGoalOptions(store.getState().settings, 'core.task', true);

    expect(options.map((option) => option.value)).toEqual(['E2E', 'E2E/一级']);
    expect(options.find((option) => option.value === 'E2E/一级')?.synthetic).toBe(false);
    expect(options.some((option) => option.value === 'E2E/一级/二级')).toBe(false);
    expect(options.some((option) => option.value === 'E2E/一级/二级/三级')).toBe(false);
  });
});
