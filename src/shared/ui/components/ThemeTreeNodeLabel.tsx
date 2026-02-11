/** @jsxImportSource preact */
/**
 * ThemeTreeNodeLabel - 统一主题树节点“左侧标签区域”
 *
 * 目的：
 * - 复用“缩进 + 展开/折叠按钮 + 占位对齐”逻辑
 * - 供 ThemeTreeSelect（列表树）与 ThemeMatrix（表格树）共用，减少重复实现
 *
 * 约束：
 * - 纯 UI（props 驱动），不读 store、不触 ports
 */
import { h, type ComponentChildren } from 'preact';
import { Box, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// HACK: Cast MUI components to `any` to avoid Preact/React type conflicts.
const AnyBox = Box as any;
const AnyIconButton = IconButton as any;

export interface ThemeTreeNodeLabelProps {
  /** 节点深度（从 0 开始） */
  depth: number;

  /** 是否有子节点 */
  hasChildren: boolean;

  /** 是否展开 */
  expanded: boolean;

  /** 点击展开/折叠 */
  onToggleExpand?: (e?: any) => void;

  /** 内容（通常是 icon + label + 右侧操作） */
  children: ComponentChildren;

  /** 左侧缩进：每层缩进单位（MUI spacing units），默认 2 */
  indentUnit?: number;

  /** 基础左侧 padding（MUI spacing units），默认 1 */
  basePadding?: number;

  /** 没有 children 时的占位宽度（px），默认 24 */
  placeholderWidthPx?: number;

  /** 自定义样式（作用于外层容器） */
  sx?: Record<string, any>;
}

export function ThemeTreeNodeLabel({
  depth,
  hasChildren,
  expanded,
  onToggleExpand,
  children,
  indentUnit = 2,
  basePadding = 1,
  placeholderWidthPx = 24,
  sx = {},
}: ThemeTreeNodeLabelProps) {
  return (
    <AnyBox
      sx={{
        display: 'flex',
        alignItems: 'center',
        pl: basePadding + depth * indentUnit,
        ...sx,
      }}
    >
      {hasChildren ? (
        <AnyIconButton
          size="small"
          onClick={(e: any) => {
            // 避免触发父级 click（例如 ListItemButton 或 TableRow）
            e?.stopPropagation?.();
            onToggleExpand?.(e);
          }}
          sx={{ mr: 0.5, p: 0.25 }}
        >
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </AnyIconButton>
      ) : (
        <AnyBox sx={{ width: placeholderWidthPx, mr: 0.5 }} />
      )}

      <AnyBox sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        {children}
      </AnyBox>
    </AnyBox>
  );
}
