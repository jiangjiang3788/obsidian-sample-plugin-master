/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  Box,
  SimpleSelect,
  TextField,
  ThinkButton,
  ThinkIcon,
  ThinkIconButton,
  Typography,
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
    <Box className="think-theme-metadata think-settings-stack">
      <Box className="think-settings-row think-settings-row--between">
        <Typography className="think-settings-subheading">主题管理</Typography>
        <span className="think-settings-caption" role="status">{message || `${themes.length} 个主题`}</span>
      </Box>

      <section className="think-settings-section think-settings-section--flat think-theme-metadata__section">
        <Typography className="think-settings-subheading">新增 / 更新主题</Typography>
        <Box className="think-editor-grid think-editor-grid--metadata">
          <TextField
            size="small"
            label="主题路径"
            value={path}
            onChange={(event: any) => setPath(event.target.value)}
            placeholder="电脑/记录系统"
          />
          <TextField
            size="small"
            label="图标"
            value={icon}
            onChange={(event: any) => setIcon(event.target.value)}
            placeholder="🎯"
          />
          <ThinkButton variant="primary" onClick={handleAddTheme} disabled={!path.trim()}>
            保存
          </ThinkButton>
        </Box>
        {previewThemePath && (
          <Box className="think-editor-inline think-editor-inline--wrap think-settings-caption" role="status" aria-live="polite">
            <span className="think-settings-label-strong">图标预览</span>
            <span className="think-theme-metadata__ellipsis">{previewThemePath}</span>
            <span aria-hidden="true">→</span>
            <span className="think-theme-metadata__preview-icon">{previewIcon}</span>
            <span>{previewIconInfo.sourcePath ? `来源 ${previewIconInfo.sourcePath}` : '默认图标'}</span>
          </Box>
        )}
      </section>

      <section className="think-settings-section think-settings-section--flat think-theme-metadata__section">
        <Box className="think-editor-grid think-editor-grid--list-toolbar">
          <Typography className="think-settings-subheading">主题列表</Typography>
          <TextField
            className="think-settings-search"
            size="small"
            value={query}
            onChange={(event: any) => setQuery(event.target.value)}
            placeholder="搜索主题"
            inputProps={{ 'aria-label': '搜索主题' }}
          />
        </Box>

        <Box className="think-theme-metadata__columns" aria-hidden="true">
          <span>图标</span>
          <span>路径</span>
          <span>图标来源</span>
          <span>状态</span>
          <span />
        </Box>

        <Box className="think-theme-metadata__entries">
          {sortedThemes.length ? sortedThemes.map((theme) => {
            const info = inheritedIconInfo(themes, theme.path);
            const inherited = Boolean(info.sourcePath && info.sourcePath !== theme.path);

            return (
              <Box key={theme.id} className="think-theme-metadata__entry">
                <TextField
                  className="think-theme-metadata__icon-field"
                  size="small"
                  value={theme.icon || ''}
                  onChange={(event: any) => updateThemeIcon(theme.id, event.target.value)}
                  placeholder={info.icon || '🎯'}
                  inputProps={{ 'aria-label': `${theme.path} 图标` }}
                />
                <TextField
                  size="small"
                  value={theme.path || ''}
                  onChange={(event: any) => updateThemePath(theme.id, event.target.value)}
                  inputProps={{ 'aria-label': `${theme.path} 路径` }}
                  fullWidth
                />
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
              </Box>
            );
          }) : (
            <Typography className="think-theme-metadata__empty" variant="body2" color="text.secondary">
              没有匹配的主题
            </Typography>
          )}
        </Box>
      </section>
    </Box>
  );
}
