// @ts-nocheck
// src/features/dashboard/ui/ThemeFilter.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import { Box, Checkbox, FormControlLabel, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { buildThemeMatrixTree as buildThemeTree } from '@core/public';
import type { ThemeMatrixTreeNode as ThemeTreeNode, ThemeDefinition } from '@core/public';
import { FilterPopover } from '@shared/ui/components/FilterPopover';

interface ThemeFilterProps {
  selectedThemes: string[];
  onSelectionChange: (themes: string[]) => void;
  themes: ThemeDefinition[];
}

export function ThemeFilter({ selectedThemes, onSelectionChange, themes }: ThemeFilterProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 构建主题树
  const themeTree = useMemo(() => {
    const extendedThemes = themes.map((t) => ({
      ...t,
      status: 'active' as const,
      source: 'predefined' as const,
      usageCount: 0,
    }));
    return buildThemeTree(extendedThemes, expandedNodes);
  }, [themes, expandedNodes]);

  const allThemePaths = useMemo(() => themes.map((t) => t.path), [themes]);

  const getNodeAndDescendantPaths = (node: ThemeTreeNode): string[] => {
    const paths = [node.theme.path];
    node.children.forEach((child) => paths.push(...getNodeAndDescendantPaths(child)));
    return paths;
  };

  const findNodeInTree = (nodes: ThemeTreeNode[], themePath: string): ThemeTreeNode | null => {
    for (const node of nodes) {
      if (node.theme.path === themePath) return node;
      const found = findNodeInTree(node.children, themePath);
      if (found) return found;
    }
    return null;
  };

  const handleToggleTheme = (themePath: string) => {
    const node = findNodeInTree(themeTree, themePath);

    // 有子节点且折叠时：一键选择/取消整棵子树
    if (node && node.children.length > 0 && !node.expanded) {
      const allPaths = getNodeAndDescendantPaths(node);
      const isSelected = selectedThemes.includes(themePath);

      const newSelection = isSelected
        ? selectedThemes.filter((t) => !allPaths.includes(t))
        : [...selectedThemes, ...allPaths.filter((p) => !selectedThemes.includes(p))];
      onSelectionChange(newSelection);
      return;
    }

    const newSelection = selectedThemes.includes(themePath)
      ? selectedThemes.filter((t) => t !== themePath)
      : [...selectedThemes, themePath];
    onSelectionChange(newSelection);
  };

  const handleToggleExpand = (themeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  };

  const renderThemeNode = (node: ThemeTreeNode): any => {
    const hasChildren = node.children.length > 0;
    const isExpanded = node.expanded;
    const indent = node.level * 16;

    return (
      <div key={node.theme.id}>
        <div className="theme-filter-node" style={{ paddingLeft: `${indent}px` }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => handleToggleExpand(node.theme.id)} sx={{ padding: '2px', marginRight: '4px' }} title="展开/折叠">
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
          ) : (
            <div className="theme-filter-node-placeholder" />
          )}

          <FormControlLabel
            control={<Checkbox size="small" checked={selectedThemes.includes(node.theme.path)} onChange={() => handleToggleTheme(node.theme.path)} />}
            label={
              <span
                className="theme-filter-node-label"
                title={hasChildren && !isExpanded ? `${node.theme.path} (折叠时点击选择所有子主题)` : node.theme.path}
              >
                {node.theme.icon && `${node.theme.icon} `}
                {node.theme.path.split('/').pop() || node.theme.path}
              </span>
            }
            sx={{ margin: 0, flex: 1 }}
          />
        </div>

        {isExpanded && hasChildren && <div>{node.children.map((child) => renderThemeNode(child))}</div>}
      </div>
    );
  };

  return (
    <FilterPopover
      label="主题筛选"
      popoverTitle="选择要显示的主题"
      selectedKeys={selectedThemes}
      totalCount={allThemePaths.length}
      getChipLabel={(themePath) => {
        const theme = themes.find((t) => t.path === themePath);
        return theme ? theme.path.split('/').pop() || theme.path : themePath;
      }}
      onDeleteKey={handleToggleTheme}
      onSelectAll={() => onSelectionChange(allThemePaths)}
      onClearAll={() => onSelectionChange([])}
      isEmpty={themeTree.length === 0}
      emptyText="暂无主题"
    >
      <Box>
        {themeTree.map((node) => renderThemeNode(node))}
      </Box>
    </FilterPopover>
  );
}
