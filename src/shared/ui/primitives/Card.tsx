/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  header?: ComponentChildren;
  footer?: ComponentChildren;
  children?: ComponentChildren;
  surface?: 0 | 1 | 2 | 'elevated';
  interactive?: boolean;
  selected?: boolean;
  locked?: boolean;
  dragging?: boolean;
}

export function ThinkCard({
  header,
  footer,
  children,
  surface = 1,
  interactive = false,
  selected = false,
  locked = false,
  dragging = false,
  className,
  ...divProps
}: ThinkCardProps) {
  const surfaceClass = surface === 'elevated' ? 'think-surface--elevated' : `think-surface--${surface}`;
  const classes = [
    'think-card',
    'think-surface',
    surfaceClass,
    interactive ? 'think-card--interactive' : '',
    selected ? 'think-card--selected' : '',
    locked ? 'think-card--locked' : '',
    dragging ? 'think-card--dragging' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      {...divProps}
      className={classes}
      aria-selected={selected || undefined}
      data-locked={locked || undefined}
      data-dragging={dragging || undefined}
    >
      {header ? <div className="think-card__header">{header}</div> : null}
      <div className="think-card__body">{children}</div>
      {footer ? <div className="think-card__footer">{footer}</div> : null}
    </div>
  );
}
