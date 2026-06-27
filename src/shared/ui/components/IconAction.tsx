/** @jsxImportSource preact */
import { h } from 'preact';

import type { VNode } from 'preact';
import { IconButton, Tooltip } from '../muiCompat';

export type IconActionProps = {
  /** 用于 Tooltip 与 aria-label */
  label: string;
  /** 直接传入 <Icon fontSize="small" /> */
  icon: VNode;
  onClick?: (e: any) => void;
  disabled?: boolean;
  /** 默认 true：用于行内按钮不触发行点击 */
  stopPropagation?: boolean;
  tooltipPlacement?: 'bottom-end' | 'bottom-start' | 'bottom' | 'left-end' | 'left-start' | 'left' | 'right-end' | 'right-start' | 'right' | 'top-end' | 'top-start' | 'top';
  /** @deprecated Prefer className and a shared primitive variant. */
  sx?: any;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  edge?: false | 'start' | 'end';
  color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  pressed?: boolean;
};

/**
 * IconAction
 *
 * 统一 Tooltip + IconButton 组合：
 * - label 同时作为 tooltip 与 aria-label
 * - disabled 时 tooltip 仍可显示（用 span 包一层）
 * - 默认 stopPropagation=true（行内 action 按钮常见需求）
 * - V2 起默认消费 think-icon-button primitive
 */
export function IconAction({
  label,
  icon,
  onClick,
  disabled,
  stopPropagation = true,
  tooltipPlacement = 'top',
  sx,
  className,
  size = 'small',
  edge,
  color,
  pressed,
}: IconActionProps) {
  const handleClick = (e: any) => {
    if (stopPropagation) {
      try { e.stopPropagation?.(); } catch {}
    }
    onClick?.(e);
  };

  const primitiveSize = size === 'small' ? 'think-icon-button--sm' : size === 'large' ? 'think-icon-button--lg' : '';
  const classes = [
    'think-icon-button',
    primitiveSize,
    color === 'error' ? 'think-icon-button--danger' : '',
    className,
  ].filter(Boolean).join(' ');

  // MUI Tooltip 在 disabled button 上不会触发，需要包一层 span
  const button = (
    <IconButton
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      onClick={onClick ? handleClick : undefined}
      disabled={disabled}
      sx={sx}
      className={classes}
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
