/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

export interface SelectablePillProps {
  selected?: boolean;
  onClick?: () => void;
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function SelectablePill({
  selected = false,
  onClick,
  children,
  className,
  disabled = false,
  title,
}: SelectablePillProps) {
  const classes = [
    'think-quick-input-selectable-pill',
    selected ? 'is-selected' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={classes}
    >
      {children}
    </button>
  );
}

export default SelectablePill;
