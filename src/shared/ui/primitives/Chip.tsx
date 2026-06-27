/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkChipProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ComponentChildren;
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

export function ThinkChip({ children, selected = false, onRemove, removeLabel = '移除', className, ...buttonProps }: ThinkChipProps) {
  return (
    <span className={['think-chip', selected ? 'think-chip--selected' : '', className].filter(Boolean).join(' ')}>
      <button
        {...buttonProps}
        type="button"
        className="think-chip__label"
        aria-pressed={selected}
      >
        {children}
      </button>
      {onRemove ? (
        <button type="button" className="think-chip__remove" onClick={onRemove} aria-label={removeLabel} title={removeLabel}>×</button>
      ) : null}
    </span>
  );
}

export function ThinkTag({ children, className }: { children: ComponentChildren; className?: string }) {
  return <span className={['think-tag', className].filter(Boolean).join(' ')}>{children}</span>;
}

export function ThinkBadge({ children, className }: { children: ComponentChildren; className?: string }) {
  return <span className={['think-badge', className].filter(Boolean).join(' ')}>{children}</span>;
}
