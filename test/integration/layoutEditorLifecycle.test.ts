/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F102/integration
 * @covers F102/persistence
 * @covers F102/restart
 * @covers F102/error
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { Layout } from '@core/types/public';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { LayoutUseCase } from '@/app/usecases/layout.usecase';
import {
  addLayoutSettingsDraft,
  addLayoutSettingsViewInstance,
  cloneLayoutSettingsDraft,
  deleteLayoutSettingsDraft,
  patchLayoutSettingsDraft,
  removeLayoutSettingsViewInstance,
  reorderLayoutSettingsViewInstances,
  resetLayoutSettingsFreeform,
  updateLayoutSettingsViewPlacement,
} from '@/app/store/mutations/layoutSettingsMutations';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

function baseSettings(): ThinkSettings {
  return {
    groups: [],
    floatingTimerEnabled: true,
    goalSettings: { goals: [], goalTemplates: [] },
    viewInstances: [
      { id: 'view-a', parentId: null, title: 'A', viewType: 'TableView', viewConfig: {}, fields: [], groupFields: [], filters: [], sort: [], collapsed: false },
      { id: 'view-b', parentId: null, title: 'B', viewType: 'StatisticsView', viewConfig: {}, fields: [], groupFields: [], filters: [], sort: [], collapsed: false },
    ],
    layouts: [{ id: 'layout-a', name: '布局 A', parentId: null, viewInstanceIds: ['view-a', 'view-b'], displayMode: 'freeform', initialView: '月', initialDateFollowsNow: true }],
  } as ThinkSettings;
}

async function createHarness(failSave = false) {
  let persisted = clone(baseSettings());
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => clone(persisted)),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      if (failSave) throw new Error('模拟布局设置写盘失败');
      persisted = clone(settings);
    }),
  };
  const repository = new SettingsRepository(persistence);
  const loaded = await repository.load();
  const state: any = { isInitialized: true, settings: loaded };
  const update = async (mutator: (draft: ThinkSettings) => void) => {
    state.settings = await repository.update(mutator);
  };
  state.updateLayout = (id: string, patch: Partial<Layout>) => update((draft) => patchLayoutSettingsDraft(draft, id, patch));
  state.addViewInstanceToLayout = (layoutId: string, viewId: string) => update((draft) => addLayoutSettingsViewInstance(draft, layoutId, viewId));
  state.removeViewInstanceFromLayout = (layoutId: string, viewId: string) => update((draft) => removeLayoutSettingsViewInstance(draft, layoutId, viewId));
  state.reorderViewInstancesInLayout = (layoutId: string, ids: string[]) => update((draft) => reorderLayoutSettingsViewInstances(draft, layoutId, ids));
  state.updateViewPlacement = (layoutId: string, viewId: string, placement: any) => update((draft) => updateLayoutSettingsViewPlacement(draft, layoutId, viewId, placement));
  state.resetFreeformLayout = (layoutId: string) => update((draft) => resetLayoutSettingsFreeform(draft, layoutId));
  state.duplicateLayout = async (id: string) => {
    let copy: Layout | null = null;
    await update((draft) => {
      const original = (draft.layouts || []).find((layout) => layout.id === id);
      if (!original) return;
      copy = cloneLayoutSettingsDraft(original);
      addLayoutSettingsDraft(draft, copy);
    });
    return copy;
  };
  state.deleteLayout = (id: string) => update((draft) => deleteLayoutSettingsDraft(draft, id));
  const useCase = new LayoutUseCase({ getState: () => state } as any);
  return { repository, persistence, useCase, readPersisted: () => clone(persisted), state };
}

describe('布局编辑器跨层生命周期', () => {
  it('排序、位置、移除和复制通过布局用例写入设置仓储，重启后保持同一结果', async () => {
    const h = await createHarness();
    await h.useCase.reorderViewInstancesInLayout('layout-a', ['view-b', 'view-a']);
    await h.useCase.updateViewPlacement('layout-a', 'view-b', { x: 32, y: 48, width: 400, height: 260, zIndex: 2 });
    await h.useCase.updateLayout('layout-a', { freeformConfig: { gridSize: 16, snapToGrid: true, defaultTemplate: 'focus' } as any });
    const copy = await h.useCase.duplicateLayout('layout-a');
    expect(copy?.name).toBe('布局 A (副本)');
    await h.useCase.removeViewInstanceFromLayout('layout-a', 'view-a');

    const disk = h.readPersisted();
    const original = disk.layouts.find((layout) => layout.id === 'layout-a')!;
    expect(original.viewInstanceIds).toEqual(['view-b']);
    expect(original.viewPlacements?.['view-b']).toMatchObject({ x: 32, y: 48, width: 400, height: 260 });
    expect((disk.layouts || []).some((layout) => layout.name === '布局 A (副本)')).toBe(true);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect((restored.layouts || []).find((layout) => layout.id === 'layout-a')?.viewInstanceIds).toEqual(['view-b']);
    expect((restored.layouts || []).find((layout) => layout.name === '布局 A (副本)')?.viewInstanceIds).toEqual(['view-b', 'view-a']);
  });

  it('设置仓储保存失败时布局用例明确抛错，不把失败伪装成成功', async () => {
    const h = await createHarness(true);
    await expect(h.useCase.updateViewPlacement('layout-a', 'view-a', { x: 10, y: 20, width: 300, height: 200 }))
      .rejects.toThrow('模拟布局设置写盘失败');
  });
});
