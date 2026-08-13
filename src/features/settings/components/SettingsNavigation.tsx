/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export interface SettingsNavigationOption<T extends string = string> {
  value: T;
  label: ComponentChildren;
}

export interface SettingsNavigationProps<T extends string = string> {
  label: string;
  value: T;
  options: readonly SettingsNavigationOption<T>[];
  onChange: (value: T) => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Settings-specific navigation pattern.
 *
 * This is navigation, not a segmented control: the primary level owns the
 * Settings workspace rail and the secondary level owns the active page's
 * local categories. Keeping both in one component prevents Settings tabs from
 * drifting back into unrelated control skins.
 */
export function SettingsNavigation<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = 'secondary',
  className,
}: SettingsNavigationProps<T>) {
  const classes = [
    'think-settings-navigation',
    `think-settings-navigation--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <nav className={classes} aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`think-settings-navigation__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
