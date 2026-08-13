/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkSegmentedControlOption {
  value: string;
  label: ComponentChildren;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface ThinkSegmentedControlProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string;
  value: string;
  options: readonly ThinkSegmentedControlOption[];
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
}

export function ThinkSegmentedControl({
  label,
  value,
  options,
  onChange,
  size = 'sm',
  className,
  ...groupProps
}: ThinkSegmentedControlProps) {
  const classes = [
    'think-segmented-control',
    size === 'sm' ? 'think-segmented-control--sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div {...groupProps} className={classes} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className="think-segmented-control__item"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
