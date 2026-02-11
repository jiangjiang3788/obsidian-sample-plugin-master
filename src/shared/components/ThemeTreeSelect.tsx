/**
 * ThemeTreeSelect - 统一主题树选择组件（Dropdown）
 *
 * 说明：
 * - Dropdown 触发器 + Popper 容器在这里
 * - 树的渲染/搜索/展开/多选逻辑下沉到 ThemeTreeSelectPanel，便于在 FilterPopover 等场景复用
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useMemo, useRef, useState, useCallback } from 'preact/hooks';
import { Box, Paper, Popper, ClickAwayListener } from '@mui/material';

import type { ThemeDefinition } from '@core/public';
import type { ThemePathTreeNode as ThemeTreeNode } from '@core/public';

import { ThemeTreeSelectTrigger } from './ThemeTreeSelect/Trigger';
import { ThemeTreeSelectPanel, type ThemeTreeSelectPanelProps } from './ThemeTreeSelect/Panel';

export interface ThemeTreeSelectProps {
  /** 主题列表 */
  themes: ThemeDefinition[];

  /** 已选中的主题 ID（单选模式） */
  selectedThemeId?: string | null;

  /** 已选中的主题路径列表（多选模式） */
  selectedPaths?: string[];

  /** 选中变化回调（单选模式） */
  onSelect?: (themeId: string | null, path: string | null) => void;

  /** 选中变化回调（多选模式） */
  onSelectMultiple?: (paths: string[]) => void;

  /** 是否多选模式 */
  multiSelect?: boolean;

  /** 是否允许清空 */
  allowClear?: boolean;

  /** 是否启用搜索 */
  searchable?: boolean;

  /** 是否显示多选工具栏（全选/清空等） */
  showToolbar?: boolean;

  /** 是否显示已选 chips（多选模式） */
  showSelectedChips?: boolean;

  /** 默认展开的节点 ID 列表 */
  defaultExpandedIds?: string[];

  /** 默认展开全部 */
  defaultExpandAll?: boolean;

  /** 展开到已选节点 */
  expandToSelected?: boolean;

  /** 自定义标签渲染 */
  renderLabel?: (node: ThemeTreeNode) => ComponentChildren;

  /** 占位符文本 */
  placeholder?: string;

  /** 禁用状态 */
  disabled?: boolean;

  /** 尺寸 */
  size?: 'small' | 'medium';

  /** 样式覆盖（作用于 trigger 外层） */
  sx?: Record<string, any>;

  /** 下拉面板最大高度 */
  maxDropdownHeight?: number;

  /**
   * 多选时：当点击“有子节点且当前为折叠”的父节点时，
   * 是否按“整棵子树”进行选择/取消（更符合 ThemeFilter 的旧交互）。
   */
  selectChildrenOnCollapsedParent?: boolean;
}

/**
 * Dropdown 版 ThemeTreeSelect
 */
export function ThemeTreeSelect({
  themes,
  selectedThemeId,
  selectedPaths = [],
  onSelect,
  onSelectMultiple,
  multiSelect = false,
  allowClear = true,
  searchable = true,
  showToolbar = true,
  showSelectedChips = true,
  defaultExpandedIds = [],
  defaultExpandAll = false,
  expandToSelected = true,
  renderLabel,
  placeholder = '选择主题',
  disabled = false,
  size = 'small',
  sx = {},
  maxDropdownHeight = 300,
  selectChildrenOnCollapsedParent = false,
}: ThemeTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 是否有选中
  const hasSelection = multiSelect ? selectedPaths.length > 0 : !!selectedThemeId;

  // trigger 显示文本
  const displayText = useMemo(() => {
    if (multiSelect) {
      if (selectedPaths.length === 0) return placeholder;
      if (selectedPaths.length === 1) {
        const p = selectedPaths[0];
        return p.split('/').pop() || p;
      }
      return `${selectedPaths.length} 个主题`;
    }

    if (!selectedThemeId) return placeholder;
    const theme = themes.find((t) => t.id === selectedThemeId);
    if (!theme) return placeholder;
    const name = theme.path.split('/').pop() || theme.path;
    return theme.icon ? `${theme.icon} ${name}` : name;
  }, [multiSelect, placeholder, selectedPaths, selectedThemeId, themes]);

  // 清空选择
  const handleClear = useCallback(
    (e: Event) => {
      e.stopPropagation();
      if (disabled) return;

      if (multiSelect) {
        onSelectMultiple?.([]);
      } else {
        onSelect?.(null, null);
      }
    },
    [disabled, multiSelect, onSelect, onSelectMultiple]
  );

  const handleClose = useCallback(() => setOpen(false), []);

  // Panel props（供 dropdown 复用）
  const panelProps: ThemeTreeSelectPanelProps = {
    themes,
    selectedThemeId,
    selectedPaths,
    onSelect,
    onSelectMultiple,
    multiSelect,
    searchable,
    showToolbar,
    showSelectedChips,
    defaultExpandedIds,
    defaultExpandAll,
    expandToSelected,
    renderLabel,
    maxHeight: maxDropdownHeight,
    selectChildrenOnCollapsedParent,
    disabled,
    // 单选时：选中即关闭（多选保持打开）
    onRequestClose: multiSelect ? undefined : handleClose,
  };

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <ThemeTreeSelectTrigger
        anchorRef={anchorRef}
        open={open}
        onToggleOpen={() => !disabled && setOpen(!open)}
        displayText={displayText}
        hasSelection={hasSelection}
        allowClear={allowClear}
        disabled={disabled}
        size={size}
        onClear={handleClear}
      />

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: 1300, minWidth: anchorRef.current?.offsetWidth }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Paper
            sx={{
              mt: 0.5,
              border: '1px solid var(--background-modifier-border)',
              boxShadow: 2,
            }}
          >
            <ThemeTreeSelectPanel {...panelProps} />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}

// Re-export Panel（供 FilterPopover 等 inline 场景使用）
export { ThemeTreeSelectPanel };
export type { ThemeTreeSelectPanelProps } from './ThemeTreeSelect/Panel';

export default ThemeTreeSelect;