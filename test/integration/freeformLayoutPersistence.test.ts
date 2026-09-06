/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F100/integration
 * @covers F100/persistence
 * @covers F100/restart
 * @covers F100/regression
 * @covers F101/integration
 * @covers F111/integration
 * @covers F111/persistence
 * @covers F126/integration
 */
import { SettingsRepository, type ISettingsPersistence } from '@core/services/SettingsRepository';
import { DEFAULT_SETTINGS, type ThinkSettings } from '@core/settings/ThinkSettings';
import { filterViewPlacementsForLayout } from '@core/layout/freeformLayout';

function createSettings(): ThinkSettings {
  const settings: ThinkSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.viewInstances = [
    { id: 'view-a', parentId: null, title: 'A 表格', viewType: 'TableView' },
    { id: 'view-b', parentId: null, title: 'B 时间轴', viewType: 'TimelineView' },
  ];
  settings.layouts = [{
    id: 'layout-a',
    name: 'A',
    parentId: null,
    viewInstanceIds: ['view-a', 'view-b'],
    displayMode: 'freeform',
    initialView: '月',
    initialDateFollowsNow: true,
  }];
  return settings;
}

function expectPlacements(value: Record<string, any> | undefined) {
  expect(Object.keys(value || {}).sort()).toEqual(['view-a', 'view-b']);
  expect(value?.['view-a']).toMatchObject({ x: 0, y: 0, width: 320, height: 200, zIndex: 2 });
  expect(value?.['view-b']).toMatchObject({ x: 336, y: 0, width: 320, height: 200, zIndex: 1 });
  expect(value).not.toHaveProperty('foreign-view');
}

describe('自由布局持久化', () => {
  it('完整 placement 集合只写盘一次，并过滤不属于当前布局的数据', async () => {
    let persisted: any = createSettings();
    const persistence: ISettingsPersistence = {
      loadData: jest.fn(async () => structuredClone(persisted)),
      saveData: jest.fn(async (data) => { persisted = structuredClone(data); }),
    };

    // 使用真实 load() 入口而不是直接 setInitialSettings，确保“首次加载”和“重启恢复”
    // 都经过生产环境同一套 current settings schema。
    const repository = new SettingsRepository(persistence);
    await repository.load();

    await repository.update((draft) => {
      const layout = draft.layouts.find((candidate) => candidate.id === 'layout-a');
      if (!layout) throw new Error('测试布局不存在');
      layout.viewPlacements = filterViewPlacementsForLayout(layout.viewInstanceIds, {
        'view-a': { x: 0, y: 0, width: 320, height: 200, zIndex: 2 },
        'view-b': { x: 336, y: 0, width: 320, height: 200, zIndex: 1 },
        'foreign-view': { x: 0, y: 300, width: 320, height: 200, zIndex: 3 },
      });
    });

    expect(persistence.saveData).toHaveBeenCalledTimes(1);
    expectPlacements(repository.getSnapshot().layouts.find((layout) => layout.id === 'layout-a')?.viewPlacements);
    expectPlacements(persisted.layouts.find((layout: any) => layout.id === 'layout-a')?.viewPlacements);

    // 真正创建一个新 Repository 再 load，证明磁盘数据经过 schema hydration 后仍然完整。
    const restarted = new SettingsRepository(persistence);
    await restarted.load();
    expectPlacements(restarted.getSnapshot().layouts.find((layout) => layout.id === 'layout-a')?.viewPlacements);
  });
});
