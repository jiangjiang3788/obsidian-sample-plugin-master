/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F031/integration
 * @covers F033/error
 * @covers F033/integration
 * @covers F033/persistence
 * @covers F033/restart
 * @covers F037/integration
 * @covers F037/persistence
 * @covers F037/restart
 * @covers F116/restart
 * @covers F116/persistence
 * @covers F116/integration
 * @covers F038/persistence
 * @covers F038/integration
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { GoalUseCase } from '@/app/usecases/goal.usecase';

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
    return {
      getState: () => state,
    } as any;
  };

  return { persistence, repository, makeStore, readPersisted: () => JSON.parse(JSON.stringify(persisted)) };
}

describe('P0 GoalUseCase → SettingsRepository → 重启恢复', () => {
  it('创建父子 Goal、修改状态、保存 GoalTemplate 后，新的 Repository 能恢复同一层级与模板', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);

    await goals.addGoal({ path: '健康', description: '长期健康' });
    await goals.addGoal({ path: '健康 / 运动', description: '每周运动' });
    await goals.pauseGoal('健康/运动');
    await goals.setGoalColor('健康/运动', '#12AB34');
    await goals.upsertGoalTemplateDraft({
      goalPath: '健康/运动',
      recordTypeId: 'core.task',
      enabled: true,
      requiredFields: ['内容'],
      defaultValues: { 优先级: 'medium' },
      fields: [{
        id: 'custom-scene', key: '场景', label: '场景', type: 'singleSelect', required: true,
        options: [{ value: 'home', label: '家里' }, { value: 'work', label: '工作' }],
      } as any],
      targetFile: 'E2E/GoalTemplate.md',
    });

    const current = store.getState().settings;
    expect(current.goalSettings.goals.map((goal: any) => goal.path)).toEqual(['健康', '健康/运动']);
    expect(current.goalSettings.goals.find((goal: any) => goal.path === '健康/运动')?.status).toBe('paused');
    expect(current.goalSettings.goals.find((goal: { path: string; color?: string }) => goal.path === '健康/运动')?.color).toBe('#12ab34');
    expect(current.goalSettings.goalTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        goalPath: '健康/运动', recordTypeId: 'core.task', enabled: true, targetFile: 'E2E/GoalTemplate.md',
        fields: expect.arrayContaining([expect.objectContaining({ key: '场景', type: 'singleSelect', required: true })]),
      }),
    ]));
    expect(h.persistence.saveData).toHaveBeenCalled();

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.goalSettings?.goals.map((goal) => goal.path)).toEqual(['健康', '健康/运动']);
    expect(restored.goalSettings?.goals.find((goal) => goal.path === '健康/运动')?.status).toBe('paused');
    expect(restored.goalSettings?.goals.find((goal) => goal.path === '健康/运动')?.color).toBe('#12ab34');
    expect(restored.goalSettings?.goalTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        goalPath: '健康/运动', recordTypeId: 'core.task', enabled: true, targetFile: 'E2E/GoalTemplate.md',
        fields: expect.arrayContaining([expect.objectContaining({ key: '场景', type: 'singleSelect', required: true })]),
      }),
    ]));
  });

  it('级联删除父 Goal 时同时删除子 Goal 和相关模板，落盘后不会在重启时复活', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);

    await goals.addGoal({ path: '健康' });
    await goals.addGoal({ path: '健康/运动' });
    await goals.addGoal({ path: '健康/运动/力量' });
    await goals.upsertGoalTemplateDraft({ goalPath: '健康/运动', recordTypeId: 'core.task', enabled: true });
    await goals.upsertGoalTemplateDraft({ goalPath: '健康/运动/力量', recordTypeId: 'core.thought', enabled: true });

    await expect(goals.deleteGoalCascade('健康/运动')).resolves.toBe(2);
    expect(store.getState().settings.goalSettings.goals.map((goal: any) => goal.path)).toEqual(['健康']);
    expect(store.getState().settings.goalSettings.goalTemplates).toEqual([]);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.goalSettings?.goals.map((goal) => goal.path)).toEqual(['健康']);
    expect(restored.goalSettings?.goalTemplates).toEqual([]);
  });

  it('非法空 Goal 路径明确失败，不会写入一个猜测的目标', async () => {
    const h = createHarness();
    const store = await h.makeStore();
    const goals = new GoalUseCase(store);

    await expect(goals.addGoal({ path: '   ' })).rejects.toThrow();
    expect(store.getState().settings.goalSettings.goals).toEqual([]);
    expect((h.readPersisted() as any).goalSettings.goals).toEqual([]);
  });
});
