/** @jsxImportSource preact */
import { h } from 'preact';

import type { ThemeDefinition } from '@core/public';

import { Box, Button, FormControl, Typography } from '@mui/material';

export interface TwoLevelThemeSelectorProps {
  themes: ThemeDefinition[];
  selectedThemeId: string | null;
  onSelect: (themeId: string | null, path: string | null) => void;
  dense?: boolean;
}

interface ThemeNode {
  id: string;
  path: string;
  name: string;
  icon?: string;
  parentPath: string | null;
}

function parseNode(theme: ThemeDefinition): ThemeNode {
  const parts = theme.path.split('/').filter(Boolean);
  return {
    id: theme.id,
    path: theme.path,
    name: parts[parts.length - 1] || theme.path,
    icon: theme.icon,
    parentPath: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
  };
}

function getButtonSx(active: boolean) {
  return {
    minWidth: 'auto',
    px: 1.5,
    py: 0.75,
    border: 'none',
    borderRadius: 2,
    justifyContent: 'flex-start',
    textTransform: 'none',
    lineHeight: 1.2,
    boxShadow: 'none',
    backgroundColor: active ? 'var(--interactive-accent)' : 'var(--background-modifier-hover)',
    color: active ? 'var(--text-on-accent)' : 'var(--text-normal)',
    '&:hover': {
      border: 'none',
      boxShadow: 'none',
      backgroundColor: active ? 'var(--interactive-accent-hover)' : 'var(--background-modifier-border-hover)',
    },
  } as const;
}

export function TwoLevelThemeSelector({ themes, selectedThemeId, onSelect, dense = false }: TwoLevelThemeSelectorProps) {
  if (!themes || themes.length === 0) return null;

  const nodes = themes.map(parseNode);
  const roots = nodes.filter((n) => n.parentPath === null);
  const childrenByParent = new Map<string, ThemeNode[]>();
  for (const node of nodes) {
    if (!node.parentPath) continue;
    if (!childrenByParent.has(node.parentPath)) childrenByParent.set(node.parentPath, []);
    childrenByParent.get(node.parentPath)!.push(node);
  }

  const selectedNode = nodes.find((node) => node.id === selectedThemeId) || null;
  const activeParentPath = selectedNode?.parentPath ?? selectedNode?.path ?? roots[0]?.path ?? null;
  const childThemes = activeParentPath ? (childrenByParent.get(activeParentPath) || []).filter((child) => child.path !== activeParentPath) : [];
  const childAreaHeight = dense ? 88 : 104;

  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        主题分类
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1 : 1.25 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            父主题
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {roots.map((theme) => {
              const isActive = activeParentPath === theme.path;
              return (
                <Button key={theme.id} variant="contained" disableElevation onClick={() => onSelect(theme.id, theme.path)} sx={getButtonSx(isActive)}>
                  {theme.icon ? `${theme.icon} ${theme.name}` : theme.name}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ borderTop: '1px solid var(--background-modifier-border)', pt: dense ? 1 : 1.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            {activeParentPath ? `${activeParentPath.split('/').filter(Boolean).pop()} · 子主题` : '子主题'}
          </Typography>

          <Box
            sx={{
              minHeight: childAreaHeight,
              maxHeight: childAreaHeight,
              overflowY: 'auto',
              pr: 0.5,
              display: 'flex',
              alignItems: childThemes.length > 0 ? 'flex-start' : 'center',
            }}
          >
            {childThemes.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {childThemes.map((theme) => {
                  const isActive = selectedThemeId === theme.id;
                  return (
                    <Button key={theme.id} variant="contained" disableElevation onClick={() => onSelect(theme.id, theme.path)} sx={getButtonSx(isActive)}>
                      {theme.icon ? `${theme.icon} ${theme.name}` : theme.name}
                    </Button>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                这个父主题下没有子主题
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </FormControl>
  );
}

export default TwoLevelThemeSelector;
