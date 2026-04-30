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

function getThemeOrder(t: ThemeDefinition): number {
  return typeof t.order === 'number' && Number.isFinite(t.order) ? t.order : Number.MAX_SAFE_INTEGER;
}

function compareTheme(a: ThemeDefinition, b: ThemeDefinition): number {
  const ao = getThemeOrder(a);
  const bo = getThemeOrder(b);
  if (ao !== bo) return ao - bo;
  return getThemeLabel(a).localeCompare(getThemeLabel(b), 'zh-Hans-CN');
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
    list.sort(compareTheme);
    childrenByParent.set(key, list);
  }

  return {
    parents: topLevel.sort(compareTheme),
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

  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1 : 1.2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}>
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
                >
                  {parent.icon ? `${parent.icon} ` : ''}
                  {getThemeLabel(parent)}
                </SelectablePill>
              );
            })}
          </div>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}>
            {activeParent ? `${getThemeLabel(activeParent)} · 子主题` : '子主题'}
          </Typography>
          {childThemes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
              {activeParent ? '这个父主题下还没有子主题。' : '先选择一个父主题。'}
            </Typography>
          )}
        </Box>
      </Box>
    </FormControl>
  );
}

export default QuickInputEditorThemeSelector;
