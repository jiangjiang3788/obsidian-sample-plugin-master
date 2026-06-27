/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';
import type { ThinkControlSize } from './Button';

export interface ThinkIconButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'children'> {
  label: string;
  icon: ComponentChildren;
  size?: ThinkControlSize;
  tone?: 'default' | 'danger';
  pressed?: boolean;
}

export function ThinkIconButton({
  label,
  icon,
  size = 'md',
  tone = 'default',
  pressed,
  className,
  type = 'button',
  ...buttonProps
}: ThinkIconButtonProps) {
  const classes = [
    'think-icon-button',
    size !== 'md' ? `think-icon-button--${size}` : '',
    tone === 'danger' ? 'think-icon-button--danger' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
    >
      {icon}
    </button>
  );
}
