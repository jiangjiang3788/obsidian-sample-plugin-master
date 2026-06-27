/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export type ThinkButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ThinkControlSize = 'sm' | 'md' | 'lg';

export interface ThinkButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ThinkButtonVariant;
  size?: ThinkControlSize;
  loading?: boolean;
  leadingIcon?: ComponentChildren;
  trailingIcon?: ComponentChildren;
  children?: ComponentChildren;
}

export function ThinkButton({
  variant = 'secondary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  type = 'button',
  ...buttonProps
}: ThinkButtonProps) {
  const classes = [
    'think-button',
    `think-button--${variant}`,
    size !== 'md' ? `think-button--${size}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={Boolean(disabled) || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="think-button__spinner" aria-hidden="true" /> : leadingIcon ? <span className="think-button__icon">{leadingIcon}</span> : null}
      <span>{children}</span>
      {!loading && trailingIcon ? <span className="think-button__icon">{trailingIcon}</span> : null}
    </button>
  );
}
