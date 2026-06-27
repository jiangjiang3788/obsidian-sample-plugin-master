/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
  compact?: boolean;
  wrap?: boolean;
}

export function ThinkToolbar({ children, compact = false, wrap = false, className, ...props }: ThinkToolbarProps) {
  return (
    <div
      {...props}
      role={props.role ?? 'toolbar'}
      className={[
        'think-toolbar',
        compact ? 'think-toolbar--compact' : '',
        wrap ? 'think-toolbar--wrap' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export function ThinkToolbarGroup({ children, className }: { children: ComponentChildren; className?: string }) {
  return <div className={['think-toolbar__group', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function ThinkToolbarSpacer() {
  return <span className="think-toolbar__spacer" aria-hidden="true" />;
}
