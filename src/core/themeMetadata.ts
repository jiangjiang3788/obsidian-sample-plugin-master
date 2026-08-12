import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { buildThemePathMap, getThemePathCandidates, normalizeThemePath, normalizeThemePathOrNull } from './theme/themePathSemantics';

export interface ThemeMetadata {
  path: string | null;
  icon: string;
  color?: string | null;
  theme: ThemeDefinition | null;
}

export class ThemeMetadataResolver {
  /**
   * 返回给模板渲染层使用的主题对象。
   *
   * 主题现在只承担 metadata 角色：即使用户记录的 themePath 是更深层路径，
   * 图标/颜色也可以从父主题回退，但渲染时仍保留原始 themePath。
   */
  static resolveThemeForRender(settings: Pick<ThinkSettings, 'inputSettings' | 'categoryColors'>, themePath?: string | null): ThemeDefinition | null {
    const metadata = ThemeMetadataResolver.resolve(settings, themePath);
    const renderPath = normalizeThemePath(themePath) || metadata.path;
    if (!renderPath && !metadata.theme) return null;
    return {
      id: metadata.theme?.id || renderPath || 'theme.metadata',
      path: renderPath || metadata.theme?.path || '',
      icon: metadata.icon || metadata.theme?.icon || '',
      order: metadata.theme?.order,
      status: metadata.theme?.status,
    };
  }

  static resolve(settings: Pick<ThinkSettings, 'inputSettings' | 'categoryColors'>, themePath?: string | null): ThemeMetadata {
    const normalized = normalizeThemePathOrNull(themePath);
    const themes = settings.inputSettings?.themes || [];
    let theme: ThemeDefinition | null = null;
    let iconTheme: ThemeDefinition | null = null;
    if (normalized) {
      const byPath = buildThemePathMap(themes);
      for (const candidate of getThemePathCandidates(normalized)) {
        const matched = byPath.get(candidate);
        if (matched && !theme) theme = matched;
        if (matched && String((matched as any).icon || '').trim()) {
          iconTheme = matched;
          break;
        }
      }
    }
    const path = normalized || theme?.path || null;
    const color = path ? settings.categoryColors?.[path] ?? settings.categoryColors?.[path.split('/')[0]] ?? null : null;
    return {
      path,
      icon: String((iconTheme || theme as any)?.icon || '').trim(),
      color,
      theme,
    };
  }
}
