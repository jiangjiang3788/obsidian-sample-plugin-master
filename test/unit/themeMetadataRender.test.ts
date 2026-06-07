import { ThemeMetadataResolver } from '../../src/core/themeMetadata';

describe('ThemeMetadataResolver.resolveThemeForRender', () => {
  it('keeps requested child path while inheriting parent icon', () => {
    const settings: any = {
      inputSettings: {
        themes: [{ id: 'theme.work.plugin', path: '工作/插件', icon: '🧩' }],
      },
      categoryColors: {},
    };
    const theme = ThemeMetadataResolver.resolveThemeForRender(settings, '工作/插件/目标中心');
    expect(theme?.path).toBe('工作/插件/目标中心');
    expect(theme?.icon).toBe('🧩');
  });
});
