/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F037/error
 * @covers F037/restart
 * @covers F126/error
 * @covers F126/integration
 * @covers F126/persistence
 * @covers F126/restart
 * @covers F127/error
 * @covers F127/integration
 * @covers F127/persistence
 * @covers F127/regression
 * @covers F127/restart
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';

function createPersistence(initial: unknown) {
  let persisted: unknown = JSON.parse(JSON.stringify(initial));
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      persisted = toPersistedThinkSettings(settings);
    }),
  };
  return { persistence, read: () => JSON.parse(JSON.stringify(persisted)) };
}

const initialData = {
  groups: [],
  viewInstances: [],
  layouts: [],
  floatingTimerEnabled: true,
  goalSettings: {
    goals: [{ path: '健康', status: 'active' }],
    goalTemplates: [],
  },
};

describe('P0 SettingsRepository 落盘与重启恢复', () => {
  it('保存后创建一个全新的 Repository，仍能从 data.json 形态恢复 Goal、布局与通用设置', async () => {
    const h = createPersistence(initialData);
    const first = new SettingsRepository(h.persistence);
    await first.load();

    await first.update((draft) => {
      draft.floatingTimerEnabled = false;
      draft.layouts = [{
        id: 'layout-main',
        name: '主布局',
        parentId: null,
        viewInstanceIds: [],
        displayMode: 'freeform',
      } as any];
      draft.goalSettings!.goals.push({
        path: '健康/运动',
        status: 'active',
        metrics: [],
        createdAt: '',
        updatedAt: '',
      });
      draft.goalSettings!.goalTemplates.push({
        goalPath: '健康/运动',
        recordTypeId: 'core.task',
        enabled: true,
        requiredFields: ['内容'],
        defaultValues: { 优先级: 'medium' },
      } as any);
    });

    const persisted = h.read() as any;
    expect(persisted.floatingTimerEnabled).toBe(false);
    expect(persisted.layouts).toHaveLength(1);
    expect(persisted.goalSettings.goals.map((goal: any) => goal.path)).toEqual(['健康', '健康/运动']);
    expect(persisted.goalSettings.goalTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({ goalPath: '健康/运动', recordTypeId: 'core.task', enabled: true }),
    ]));
    expect(persisted.inputSettings).toBeUndefined();
    expect(persisted.recordTypeSettings).toBeUndefined();
    expect(persisted.recordTypeSettings).toBeUndefined();

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.floatingTimerEnabled).toBe(false);
    expect(restored.layouts[0]?.id).toBe('layout-main');
    expect(restored.goalSettings?.goals.map((goal) => goal.path)).toEqual(['健康', '健康/运动']);
    expect(restored.goalSettings?.goalTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({ goalPath: '健康/运动', recordTypeId: 'core.task', enabled: true }),
    ]));
  });

  it('当前设置结构不会猜测一个指向不存在 Goal 的 GoalTemplate，而是明确拒绝损坏数据', async () => {
    const h = createPersistence({
      ...initialData,
      goalSettings: {
        goals: [{ path: '健康', status: 'active' }],
        goalTemplates: [{ goalPath: '不存在的目标', recordTypeId: 'core.task', enabled: true }],
      },
    });
    const repository = new SettingsRepository(h.persistence);
    await expect(repository.load()).rejects.toThrow('GoalTemplate references missing Goal path');
  });

  it('旧式、未声明的 Goal 字段不会被“自动猜迁移”为新 Goal；当前策略只读取当前结构', async () => {
    const h = createPersistence({
      ...initialData,
      goalSettings: {
        classifications: [{ id: 'legacy', name: '旧分类' }],
        goals: [],
        goalTemplates: [],
      },
    });
    const repository = new SettingsRepository(h.persistence);
    const restored = await repository.load();
    expect(restored.goalSettings?.goals).toEqual([]);
    expect((restored.goalSettings as any)?.classifications).toBeUndefined();
  });
});
