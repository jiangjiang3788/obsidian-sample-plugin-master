// src/shared/ui/views/ThemeFilter.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';

import type { ThemeDefinition } from '@core/public';
import { FilterPopover } from '@shared/ui/components/FilterPopover';
import { ThemeTreeSelectPanel } from '@/shared/components/ThemeTreeSelect';

interface ThemeFilterProps {
  /** 选中的主题 path 列表 */
  selectedThemes: string[];
  onSelectionChange: (themes: string[]) => void;
  themes: ThemeDefinition[];
}

/**
 * ThemeFilter - 主题筛选（基于统一 ThemeTreeSelectPanel）
 *
 * 说明：
 * - 保留 FilterPopover（按钮 + chip 汇总 + 全选/清空）
 * - Popover 内容使用 ThemeTreeSelectPanel（复用：搜索/树渲染/多选逻辑）
 * - 避免维护一套“checkbox 树 + 展开状态 + 子树选择”的重复实现
 */
export function ThemeFilter({ selectedThemes, onSelectionChange, themes }: ThemeFilterProps) {
  const allThemePaths = useMemo(() => themes.map((t) => t.path), [themes]);

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
      onDeleteKey={(themePath) => {
        onSelectionChange(selectedThemes.filter((t) => t !== themePath));
      }}
      onSelectAll={() => onSelectionChange(allThemePaths)}
      onClearAll={() => onSelectionChange([])}
      isEmpty={themes.length === 0}
      emptyText="暂无主题"
    >
      <ThemeTreeSelectPanel
        themes={themes}
        selectedPaths={selectedThemes}
        onSelectMultiple={onSelectionChange}
        multiSelect={true}
        searchable={true}
        // FilterPopover 已提供“全选/清空”按钮 + chip 汇总，这里隐藏工具栏/已选 chips
        showToolbar={false}
        showSelectedChips={false}
        maxHeight={360}
        // 复刻旧 ThemeFilter 交互：折叠父节点时点击按“整棵子树”处理
        selectChildrenOnCollapsedParent={true}
        sx={{ minWidth: 320 }}
      />
    </FilterPopover>
  );
}
