/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F103/integration
 * @covers F103/persistence
 * @covers F103/restart
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { ViewInstanceUseCase } from '@/app/usecases/viewinstance.usecase';
import type { AppStoreApi } from '@/app/usecases/AppStoreApi';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

function initialSettings(): ThinkSettings {
  return {
    groups: [],
    floatingTimerEnabled: true,
    goalSettings: { goals: [], goalTemplates: [] },
    layouts: [{ id: 'layout-v6', name: '布局', parentId: null, viewInstanceIds: ['view-v6'], displayMode: 'list', initialView: '月', initialDateFollowsNow: true }],
    viewInstances: [{
      id: 'view-v6', parentId: null, title: 'V6 模块', viewType: 'StatisticsView', viewConfig: {},
      fields: [], groupFields: [], filters: [], sort: [], collapsed: false,
    }],
  } as ThinkSettings;
}

async function createViewUseCaseHarness(persistence: ISettingsPersistence) {
  const repository = new SettingsRepository(persistence);
  const settings = await repository.load();
  const state: {
    isInitialized: boolean;
    settings: ThinkSettings;
    updateSettings: (mutator: (draft: ThinkSettings) => void) => Promise<void>;
  } = {
    isInitialized: true,
    settings,
    updateSettings: async (mutator) => { state.settings = await repository.update(mutator); },
  };
  const store = { getState: () => state } as unknown as AppStoreApi;
  return { repository, state, useCase: new ViewInstanceUseCase(store) };
}

describe('模块设置弹窗参数持久化生命周期', () => {
  it('视图类型、折叠、字段、筛选和视图专属参数统一经 ViewInstanceUseCase 写盘并在重启后恢复', async () => {
    let persisted = clone(initialSettings());
    const persistence: ISettingsPersistence = {
      loadData: jest.fn(async () => clone(persisted)),
      saveData: jest.fn(async (settings: ThinkSettings) => { persisted = clone(settings); }),
    };
    const { useCase } = await createViewUseCaseHarness(persistence);

    await useCase.updateView('view-v6', {
      viewType: 'TableView',
      collapsed: true,
      fields: ['内容', '状态'],
      groupFields: ['目标'],
      filters: [{ field: 'status', op: 'equals', value: 'open' } as any],
      sort: [{ field: 'created', direction: 'desc' } as any],
    });
    await useCase.updateViewConfig('view-v6', { pageSize: 50, compact: true, dateRole: 'task-completed' });

    const restarted = new SettingsRepository(persistence);
    const restored = await restarted.load();
    const view = (restored.viewInstances || []).find((item) => item.id === 'view-v6');
    expect(view).toMatchObject({ viewType: 'TableView', collapsed: true });
    expect(view?.fields).toEqual(['content', 'status']);
    expect(view?.groupFields).toEqual(['goalPath']);
    expect(view?.filters).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status', value: 'open' })]));
    expect(view?.viewConfig).toMatchObject({ pageSize: 50, compact: true, dateRole: 'task-completed' });
  });

});
