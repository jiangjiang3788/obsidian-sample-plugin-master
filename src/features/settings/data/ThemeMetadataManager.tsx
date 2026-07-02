/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  SimpleSelect,
  TextField,
  Typography,
} from '@shared/ui/public';
import { selectSettings, useSelector, useUseCases } from '@/app/public';
import { getThemePathCandidates, getThemePathLeaf, getThemePathParent, normalizeThemePath, ThemeMetadataResolver } from '@core/theme/public';

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

function ThemeCard({ children }: { children: any }) {
  return (
    <Box className="think-editor-card">
      {children}
    </Box>
  );
}

/**
 * 目标中心 P1：主题从“快速输入模板矩阵”降级为数据管理里的 metadata。
 * 主题只负责 path/icon/status；模板主链只走 Goal + 记录类型。
 */
export function ThemeMetadataManager() {
  const settings = useSelector(selectSettings);
  const useCases = useUseCases();
  const themes = settings.inputSettings?.themes || [];
  const [path, setPath] = useState('');
  const [icon, setIcon] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  const sortedThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...themes]
      .filter((theme) => !q || theme.path.toLowerCase().includes(q) || String(theme.icon || '').includes(q))
      .sort((a, b) => (a.path || '').localeCompare(b.path || '', 'zh-Hans-CN'));
  }, [themes, query]);

  const previewThemePath = path.trim() || sortedThemes[0]?.path || '';
  const previewMetadata = useMemo(() => ThemeMetadataResolver.resolve(settings, previewThemePath), [settings, previewThemePath]);
  const previewIconInfo = useMemo(() => inheritedIconInfo(themes, previewThemePath), [themes, previewThemePath]);

  const handleAddTheme = async () => {
    const normalizedPath = normalizeThemePath(path);
    if (!normalizedPath) return;
    const existing = themes.find((theme) => theme.path === normalizedPath);
    if (existing) {
      await useCases.theme.updateTheme(existing.id, { icon: icon.trim() || existing.icon, status: existing.status || 'active' });
      setMessage(`已更新主题元数据：${normalizedPath}`);
    } else {
      const created = await useCases.theme.addTheme(normalizedPath);
      if (created && icon.trim()) await useCases.theme.updateTheme(created.id, { icon: icon.trim(), status: 'active' });
      setMessage(created ? `已添加主题：${normalizedPath}` : '主题未添加');
    }
    setPath('');
    setIcon('');
  };

  const updateThemePath = async (id: string, nextPath: string) => {
    const normalizedPath = normalizeThemePath(nextPath);
    if (!normalizedPath) return;
    await useCases.theme.updateTheme(id, { path: normalizedPath });
    setMessage(`已更新主题路径：${normalizedPath}`);
  };

  const updateThemeIcon = async (id: string, nextIcon: string) => {
    await useCases.theme.updateTheme(id, { icon: nextIcon.trim() || undefined });
    setMessage('已更新主题图标。');
  };

  const updateThemeStatus = async (id: string, status: ThemeStatus) => {
    await useCases.theme.updateTheme(id, { status });
    setMessage(status === 'active' ? '主题已启用。' : '主题已停用。');
  };

  const handleDelete = async (id: string) => {
    await useCases.theme.deleteTheme(id);
    setMessage('主题已删除。');
  };

  return (
    <Box className="think-theme-metadata">
      <Box>
        <Typography variant="h6">主题管理</Typography>
        <Typography variant="body2" color="text.secondary">
          主题已从快速输入模板主轴降级为数据元信息：只管理路径、图标和启停状态。目标通过 themePath 引用主题，模板仍由“目标 × 记录类型”决定。
        </Typography>
      </Box>

      <Box className="think-theme-metadata__preview">
        <Chip size="small" label={`主题 ${themes.length}`} />
        <Chip size="small" label="模板主链：目标 × 记录类型" color="primary" />
      </Box>

      {message && <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>}

      <ThemeCard>
        <Typography className="think-settings-label-strong">主题图标继承预览</Typography>
        <Typography variant="body2" color="text.secondary">
          目标绑定更深层主题时，图标会从当前主题或最近的父主题继承；模板仍然保留原始 themePath。
        </Typography>
        <Box className="think-theme-metadata__preview">
          <Chip size="small" label={`预览路径：${previewThemePath || '未选择'}`} />
          <Chip size="small" label={`渲染图标：${previewMetadata.icon || previewIconInfo.icon || '🎯'}`} color={(previewMetadata.icon || previewIconInfo.icon) ? 'primary' : 'default'} />
          <Chip size="small" label={`图标来源：${previewIconInfo.sourcePath || '默认'}`} />
        </Box>
      </ThemeCard>

      <ThemeCard>
        <Typography className="think-settings-label-strong">新增 / 更新主题元数据</Typography>
        <Typography variant="body2" color="text.secondary">如果路径已存在，会更新图标；不会创建或修改任何主题模板 override。</Typography>
        <Box className="think-editor-grid think-editor-grid--metadata">
          <TextField size="small" label="主题路径" value={path} onChange={(event: any) => setPath(event.target.value)} placeholder="例如：电脑/记录系统" />
          <TextField size="small" label="图标" value={icon} onChange={(event: any) => setIcon(event.target.value)} placeholder="🎯" />
          <Button variant="contained" onClick={handleAddTheme} disabled={!path.trim()}>保存主题</Button>
        </Box>
      </ThemeCard>

      <ThemeCard>
        <Box className="think-editor-grid think-editor-grid--list-toolbar">
          <Box>
            <Typography className="think-settings-label-strong">主题列表</Typography>
            <Typography variant="body2" color="text.secondary">在这里维护图标和路径。需要修改目标专属写法时请到“数据管理 → 目标 → 记录预设”。</Typography>
          </Box>
          <TextField size="small" label="搜索主题" value={query} onChange={(event: any) => setQuery(event.target.value)} />
        </Box>
        <Box className="think-theme-metadata__entries">
          {sortedThemes.length ? sortedThemes.map((theme) => (
            <Box
              key={theme.id}
              className="think-theme-metadata__entry"
            >
              <TextField size="small" label="图标" value={theme.icon || ''} onChange={(event: any) => updateThemeIcon(theme.id, event.target.value)} />
              <TextField size="small" label={getThemePathParent(theme.path) ? `父级：${getThemePathParent(theme.path)}` : '根主题'} value={theme.path || ''} onChange={(event: any) => updateThemePath(theme.id, event.target.value)} />
              <Typography variant="body2" color="text.secondary">{getThemePathLeaf(theme.path)}</Typography>
              {(() => {
                const info = inheritedIconInfo(themes, theme.path);
                const inherited = info.sourcePath && info.sourcePath !== theme.path;
                return <Typography variant="caption" color="text.secondary">{info.icon || '🎯'} {inherited ? `继承自 ${info.sourcePath}` : '本主题图标'}</Typography>;
              })()}
              <SimpleSelect value={(theme.status || 'active') as ThemeStatus} options={statusOptions} onChange={(value) => updateThemeStatus(theme.id, value as ThemeStatus)} fullWidth />
              <Button size="small" variant="text" onClick={() => handleDelete(theme.id)}>删除</Button>
            </Box>
          )) : <Typography variant="body2" color="text.secondary">暂无主题。</Typography>}
        </Box>
      </ThemeCard>

      <Divider />
    </Box>
  );
}
