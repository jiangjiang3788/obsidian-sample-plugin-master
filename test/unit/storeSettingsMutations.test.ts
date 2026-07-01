import type { ThemeDefinition, ThinkSettings } from '@core/public';
import {
  addLayoutSettingsDraft,
  addLayoutSettingsViewInstance,
  makeLayoutSettingsDraft,
  removeLayoutSettingsViewInstance,
  updateLayoutSettingsViewPlacement,
} from '@/app/store/mutations/layoutSettingsMutations';
import {
  addActiveThemePathDraft,
  removeActiveThemePathDraft,
} from '@/app/store/mutations/generalSettingsMutations';
import {
  batchSetThemeSettingsStatus,
  makeThemeSettingsDraft,
  normalizeThemeSettingsPath,
  themeSettingsPathExists,
} from '@/app/store/mutations/themeSettingsMutations';

function createSettingsDraft(): ThinkSettings {
  return {
    inputSettings: {
      themes: [],
      blocks: [],
    },
    layouts: [],
    activeThemePaths: [],
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

  it('normalizes theme paths and guards duplicates', () => {
    const themes: ThemeDefinition[] = [];
    const normalized = normalizeThemeSettingsPath(' 学习 // 英语 / 听力 ');
    const theme = makeThemeSettingsDraft(normalized, themes);
    themes.push(theme);

    expect(normalized).toBe('学习/英语/听力');
    expect(themeSettingsPathExists(themes, '学习/英语/听力')).toBe(true);
    expect(themeSettingsPathExists(themes, '学习/英语/听力', theme.id)).toBe(false);
  });

  it('updates active theme paths from general and theme mutations', () => {
    const draft = createSettingsDraft();
    const theme = makeThemeSettingsDraft('工作/插件', []);
    draft.inputSettings.themes = [theme];

    addActiveThemePathDraft(draft, '工作/插件');
    expect(draft.activeThemePaths).toEqual(['工作/插件']);

    batchSetThemeSettingsStatus(draft, [theme.id], 'inactive');
    expect(draft.activeThemePaths).toEqual([]);

    batchSetThemeSettingsStatus(draft, [theme.id], 'active');
    expect(draft.activeThemePaths).toEqual(['工作/插件']);

    removeActiveThemePathDraft(draft, '工作/插件');
    expect(draft.activeThemePaths).toEqual([]);
  });
});
