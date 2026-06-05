// src/features/settings/input/fieldsEditor/nativeControls.tsx
/** @jsxImportSource preact */
import type { JSX } from "preact";
import { useObsidianInputGuard } from './useObsidianInputGuard';

const nativeControlBaseStyle: JSX.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--background-modifier-border)",
  borderRadius: 6,
  background: "var(--background-primary)",
  color: "var(--text-normal)",
  padding: "8px 10px",
  font: "inherit",
  lineHeight: 1.4,
  userSelect: "text",
  WebkitUserSelect: "text",
  pointerEvents: "auto",
};

const nativeLabelStyle: JSX.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

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
}) {
  const inputGuard = useObsidianInputGuard({
    scope: `FieldsEditor/${label}`,
    controlName: 'control',
    onInput,
    onBlur,
    onFocus,
  });

  return (
    <label style={{ display: "block", minWidth: 0, ...style }} title={title}>
      <span style={nativeLabelStyle}>{label}</span>
      <input
        type={type}
        value={value as any}
        disabled={disabled}
        placeholder={placeholder}
        data-think-diag-control={label}
        {...inputGuard}
        style={{
          ...nativeControlBaseStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
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
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  style?: JSX.CSSProperties;
}) {
  const textareaGuard = useObsidianInputGuard({
    scope: `FieldsEditor/${label}`,
    controlName: 'textarea',
    onInput,
    onBlur,
  });

  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span style={nativeLabelStyle}>{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        data-think-diag-control={label}
        {...textareaGuard}
        style={{
          ...nativeControlBaseStyle,
          resize: "vertical",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}
