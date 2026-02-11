/** @jsxImportSource preact */
/**
 * ThemeTreeSelectPanel - ThemeTreeSelect 的“面板模式”（无 trigger / 无 Popper）
 *
 * 用途：
 * - 在 FilterPopover、侧栏等“已有容器”的场景中复用主题树选择能力
 * - 避免嵌套 Popper（popover 里再 popper）造成交互/定位问题
 *
 * 约束：
 * - 纯 UI（props 驱动），不读 store、不触 ports
 */
import { h, type ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { Box, List, Typography } from '@mui/material';

import type { ThemeDefinition } from '@core/public';
import {
  ThemePathTreeBuilder as ThemeTreeBuilder,
  type ThemePathTreeNode as ThemeTreeNode,
  buildThemePathTree as buildThemeTree,
  searchThemePathTree as searchThemeTree,
} from '@core/public';

import { SearchBox } from './SearchBox';
import { MultiSelectToolbar } from './MultiSelectToolbar';
import { SelectedPathsChips } from './SelectedPathsChips';
import { ThemeTreeNodeItem } from './ThemeTreeNodeItem';

export interface ThemeTreeSelectPanelProps {
  /** 主题列表 */
  themes: ThemeDefinition[];

  /** 单选：当前选中 themeId */
  selectedThemeId?: string | null;

  /** 多选：当前选中的 path 列表 */
  selectedPaths?: string[];

  /** 单选回调 */
  onSelect?: (themeId: string | null, path: string | null) => void;

  /** 多选回调 */
  onSelectMultiple?: (paths: string[]) => void;

  /** 是否多选模式 */
  multiSelect?: boolean;

  /** 是否启用搜索框 */
  searchable?: boolean;

  /** 是否显示多选工具栏（全选/清空等） */
  showToolbar?: boolean;

  /** 是否显示已选 chip（多选模式） */
  showSelectedChips?: boolean;

  /** 默认展开节点 id 列表 */
  defaultExpandedIds?: string[];

  /** 默认展开全部 */
  defaultExpandAll?: boolean;

  /** 展开到已选节点 */
  expandToSelected?: boolean;

  /** 自定义 label 渲染 */
  renderLabel?: (node: ThemeTreeNode) => ComponentChildren;

  /** 面板最大高度（滚动区域） */
  maxHeight?: number;

  /** 样式覆盖 */
  sx?: Record<string, any>;

  /**
   * 多选时：当点击“有子节点且当前为折叠”的父节点时，
   * 是否按“整棵子树”进行选择/取消（更符合 ThemeFilter 的旧交互）。
   */
  selectChildrenOnCollapsedParent?: boolean;

  /** 单选后是否请求外部关闭（用于 dropdown 模式复用） */
  onRequestClose?: () => void;

  /** 禁用（只读） */
  disabled?: boolean;
}

export function ThemeTreeSelectPanel({
  themes,
  selectedThemeId,
  selectedPaths = [],
  onSelect,
  onSelectMultiple,
  multiSelect = false,
  searchable = true,
  showToolbar = true,
  showSelectedChips = true,
  defaultExpandedIds = [],
  defaultExpandAll = false,
  expandToSelected = true,
  renderLabel,
  maxHeight = 300,
  sx = {},
  selectChildrenOnCollapsedParent = false,
  onRequestClose,
  disabled = false,
}: ThemeTreeSelectPanelProps) {
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');

  // 展开状态
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(defaultExpandedIds));

  // 构建主题树
  const themeTree = useMemo(() => buildThemeTree(themes), [themes]);

  // 初始化展开状态：展开到已选节点
  useEffect(() => {
    if (!expandToSelected) return;

    const pathsToExpand: string[] = [];

    if (multiSelect && selectedPaths.length > 0) {
      selectedPaths.forEach((p) => pathsToExpand.push(...ThemeTreeBuilder.getAncestorPaths(p)));
    } else if (selectedThemeId) {
      const theme = themes.find((t) => t.id === selectedThemeId);
      if (theme?.path) {
        pathsToExpand.push(...ThemeTreeBuilder.getAncestorPaths(theme.path));
      }
    }

    if (pathsToExpand.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        pathsToExpand.forEach((p) => next.add(p));
        return next;
      });
    }
  }, [expandToSelected, multiSelect, selectedPaths, selectedThemeId, themes]);

  // 默认展开全部
  useEffect(() => {
    if (!defaultExpandAll || themeTree.length === 0) return;

    const allIds: string[] = [];
    const collect = (nodes: ThemeTreeNode[]) => {
      nodes.forEach((n) => {
        allIds.push(n.id);
        collect(n.children);
      });
    };
    collect(themeTree);
    setExpandedIds(new Set(allIds));
  }, [defaultExpandAll, themeTree]);

  // 过滤后的树
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return themeTree;
    return searchThemeTree(themeTree, searchTerm);
  }, [themeTree, searchTerm]);

  // 切换展开
  const toggleExpand = useCallback((nodeId: string, e?: Event) => {
    e?.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // 单选处理
  const handleSingleSelect = useCallback(
    (node: ThemeTreeNode) => {
      if (disabled) return;
      if (onSelect) onSelect(node.themeId, node.path);
      onRequestClose?.();
    },
    [disabled, onSelect, onRequestClose]
  );

  // 选择包含子节点
  const handleSelectWithChildren = useCallback(
    (node: ThemeTreeNode) => {
      if (disabled) return;
      if (!onSelectMultiple) return;

      const descendantPaths = ThemeTreeBuilder.getDescendantPaths(node);
      const allPaths = [node.path, ...descendantPaths];
      const hasAll = allPaths.every((p) => selectedPaths.includes(p));

      if (hasAll) {
        // 全部取消
        const toRemove = new Set(allPaths);
        onSelectMultiple(selectedPaths.filter((p) => !toRemove.has(p)));
      } else {
        // 全部添加
        onSelectMultiple([...new Set([...selectedPaths, ...allPaths])]);
      }
    },
    [disabled, onSelectMultiple, selectedPaths]
  );

  // 多选处理（仅切换“节点本身”，取消时会一并移除子节点）
  const handleMultiSelect = useCallback(
    (node: ThemeTreeNode) => {
      if (disabled) return;
      if (!onSelectMultiple) return;

      // ThemeFilter 旧交互：折叠父节点时，点击按“整棵子树”处理
      const hasChildren = node.children.length > 0;
      const isCollapsed = hasChildren && !expandedIds.has(node.id);

      if (selectChildrenOnCollapsedParent && isCollapsed) {
        handleSelectWithChildren(node);
        return;
      }

      const path = node.path;
      const isSelected = selectedPaths.includes(path);

      if (isSelected) {
        // 取消选择：移除该节点及其所有子节点
        const descendantPaths = ThemeTreeBuilder.getDescendantPaths(node);
        const toRemove = new Set([path, ...descendantPaths]);
        onSelectMultiple(selectedPaths.filter((p) => !toRemove.has(p)));
      } else {
        // 选择：只添加该节点
        onSelectMultiple([...selectedPaths, path]);
      }
    },
    [
      disabled,
      expandedIds,
      handleSelectWithChildren,
      onSelectMultiple,
      selectedPaths,
      selectChildrenOnCollapsedParent,
    ]
  );

  return (
    <Box sx={{ ...sx }}>
      {/* 搜索框 */}
      {searchable && <SearchBox value={searchTerm} onChange={setSearchTerm} />}

      {/* 多选工具栏 */}
      {multiSelect && showToolbar && (
        <MultiSelectToolbar themeTree={themeTree} onSelectMultiple={onSelectMultiple} />
      )}

      {/* 树列表 */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {filteredTree.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {themes.length === 0 ? '暂无主题' : '无匹配结果'}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {filteredTree.map((node) => (
              <ThemeTreeNodeItem
                key={node.id}
                node={node}
                expandedIds={expandedIds}
                selectedPaths={multiSelect ? selectedPaths : []}
                selectedThemeId={multiSelect ? null : selectedThemeId}
                multiSelect={multiSelect}
                onToggleExpand={toggleExpand}
                onSingleSelect={handleSingleSelect}
                onMultiSelect={handleMultiSelect}
                onSelectWithChildren={handleSelectWithChildren}
                renderLabel={renderLabel}
              />
            ))}
          </List>
        )}
      </Box>

      {/* 多选时：已选 chips */}
      {multiSelect && showSelectedChips && (
        <SelectedPathsChips
          selectedPaths={selectedPaths}
          onRemovePath={(path) => onSelectMultiple?.(selectedPaths.filter((p) => p !== path))}
        />
      )}
    </Box>
  );
}

export default ThemeTreeSelectPanel;
