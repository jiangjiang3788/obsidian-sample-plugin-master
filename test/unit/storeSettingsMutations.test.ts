import type { ThinkSettings } from '@core/public';
import {
  addLayoutSettingsDraft,
  addLayoutSettingsViewInstance,
  makeLayoutSettingsDraft,
  removeLayoutSettingsViewInstance,
  updateLayoutSettingsViewPlacement,
} from '@/app/store/mutations/layoutSettingsMutations';
import {
  patchInputSettingsDraft,
  patchSettingsDraft,
  setFloatingTimerEnabledDraft,
} from '@/app/store/mutations/generalSettingsMutations';

function createSettingsDraft(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    inputSettings: { blocks: [] },
    floatingTimerEnabled: true,
  } as unknown as ThinkSettings;
}

describe('store settings mutations', () => {
  it('applies layout draft mutations without store state', () => {
    const draft = createSettingsDraft();
    const layout = makeLayoutSettingsDraft('默认布局', null);

    addLayoutSettingsDraft(draft, layout);
    addLayoutSettingsViewInstance(draft, layout.id, 'view-1');
    updateLayoutSettingsViewPlacement(draft, layout.id, 'view-1', {
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      zIndex: 5,
      collapsed: false,
    });

    expect(draft.layouts?.[0]?.viewInstanceIds).toEqual(['view-1']);
    expect(draft.layouts?.[0]?.viewPlacements?.['view-1']).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });

    removeLayoutSettingsViewInstance(draft, layout.id, 'view-1');
    expect(draft.layouts?.[0]?.viewInstanceIds).toEqual([]);
    expect(draft.layouts?.[0]?.viewPlacements?.['view-1']).toBeUndefined();
  });

  it('patches current Goal-only input settings without a second classification store', () => {
    const draft = createSettingsDraft();
    patchInputSettingsDraft(draft, { blocks: [{ id: 'core.task' } as any] });
    expect(draft.inputSettings.blocks).toEqual([{ id: 'core.task' }]);
  });

  it('applies generic settings mutations', () => {
    const draft = createSettingsDraft();
    setFloatingTimerEnabledDraft(draft, false);
    patchSettingsDraft(draft, { devConsoleStackEnabled: true });
    expect(draft.floatingTimerEnabled).toBe(false);
    expect(draft.devConsoleStackEnabled).toBe(true);
  });
});
