import type { ThemeDefinition, ThinkSettings } from './types/schema';

export interface ThemeMetadata {
  path: string | null;
  icon: string;
  color?: string | null;
  theme: ThemeDefinition | null;
}

function normalizePath(path?: string | null): string | null {
  const normalized = String(path || '').split('/').map((part) => part.trim()).filter(Boolean).join('/');
  return normalized || null;
}

function pathCandidates(path?: string | null): string[] {
  const parts = normalizePath(path)?.split('/') || [];
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
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
    const renderPath = normalizePath(themePath) || metadata.path;
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
    const normalized = normalizePath(themePath);
    const themes = settings.inputSettings?.themes || [];
    let theme: ThemeDefinition | null = null;
    let iconTheme: ThemeDefinition | null = null;
    if (normalized) {
      const byPath = new Map(themes.map((item) => [normalizePath(item.path), item]));
      for (const candidate of pathCandidates(normalized)) {
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
