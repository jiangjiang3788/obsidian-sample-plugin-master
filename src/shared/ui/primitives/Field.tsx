/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export interface ThinkFieldProps {
  label: ComponentChildren;
  children: ComponentChildren;
  description?: ComponentChildren;
  error?: ComponentChildren;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function ThinkField({ label, children, description, error, required, htmlFor, className }: ThinkFieldProps) {
  return (
    <div className={['think-field', className].filter(Boolean).join(' ')}>
      <label className="think-field__label" htmlFor={htmlFor}>
        <span>{label}</span>
        {required ? <span className="think-field__required" aria-label="必填">必填</span> : null}
      </label>
      <div className="think-field__control">{children}</div>
      {description ? <p className="think-field__description">{description}</p> : null}
      {error ? <p className="think-field__error" role="alert">{error}</p> : null}
    </div>
  );
}
