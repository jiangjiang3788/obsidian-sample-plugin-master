/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, FormControl, Typography } from '@mui/material';

import type { ThemeDefinition } from '@core/public';

import { SelectablePill } from './SelectablePill';

export interface QuickInputEditorThemeSelectorProps {
  themes: ThemeDefinition[];
  selectedThemeId: string | null;
  onSelect: (themeId: string | null, path: string | null) => void;
  dense?: boolean;
}

function getThemeLabel(theme: ThemeDefinition): string {
  const raw = theme.path?.split('/').filter(Boolean).pop() || '';
  return raw || theme.path || '';
}

function buildThemeGroups(themes: ThemeDefinition[]) {
  const topLevel = themes.filter((t) => !t.path.includes('/'));
  const childrenByParent = new Map<string, ThemeDefinition[]>();

  themes.forEach((theme) => {
    const parts = theme.path.split('/').filter(Boolean);
    if (parts.length < 2) return;
    const parentPath = parts.slice(0, parts.length - 1).join('/');
    const list = childrenByParent.get(parentPath) || [];
    list.push(theme);
    childrenByParent.set(parentPath, list);
  });

  for (const [key, list] of childrenByParent.entries()) {
    list.sort((a, b) => getThemeLabel(a).localeCompare(getThemeLabel(b), 'zh-Hans-CN'));
    childrenByParent.set(key, list);
  }

  return {
    parents: topLevel.sort((a, b) => getThemeLabel(a).localeCompare(getThemeLabel(b), 'zh-Hans-CN')),
    childrenByParent,
  };
}

export function QuickInputEditorThemeSelector({
  themes,
  selectedThemeId,
  onSelect,
  dense = false,
}: QuickInputEditorThemeSelectorProps) {
  if (!themes || themes.length === 0) return null;

  const { parents, childrenByParent } = buildThemeGroups(themes);
  const selectedTheme = themes.find((t) => t.id === selectedThemeId) || null;
  const selectedPath = selectedTheme?.path || null;
  const activeParentPath = selectedPath
    ? selectedPath.includes('/')
      ? selectedPath.slice(0, selectedPath.lastIndexOf('/'))
      : selectedPath
    : null;
  const activeParent = activeParentPath ? themes.find((t) => t.path === activeParentPath) || null : null;
  const childThemes = activeParentPath ? childrenByParent.get(activeParentPath) || [] : [];
  const childAreaHeight = dense ? 92 : 108;

  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        主题分类
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            父主题
          </Typography>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {parents.map((parent) => {
              const isSelected = selectedThemeId === parent.id;
              const isActiveParent = activeParentPath === parent.path;
              return (
                <SelectablePill
                  key={parent.id}
                  selected={isSelected || isActiveParent}
                  title={parent.path}
                  onClick={() => onSelect(parent.id, parent.path)}
                  style={
                    isSelected || isActiveParent
                      ? {}
                      : {
                          border: '2px solid transparent',
                        }
                  }
                >
                  {parent.icon ? `${parent.icon} ` : ''}
                  {getThemeLabel(parent)}
                </SelectablePill>
              );
            })}
          </div>
        </Box>

        <div
          style={{
            height: '1px',
            background: 'var(--background-modifier-border)',
            opacity: 0.9,
          }}
        />

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            {activeParent ? `${getThemeLabel(activeParent)} · 子主题` : '子主题'}
          </Typography>
          <div
            style={{
              minHeight: `${childAreaHeight}px`,
              maxHeight: `${childAreaHeight}px`,
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {childThemes.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                {childThemes.map((child) => (
                  <SelectablePill
                    key={child.id}
                    selected={selectedThemeId === child.id}
                    title={child.path}
                    onClick={() => onSelect(child.id, child.path)}
                  >
                    {child.icon ? `${child.icon} ` : ''}
                    {getThemeLabel(child)}
                  </SelectablePill>
                ))}
              </div>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                {activeParent ? '这个父主题下还没有子主题。' : '先选择一个父主题。'}
              </div>
            )}
          </div>
        </Box>
      </Box>
    </FormControl>
  );
}

export default QuickInputEditorThemeSelector;
