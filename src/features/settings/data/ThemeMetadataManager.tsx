/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  SimpleSelect,
  ThinkInput,
  ThinkButton,
  ThinkIcon,
  ThinkIconButton,
} from '@shared/ui/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import {
  getThemePathCandidates,
  normalizeThemePath,
  ThemeMetadataResolver,
} from '@core/theme/public';

type ThemeStatus = 'active' | 'inactive';

const statusOptions: Array<{ value: ThemeStatus; label: string }> = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
];

function inheritedIconInfo(themes: Array<{ path: string; icon?: string }>, path: string) {
  const byPath = new Map(themes.map((theme) => [String(theme.path || ''), theme]));
  for (const candidate of getThemePathCandidates(path)) {
    const matched = byPath.get(candidate);
    if (matched && String(matched.icon || '').trim()) {
      return { icon: String(matched.icon || '').trim(), sourcePath: matched.path };
    }
  }
  return { icon: '', sourcePath: '' };
}

/** Theme metadata stays intentionally compact: routine settings should not read like documentation. */
export function ThemeMetadataManager() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const themes = settings.inputSettings?.themes || [];
  const [path, setPath] = useState('');
  const [icon, setIcon] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const sortedThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...themes]
      .filter((theme) => !q || theme.path.toLowerCase().includes(q) || String(theme.icon || '').includes(q))
      .sort((a, b) => (a.path || '').localeCompare(b.path || '', 'zh-Hans-CN'));
  }, [themes, query]);

  const previewThemePath = path.trim() || sortedThemes[0]?.path || '';
  const previewMetadata = useMemo(
    () => ThemeMetadataResolver.resolve(settings, previewThemePath),
    [settings, previewThemePath],
  );
  const previewIconInfo = useMemo(
    () => inheritedIconInfo(themes, previewThemePath),
    [themes, previewThemePath],
  );
  const previewIcon = previewMetadata.icon || previewIconInfo.icon || '🎯';

  const handleAddTheme = async () => {
    const normalizedPath = normalizeThemePath(path);
    if (!normalizedPath) return;
    const existing = themes.find((theme) => theme.path === normalizedPath);
    if (existing) {
      await useCases.theme.updateTheme(existing.id, {
        icon: icon.trim() || existing.icon,
        status: existing.status || 'active',
      });
      setMessage(`已更新：${normalizedPath}`);
    } else {
      const created = await useCases.theme.addTheme(normalizedPath);
      if (created && icon.trim()) {
        await useCases.theme.updateTheme(created.id, { icon: icon.trim(), status: 'active' });
      }
      setMessage(created ? `已添加：${normalizedPath}` : '主题未添加');
    }
    setPath('');
    setIcon('');
  };

  const updateThemePath = async (id: string, nextPath: string) => {
    const normalizedPath = normalizeThemePath(nextPath);
    if (!normalizedPath) return;
    await useCases.theme.updateTheme(id, { path: normalizedPath });
    setMessage(`已更新路径：${normalizedPath}`);
  };

  const updateThemeIcon = async (id: string, nextIcon: string) => {
    await useCases.theme.updateTheme(id, { icon: nextIcon.trim() || undefined });
    setMessage('已更新图标');
  };

  const updateThemeStatus = async (id: string, status: ThemeStatus) => {
    await useCases.theme.updateTheme(id, { status });
    setMessage(status === 'active' ? '已启用' : '已停用');
  };

  const handleDelete = async (id: string) => {
    await useCases.theme.deleteTheme(id);
    setMessage('已删除主题');
  };

  return (
    <div className="think-theme-metadata think-settings-stack">
      <div className="think-management-toolbar">
        <span className="think-settings-caption" role="status">{message || `${themes.length} 个主题`}</span>
        <ThinkInput className="think-settings-search" value={query} onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)} placeholder="搜索主题" aria-label="搜索主题" />
      </div>

      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">新增主题</span>
        <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
          <div className="think-editor-grid think-editor-grid--metadata">
            <ThinkInput aria-label="主题路径" value={path} onInput={(event) => setPath((event.currentTarget as HTMLInputElement).value)} placeholder="主题路径，例如 电脑/记录系统" />
            <ThinkInput aria-label="图标" value={icon} onInput={(event) => setIcon((event.currentTarget as HTMLInputElement).value)} placeholder="图标" />
            <ThinkButton variant="primary" onClick={handleAddTheme} disabled={!path.trim()}>保存</ThinkButton>
          </div>
          {previewThemePath && (
            <div className="think-editor-inline think-editor-inline--wrap think-settings-caption" role="status" aria-live="polite">
              <span className="think-theme-metadata__ellipsis">{previewThemePath}</span>
              <span aria-hidden="true">→</span>
              <span className="think-theme-metadata__preview-icon">{previewIcon}</span>
              <span>{previewIconInfo.sourcePath ? `来源 ${previewIconInfo.sourcePath}` : '默认图标'}</span>
            </div>
          )}
        </div>
      </div>

      <section className="think-settings-section think-settings-section--flat think-theme-metadata__section">
        <div className="think-theme-metadata__columns" aria-hidden="true">
          <span>图标</span>
          <span>路径</span>
          <span>图标来源</span>
          <span>状态</span>
          <span />
        </div>

        <div className="think-theme-metadata__entries">
          {sortedThemes.length ? sortedThemes.map((theme) => {
            const info = inheritedIconInfo(themes, theme.path);
            const inherited = Boolean(info.sourcePath && info.sourcePath !== theme.path);

            return (
              <div key={theme.id} className="think-theme-metadata__entry think-object-frame think-object-frame--compact">
                <ThinkInput className="think-theme-metadata__icon-field" value={theme.icon || ''} onInput={(event) => updateThemeIcon(theme.id, (event.currentTarget as HTMLInputElement).value)} placeholder={info.icon || '🎯'} aria-label={`${theme.path} 图标`} />
                <ThinkInput value={theme.path || ''} onChange={(event) => updateThemePath(theme.id, (event.currentTarget as HTMLInputElement).value)} aria-label={`${theme.path} 路径`} />
                <span className="think-theme-metadata__source">
                  {info.icon || '🎯'} {inherited ? `继承 ${info.sourcePath}` : '本主题'}
                </span>
                <SimpleSelect
                  className="think-theme-metadata__status"
                  value={(theme.status || 'active') as ThemeStatus}
                  options={statusOptions}
                  onChange={(value) => updateThemeStatus(theme.id, value as ThemeStatus)}
                  fullWidth
                />
                <ThinkIconButton
                  className="think-theme-metadata__delete"
                  size="sm"
                  tone="danger"
                  label={`删除主题 ${theme.path}`}
                  icon={<ThinkIcon name="trash-2" />}
                  onClick={() => handleDelete(theme.id)}
                />
              </div>
            );
          }) : (
            <div className="think-theme-metadata__empty">没有匹配的主题</div>
          )}
        </div>
      </section>
    </div>
  );
}
