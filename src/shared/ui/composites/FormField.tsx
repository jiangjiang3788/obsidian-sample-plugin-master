/**
 * FormField - compact settings field row.
 * Visual rhythm is owned by Settings CSS; only label width remains dynamic.
 */

import { h, type ComponentChild } from 'preact';

export interface FormFieldProps {
  label: string;
  children: ComponentChild;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
  labelWidth?: string;
}

export function FormField({
  label,
  children,
  required = false,
  help,
  error,
  className = '',
  labelWidth = '112px',
}: FormFieldProps) {
  const classes = [
    'think-form-field',
    error ? 'think-form-field--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ '--think-form-field-label-width': labelWidth } as any}
    >
      <label className="think-form-field__label">
        {label}
        {required && <span className="think-form-field__required">*</span>}
      </label>

      <div className="think-form-field__control">{children}</div>

      {help && <div className="think-form-field__help">{help}</div>}
      {error && <div className="think-form-field__error">{error}</div>}
    </div>
  );
}
