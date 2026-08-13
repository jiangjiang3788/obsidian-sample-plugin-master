/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkCheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ComponentChildren;
  description?: ComponentChildren;
  compact?: boolean;
}

export function ThinkCheckbox({ label, description, compact = false, className, ...inputProps }: ThinkCheckboxProps) {
  return (
    <label className={['think-selection-control', compact ? 'think-selection-control--compact' : '', className].filter(Boolean).join(' ')}>
      <input {...inputProps} type="checkbox" />
      <span className="think-selection-control__text">
        <span className="think-selection-control__label">{label}</span>
        {description ? <span className="think-selection-control__description">{description}</span> : null}
      </span>
    </label>
  );
}

export interface ThinkToggleProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ComponentChildren;
}

export function ThinkToggle({ label, className, ...inputProps }: ThinkToggleProps) {
  return (
    <label className={['think-toggle-control', className].filter(Boolean).join(' ')}>
      <input {...inputProps} type="checkbox" className="think-toggle-control__input" />
      <span className="think-toggle-control__track" aria-hidden="true"><span className="think-toggle-control__thumb" /></span>
      <span className="think-toggle-control__label">{label}</span>
    </label>
  );
}
