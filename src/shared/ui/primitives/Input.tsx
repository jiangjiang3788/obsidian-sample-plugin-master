/** @jsxImportSource preact */
import type { JSX } from 'preact';

export type ThinkInputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function ThinkInput({ className, invalid, ...props }: ThinkInputProps) {
  return (
    <input
      {...props}
      className={['think-input', className].filter(Boolean).join(' ')}
      aria-invalid={invalid ? 'true' : props['aria-invalid']}
    />
  );
}

export type ThinkTextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function ThinkTextarea({ className, invalid, ...props }: ThinkTextareaProps) {
  return (
    <textarea
      {...props}
      className={['think-textarea', className].filter(Boolean).join(' ')}
      aria-invalid={invalid ? 'true' : props['aria-invalid']}
    />
  );
}

export type ThinkSelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function ThinkSelect({ className, invalid, ...props }: ThinkSelectProps) {
  return (
    <select
      {...props}
      className={['think-select', className].filter(Boolean).join(' ')}
      aria-invalid={invalid ? 'true' : props['aria-invalid']}
    />
  );
}
