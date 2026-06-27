import { SettingsRepository, type ISettingsPersistence } from '@core/services/SettingsRepository';
import { filterViewPlacementsForLayout } from '@core/layout/freeformLayout';

describe('freeform layout persistence', () => {
  it('完整 placement 集合只写盘一次，并过滤不属于当前布局的数据', async () => {
    const initialSettings = {
      layouts: [{
        id: 'layout-a',
        name: 'A',
        parentId: null,
        viewInstanceIds: ['view-a', 'view-b'],
        displayMode: 'freeform',
      }],
      viewInstances: [],
    } as any;
    const persistence: ISettingsPersistence = {
      loadData: jest.fn(async () => initialSettings),
      saveData: jest.fn(async () => undefined),
    };
    const repository = new SettingsRepository(persistence);
    repository.setInitialSettings(initialSettings);

    await repository.update((draft) => {
      const layout = draft.layouts.find((candidate) => candidate.id === 'layout-a');
      if (!layout) return;
      layout.viewPlacements = filterViewPlacementsForLayout(layout.viewInstanceIds, {
        'view-a': { x: 0, y: 0, width: 320, height: 200, zIndex: 2 },
        'view-b': { x: 336, y: 0, width: 320, height: 200, zIndex: 1 },
        'foreign-view': { x: 0, y: 300, width: 320, height: 200, zIndex: 3 },
      });
    });

    expect(persistence.saveData).toHaveBeenCalledTimes(1);
    expect(repository.getSnapshot().layouts[0].viewPlacements).toEqual({
      'view-a': { x: 0, y: 0, width: 320, height: 200, zIndex: 2 },
      'view-b': { x: 336, y: 0, width: 320, height: 200, zIndex: 1 },
    });
  });
});
