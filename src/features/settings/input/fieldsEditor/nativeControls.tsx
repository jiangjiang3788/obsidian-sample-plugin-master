// src/features/settings/input/fieldsEditor/nativeControls.tsx
/** @jsxImportSource preact */
import type { JSX } from "preact";
import { useObsidianInputGuard } from './useObsidianInputGuard';

function fieldClassName(className?: string): string {
  return ['think-native-field', className].filter(Boolean).join(' ');
}

export function NativeTextInput({
  label,
  value,
  onInput,
  onBlur,
  onFocus,
  disabled = false,
  placeholder,
  type = "text",
  title,
  style,
  className,
}: {
  label: string;
  value: string | number;
  onInput: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  title?: string;
  style?: JSX.CSSProperties;
  className?: string;
}) {
  const inputGuard = useObsidianInputGuard({
    scope: `FieldsEditor/${label}`,
    controlName: 'control',
    onInput,
    onBlur,
    onFocus,
  });

  return (
    <label className={fieldClassName(className)} style={style} title={title}>
      {label ? <span className="think-native-field__label">{label}</span> : null}
      <input
        className="think-input"
        type={type}
        value={value as any}
        disabled={disabled}
        placeholder={placeholder}
        data-think-diag-control={label}
        {...inputGuard}
      />
    </label>
  );
}

export function NativeTextarea({
  label,
  value,
  onInput,
  onBlur,
  disabled = false,
  placeholder,
  rows = 3,
  style,
  className,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  style?: JSX.CSSProperties;
  className?: string;
}) {
  const textareaGuard = useObsidianInputGuard({
    scope: `FieldsEditor/${label}`,
    controlName: 'textarea',
    onInput,
    onBlur,
  });

  return (
    <label className={fieldClassName(className)} style={style}>
      {label ? <span className="think-native-field__label">{label}</span> : null}
      <textarea
        className="think-textarea"
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        data-think-diag-control={label}
        {...textareaGuard}
      />
    </label>
  );
}
