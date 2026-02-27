/** @jsxImportSource preact */
import { h } from 'preact';

import type { VNode } from 'preact';
import type { IconButtonProps, TooltipProps } from '@mui/material';
import { IconButton, Tooltip } from '@mui/material';

export type IconActionProps = {
  /** 用于 Tooltip 与 aria-label */
  label: string;
  /** 直接传入 <Icon fontSize="small" /> */
  icon: VNode;
  onClick?: (e: any) => void;
  disabled?: boolean;
  /** 默认 true：用于行内按钮不触发行点击 */
  stopPropagation?: boolean;
  tooltipPlacement?: TooltipProps['placement'];
} & Pick<IconButtonProps, 'sx' | 'size' | 'edge' | 'color'>;

/**
 * IconAction
 *
 * 统一 Tooltip + IconButton 组合：
 * - label 同时作为 tooltip 与 aria-label
 * - disabled 时 tooltip 仍可显示（用 span 包一层）
 * - 默认 stopPropagation=true（行内 action 按钮常见需求）
 */
export function IconAction({
  label,
  icon,
  onClick,
  disabled,
  stopPropagation = true,
  tooltipPlacement = 'top',
  sx,
  size = 'small',
  edge,
  color,
}: IconActionProps) {
  const handleClick = (e: any) => {
    if (stopPropagation) {
      try { e.stopPropagation?.(); } catch {}
    }
    onClick?.(e);
  };

  // MUI Tooltip 在 disabled button 上不会触发，需要包一层 span
  const button = (
    <IconButton
      aria-label={label}
      onClick={onClick ? handleClick : undefined}
      disabled={disabled}
      sx={sx}
      size={size}
      edge={edge}
      color={color}
    >
      {icon}
    </IconButton>
  );

  return (
    <Tooltip title={label} placement={tooltipPlacement}>
      {disabled ? <span>{button}</span> : button}
    </Tooltip>
  );
}

export default IconAction;
