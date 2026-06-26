import type { ThinkSettings } from '@/core/types/schema';
import { ThemeMetadataResolver } from '@/core/themeMetadata';

function settings(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    inputSettings: {
      blocks: [],
      themes: [
        { id: 'root', path: '工作', icon: '💼' },
        { id: 'plugin', path: '工作/插件', icon: '🧩' },
      ],
      overrides: [],
    },
    floatingTimerEnabled: true,
    activeThemePaths: [],
    categoryColors: { '工作/插件': '#123456', 工作: '#654321' },
  } as any;
}

describe('ThemeMetadataResolver', () => {
  it('returns exact theme icon and color', () => {
    const metadata = ThemeMetadataResolver.resolve(settings(), '工作/插件');
    expect(metadata.path).toBe('工作/插件');
    expect(metadata.icon).toBe('🧩');
    expect(metadata.color).toBe('#123456');
  });

  it('falls back to parent theme metadata for unknown child paths', () => {
    const metadata = ThemeMetadataResolver.resolve(settings(), '工作/插件/目标中心');
    expect(metadata.path).toBe('工作/插件/目标中心');
    expect(metadata.icon).toBe('🧩');
    expect(metadata.theme?.path).toBe('工作/插件');
  });
});
